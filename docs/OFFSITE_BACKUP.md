# Backup Offsite — Backblaze B2

O backup local (`db-backup` service) não te protege se o disco da VPS Contabo morre. Esta camada extra sincroniza os dumps para o **Backblaze B2** (storage S3-compatible barato — ~US$0,005/GB/mês).

> **Custo estimado** para o volume típico desse projeto (alguns MB/dia, 14 diários + 8 semanais + 12 mensais comprimidos): **menos de US$0,20/mês**.

## Setup inicial (faz uma vez)

### 1. Criar conta Backblaze

1. Acesse https://www.backblaze.com/sign-up/cloud-storage e crie a conta
2. Confirme o e-mail

### 2. Criar bucket

1. No painel B2: **Buckets → Create a Bucket**
2. Nome: `greenhouse-backups` (ou outro — só ajuste no `.env`)
3. **Files in Bucket are: Private** (importante)
4. **Default Encryption: Enable** (criptografia em repouso)
5. **Object Lock: Disable** (a não ser que queira políticas de retenção imutáveis — overkill agora)
6. Salvar

### 3. Criar Application Key restrita a esse bucket

1. **App Keys → Add a New Application Key**
2. **Name of Key:** `greenhouse-vps-backup`
3. **Allow access to Bucket(s):** selecione `greenhouse-backups`
4. **Type of Access:** `Read and Write`
5. **Allow List All Bucket Names:** desativado
6. Criar — anote os valores que aparecem **uma única vez**:
   - `keyID` → vira `B2_ACCOUNT_ID` no `.env`
   - `applicationKey` → vira `B2_APPLICATION_KEY` no `.env`

⚠️ Se perder o `applicationKey`, precisa criar outra key. Não tem como recuperar.

### 4. Configurar `.env` na VPS

No Portainer, edite o stack do greenhouse e nas Environment variables:

```env
B2_ACCOUNT_ID=<keyID que apareceu>
B2_APPLICATION_KEY=<applicationKey que apareceu>
B2_BUCKET=greenhouse-backups
```

### 5. Subir o service

```bash
docker compose up -d db-backup-offsite
docker logs greenhouse_db-backup-offsite_1 -f
```

Você deve ver:

```
Sync de backups DB → B2 ativo. Intervalo: 1h.
[2026-04-28T...] Iniciando sync para b2:greenhouse-backups/greenhouse-pg-backups
...
[2026-04-28T...] Sync concluído. Dormindo 1h.
```

### 6. Verificar no painel B2

Após alguns minutos, no painel B2 → bucket `greenhouse-backups` → você deve ver a estrutura `greenhouse-pg-backups/daily/`, `weekly/`, `monthly/`, `last/` espelhando o volume local.

## Restore de um dump do B2

Caso a VPS toda esteja perdida (não só o DB):

```bash
# Numa nova VPS, depois de subir o stack:

# 1. Instalar rclone se não tiver
curl https://rclone.org/install.sh | sudo bash

# 2. Configurar rclone com as mesmas credenciais B2
rclone config
# Escolher: n (new remote)
# Nome: b2
# Storage: 6 (Backblaze B2)
# account: <B2_ACCOUNT_ID>
# key: <B2_APPLICATION_KEY>
# Resto: defaults

# 3. Listar backups disponíveis
rclone ls b2:greenhouse-backups/greenhouse-pg-backups/daily/

# 4. Baixar o backup desejado
rclone copy b2:greenhouse-backups/greenhouse-pg-backups/last/greenhouse_db-latest.sql.gz ./

# 5. Seguir docs/RESTORE.md a partir do passo 3
```

## Monitoramento

Periodicamente (mensal sugerido):

```bash
# Verificar último sync bem-sucedido
docker logs greenhouse_db-backup-offsite_1 --tail 20

# Verificar tamanho remoto vs local (devem bater)
rclone size b2:greenhouse-backups/greenhouse-pg-backups
sudo du -sh /var/lib/docker/volumes/greenhouse_pg_backups/_data/
```

Se houver discrepância grande, investigar — pode ser permissão B2, key revogada, bucket cheio, etc.

## Desabilitar temporariamente

Se precisar pausar:

```bash
docker compose stop db-backup-offsite
```

Para remover de vez, comente o service no `docker-compose.yml` e redeploy.
