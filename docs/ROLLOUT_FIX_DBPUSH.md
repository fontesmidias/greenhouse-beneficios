# Runbook — Migração de `prisma db push` para `prisma migrate deploy`

> **Execute este runbook UMA ÚNICA VEZ**, no primeiro deploy após a correção do Dockerfile.
> Após isso, deploys voltam ao fluxo normal (push → CI builda imagem → pull na VPS → restart).

## Contexto do incidente

**Sintoma original:** a cada deploy, todos os dados do banco (incluindo configurações de SMTP, instâncias da Evolution API, usuários, recibos) eram perdidos.

**Causa-raiz identificada:** o `Dockerfile` rodava `npx prisma db push --skip-generate` no startup. `db push` é o comando de **prototipagem** do Prisma — quando há divergência entre `schema.prisma` e o banco que pode causar perda de dados (renomear coluna, mudar tipo, etc.), o Prisma dropa e recria. Em produção, isso é uma bomba-relógio.

**Correção aplicada no código:** Dockerfile agora usa `npx prisma migrate deploy`, que aplica migrations versionadas de forma idempotente e nunca destrutiva.

**Por que precisa de runbook:** o banco em produção foi gerenciado por `db push` desde sempre, então a tabela `_prisma_migrations` (controle interno do Prisma) não existe lá. Se subirmos a imagem nova sem preparação, o `migrate deploy` vai tentar rodar a migration `20260327201407_add_f3_f4_features` e falhar com `relation "Receipt" already exists`, derrubando o container.

**Solução:** marcar a migration como já aplicada usando `prisma migrate resolve --applied`. Isso cria a `_prisma_migrations` e registra a migration como já executada, sem tentar rodar o SQL.

---

## Pré-requisitos

- [ ] Acesso SSH à VPS Contabo
- [ ] Imagem nova já publicada no GHCR (`ghcr.io/fontesmidias/greenhouse-beneficios:latest`) com o Dockerfile corrigido
- [ ] `.env` configurado no diretório do stack (com `DB_PASSWORD` rotacionada — ver passo opcional no fim)
- [ ] **NÃO ter dado `docker compose pull web` ainda** — só puxar depois do passo 3

---

## Procedimento

### Passo 1 — Backup manual (não pular)

```bash
# Identificar o nome real do container do banco (varia por stack name)
docker ps | grep postgres

# Substituir CONTAINER_DB pelo nome correto, ex.: greenhouse_db_1 ou greenhouse-db-1
export CONTAINER_DB=greenhouse_db_1
export CONTAINER_WEB=greenhouse_web_1

# Dump comprimido
docker exec $CONTAINER_DB pg_dump -U greenhouseAdmin greenhouse_db \
  | gzip > ~/greenhouse_pre_migration_$(date +%Y%m%d_%H%M%S).sql.gz

# Conferir tamanho razoável (não pode ser 0)
ls -lh ~/greenhouse_pre_migration_*.sql.gz
```

Se o arquivo está vazio ou com erro, **PARE AQUI** e investigue antes de qualquer outra coisa.

### Passo 2 — Verificar estado atual do schema

Confirmar que as 5 tabelas esperadas existem (sanity check antes do `resolve --applied`):

```bash
docker exec $CONTAINER_DB psql -U greenhouseAdmin -d greenhouse_db -c "\dt"
```

Saída esperada (entre outras): `Receipt`, `User`, `SmtpConfig`, `EvoInstance`, `MagicLinkAudit`. Se faltar alguma, **PARE** — o schema diverge da migration e o `--applied` vai dar problema.

### Passo 3 — Marcar migration como já aplicada

⚠️ Esse passo precisa rodar com a CLI do Prisma. Como o container `web` antigo ainda usa `db push`, não dá pra usar ele. Duas opções:

**Opção A (preferida) — usar imagem nova temporariamente sem subir o serviço:**

```bash
# Pull da imagem nova
docker compose pull web

# Roda um container one-shot só pra executar o resolve, sem trocar o serviço
docker compose run --rm web npx prisma migrate resolve --applied 20260327201407_add_f3_f4_features
```

**Opção B — usar npx no host se você tem Node instalado na VPS:**

```bash
# Na pasta do projeto (precisa do schema.prisma local)
DATABASE_URL="postgresql://greenhouseAdmin:SENHA@localhost:5432/greenhouse_db?schema=public" \
  npx prisma migrate resolve --applied 20260327201407_add_f3_f4_features
```

Saída esperada:

```
Migration 20260327201407_add_f3_f4_features marked as applied.
```

### Passo 4 — Verificar que ficou correto

```bash
docker compose run --rm web npx prisma migrate status
```

Saída esperada:

```
Database schema is up to date!
```

E a tabela de controle deve existir:

```bash
docker exec $CONTAINER_DB psql -U greenhouseAdmin -d greenhouse_db \
  -c "SELECT migration_name, finished_at FROM _prisma_migrations;"
```

Deve aparecer uma linha com `20260327201407_add_f3_f4_features` e `finished_at` preenchido.

### Passo 5 — Subir o serviço com a imagem nova

```bash
docker compose up -d web
docker logs $CONTAINER_WEB -f
```

No log de startup, **deve aparecer**:

```
Applying migration `...`
Already in sync, no schema change or pending migration was found.
```

ou simplesmente:

```
No pending migrations to apply.
```

### Passo 6 — Validação funcional

- [ ] App responde em `https://${DOMAIN}` normalmente
- [ ] Login funciona (sessão NextAuth válida)
- [ ] Configuração de SMTP carrega da UI (tabela `SmtpConfig` intacta)
- [ ] Lista de recibos mostra dados existentes
- [ ] Criar um recibo de teste, conferir que persiste

### Passo 7 — Subir o backup automático

O service `db-backup` foi adicionado ao compose. Ative:

```bash
docker compose up -d db-backup
docker logs greenhouse_db-backup_1
```

No primeiro startup ele já dispara um dump pra validar conectividade. Verifique:

```bash
docker exec greenhouse_db-backup_1 ls -lh /backups/last/
```

Deve ter um `.sql.gz` recente.

---

## Rollback (se algo der errado nos passos 3–5)

Você ainda tem o backup do passo 1. Para voltar ao estado anterior:

```bash
# Parar a app
docker compose stop web

# Restaurar o dump
docker exec -i $CONTAINER_DB psql -U greenhouseAdmin -d postgres -c \
  "DROP DATABASE greenhouse_db; CREATE DATABASE greenhouse_db OWNER \"greenhouseAdmin\";"

gunzip -c ~/greenhouse_pre_migration_*.sql.gz \
  | docker exec -i $CONTAINER_DB psql -U greenhouseAdmin -d greenhouse_db

# Voltar a imagem antiga (substituir pela tag/SHA da imagem anterior)
# Editar docker-compose.yml e trocar :latest pela tag específica antiga
docker compose up -d web
```

---

## Passo opcional (recomendado) — rotacionar credenciais expostas

A senha `MudarSenhaSegura123` e o `NEXTAUTH_SECRET=sua_senha_segura_aqui_123` estavam **hardcoded e commitados no GitHub público**. Devem ser considerados comprometidos.

```bash
# Gerar nova senha forte
NEW_DB_PASSWORD=$(openssl rand -base64 32)
NEW_NEXTAUTH=$(openssl rand -base64 64)
echo "DB_PASSWORD=$NEW_DB_PASSWORD"
echo "NEXTAUTH_SECRET=$NEW_NEXTAUTH"

# Trocar a senha no Postgres
docker exec -i $CONTAINER_DB psql -U greenhouseAdmin -d greenhouse_db \
  -c "ALTER USER \"greenhouseAdmin\" WITH PASSWORD '$NEW_DB_PASSWORD';"

# Atualizar o .env do stack (no Portainer: edita "Environment variables" do stack)
# Cole os dois valores novos.

# Redeploy
docker compose up -d
```

⚠️ **Trocar o `NEXTAUTH_SECRET` invalida todas as sessões ativas** — usuários precisarão logar de novo. É o comportamento desejado dado que o segredo estava exposto.

---

## Pós-rollout

Após esse runbook executado com sucesso:

- [ ] Documentar a data do rollout neste arquivo (linha abaixo)
- [ ] Próximos deploys voltam ao fluxo normal (não precisa repetir nada disso)
- [ ] Workflow de mudanças de schema daqui pra frente: ver [`MIGRATIONS.md`](./MIGRATIONS.md)
- [ ] Restore de backup documentado em [`RESTORE.md`](./RESTORE.md)

**Data do rollout em produção:** _________________
**Executado por:** _________________
