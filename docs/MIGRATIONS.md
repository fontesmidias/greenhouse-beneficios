# Migrations do Banco de Dados

Este projeto usa **Prisma Migrate** para versionar mudanças de schema. Todo deploy aplica migrations pendentes via `prisma migrate deploy` no startup do container `web`.

## Por que NÃO usar `prisma db push`

`db push` é a ferramenta de **prototipagem** do Prisma. Ela força o schema do banco a bater com o `schema.prisma`, e em mudanças incompatíveis (renomear coluna, mudar tipo, dropar tabela) ela **dropa dados sem aviso**.

Já tivemos um incidente onde isso apagou o banco em produção. **Nunca volte a usar `db push` em produção** ou em qualquer ambiente com dados reais. O Dockerfile foi corrigido para usar `migrate deploy`. Detalhes do incidente: [`ROLLOUT_FIX_DBPUSH.md`](./ROLLOUT_FIX_DBPUSH.md).

## Workflow para mudar o schema

### 1. Local: editar e gerar a migration

```bash
# 1. Edite prisma/schema.prisma com a mudança desejada
# 2. Gere a migration (precisa de DB local rodando)
npx prisma migrate dev --name <descricao_curta_em_snake_case>
```

Isso cria `prisma/migrations/<timestamp>_<descricao>/migration.sql` e aplica no seu DB local automaticamente.

**Convenções de nome:** use snake_case curto e descritivo. Exemplos bons:
- `add_user_phone`
- `index_receipts_by_competencia`
- `rename_smtpconfig_user_to_username`

### 2. Local: revisar o `migration.sql`

Sempre abra o `.sql` gerado e leia. O Prisma é bom, mas certas mudanças precisam de cuidado:

- **Renomear coluna**: o Prisma gera DROP + CREATE (perde dados). Edite manualmente para `ALTER TABLE ... RENAME COLUMN`.
- **Mudar tipo de coluna**: pode precisar de `USING` na conversão.
- **Adicionar coluna NOT NULL sem default em tabela populada**: vai falhar. Adicione default temporário ou faça em duas migrations (add nullable → backfill → set not null).

### 3. Commit

```bash
git add prisma/schema.prisma prisma/migrations/<timestamp>_<descricao>/
git commit -m "feat(db): <descrição>"
```

### 4. Deploy

Quando a imagem nova for deployada na VPS, o startup do container `web` roda `npx prisma migrate deploy` automaticamente e aplica a migration pendente. Sem ação manual.

## Comandos úteis

```bash
# Ver status das migrations no DB conectado
npx prisma migrate status

# Aplicar migrations pendentes (o que o container faz no startup)
npx prisma migrate deploy

# Marcar uma migration como já aplicada SEM rodá-la
# (usado uma única vez quando regularizamos prod — ver ROLLOUT_FIX_DBPUSH.md)
npx prisma migrate resolve --applied <nome_da_migration>

# Marcar uma migration como rolled-back (caso falhou no meio)
npx prisma migrate resolve --rolled-back <nome_da_migration>

# Resetar DB local (DESTRÓI dados — só em dev)
npx prisma migrate reset
```

## Regras de ouro

1. **Migrations são imutáveis depois de commitadas.** Se uma migration já rodou em algum ambiente, não edite o `.sql`. Crie uma migration nova.
2. **Sempre teste localmente** com dados parecidos com produção antes de subir.
3. **Backup antes de toda migration potencialmente destrutiva.** `pg_dump` está rodando todo dia automaticamente (`db-backup` service), mas se a migration vai mexer em coisa séria, faça um dump manual primeiro: `docker exec greenhouse_db_1 pg_dump -U greenhouseAdmin greenhouse_db | gzip > pre_migration.sql.gz`.
4. **Nunca edite o DB de produção direto** (psql à mão). Toda mudança estrutural passa por migration versionada no git.
