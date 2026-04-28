# Restore de Backup do PostgreSQL

Backups automáticos do banco rodam todo dia às 00:00 via service `db-backup` no `docker-compose.yml`.

## Onde os backups ficam

Volume Docker `greenhouse_pg_backups`, montado em `/backups` dentro do container e fisicamente em:

```
/var/lib/docker/volumes/greenhouse_pg_backups/_data/
├── daily/    # últimos 14 backups diários
├── weekly/   # últimos 8 backups semanais
├── monthly/  # últimos 12 backups mensais
└── last/     # link simbólico pro mais recente
```

Cada arquivo: `greenhouse_db-YYYYMMDD-HHMMSS.sql.gz` (dump comprimido).

## Listar backups disponíveis

```bash
# Por SSH na VPS
docker exec greenhouse_db-backup_1 ls -lh /backups/daily/
docker exec greenhouse_db-backup_1 ls -lh /backups/last/
```

Ou direto no host:

```bash
sudo ls -lh /var/lib/docker/volumes/greenhouse_pg_backups/_data/daily/
```

## Restore — procedimento padrão

⚠️ **Restore SOBRESCREVE o banco atual.** Se você precisa preservar dados pós-backup, faça um dump do estado atual antes.

### 1. Dump de segurança do estado atual (sempre)

```bash
docker exec greenhouse_db_1 pg_dump -U greenhouseAdmin greenhouse_db \
  | gzip > ~/pre_restore_$(date +%Y%m%d_%H%M%S).sql.gz
```

### 2. Parar o web (evitar gravações durante o restore)

```bash
docker compose stop web
```

### 3. Dropar e recriar o database

```bash
docker exec -i greenhouse_db_1 psql -U greenhouseAdmin -d postgres <<'SQL'
DROP DATABASE IF EXISTS greenhouse_db;
CREATE DATABASE greenhouse_db OWNER "greenhouseAdmin";
SQL
```

### 4. Restaurar do backup escolhido

Substitua `<ARQUIVO>` pelo backup desejado.

```bash
# Via container (se o arquivo está dentro do volume db-backup)
docker exec greenhouse_db-backup_1 cat /backups/daily/<ARQUIVO> \
  | gunzip \
  | docker exec -i greenhouse_db_1 psql -U greenhouseAdmin -d greenhouse_db

# Ou direto do host
sudo cat /var/lib/docker/volumes/greenhouse_pg_backups/_data/daily/<ARQUIVO> \
  | gunzip \
  | docker exec -i greenhouse_db_1 psql -U greenhouseAdmin -d greenhouse_db
```

### 5. Subir o web de volta

```bash
docker compose up -d web
docker logs greenhouse_web_1 -f
```

O log de startup deve mostrar `No pending migrations to apply.` (porque o backup já tem a tabela `_prisma_migrations` populada).

### 6. Sanity check

```bash
docker exec greenhouse_db_1 psql -U greenhouseAdmin -d greenhouse_db <<'SQL'
SELECT COUNT(*) FROM "User";
SELECT COUNT(*) FROM "Receipt";
SELECT COUNT(*) FROM "SmtpConfig";
SELECT MAX("createdAt") FROM "Receipt";
SQL
```

## Restore parcial (uma única tabela)

Caso precise recuperar só uma tabela (ex.: `SmtpConfig` que sumiu mas o resto está bom):

```bash
# 1. Extrai só a tabela do backup pra um SQL local
docker exec greenhouse_db-backup_1 cat /backups/daily/<ARQUIVO> \
  | gunzip \
  | grep -A 9999 'TABLE.*SmtpConfig' \
  | grep -B 9999 'TABLE.*proxima_tabela' \
  > smtp_only.sql

# 2. Aplica no DB
docker exec -i greenhouse_db_1 psql -U greenhouseAdmin -d greenhouse_db < smtp_only.sql
```

Cuidado com FKs e índices — ler o SQL antes de aplicar.

## Drill de restore (recomendado)

Backup que nunca foi testado **não é backup**. A cada 3 meses:

1. Suba um Postgres descartável local (`docker run --rm -d --name pg-test -e POSTGRES_PASSWORD=test postgres:15-alpine`)
2. Baixe um backup recente da VPS
3. Restaure nesse Postgres descartável
4. Verifique que as queries do passo 6 retornam números coerentes
5. Mate o container

Se algum passo falhar, **algo está errado com o pipeline de backup** — investigar antes que precise valer.
