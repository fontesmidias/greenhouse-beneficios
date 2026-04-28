# Backlog de Confiabilidade — Greenhouse Benefícios

Lista de melhorias que aumentam a robustez do sistema, agrupadas por categoria e ordenadas dentro de cada grupo por **maior retorno por menor esforço**.

> Pergunta de filtro: *"se isso quebrar de madrugada, quanto demora pra eu saber e quanto custa pra resolver?"* Quanto mais alta a resposta, mais alta a prioridade.

---

## 🥇 Tier 1 — Já planejados, aguardando execução

| Item | Esforço | Status |
|---|---|---|
| Backup offsite Backblaze B2 (sync horário) | ~1h dev + criar conta B2 | Doc pronto: [`docs/OFFSITE_BACKUP.md`](../../docs/OFFSITE_BACKUP.md) |
| Drill de restore (testar que o backup funciona) | ~30min | Pendente — combinar janela e fazer |
| Filtros do dashboard por status + competência | ~2h | Próximo na fila |
| Reenviar recibo (e-mail OU WhatsApp) sem regenerar | ~2h | Próximo na fila |

---

## 🥈 Tier 2 — Confiabilidade operacional (médio esforço, alto valor)

### Validação periódica de credenciais
**Problema:** SMTP/Evo podem expirar, ter token revogado, IP bloqueado. Hoje só descobrimos quando um lote falha.
**Proposta:** cron diário (00:30 ex.) que dispara `test-smtp`/`test-evo` em cada credencial ATIVA contra um destinatário interno (e-mail do admin / número de teste). Se falhar 2 dias seguidos, marca como `DESCONECTADO` automaticamente e dispara alerta.
**Esforço:** ~3h. Reusa endpoints da Story 06.

### Fila de envio persistente
**Problema:** Se o servidor cair durante um disparo de 100 mensagens, perde o progresso e o operador não sabe quais foram entregues. Hoje a fila vive em memória/cache.
**Proposta:** persistir cada item da fila no DB com estado (`PENDENTE`, `ENVIANDO`, `OK`, `FALHA`, `RETRY_AGENDADO`). Worker resgata pendentes no startup.
**Esforço:** ~6-8h. Mexe em `lib/dispatchQueue.ts` e adiciona modelo Prisma novo.

### Retry automático com backoff
**Problema:** Falha transitória (network glitch, rate limit momentâneo) hoje precisa ser retomada manualmente.
**Proposta:** após falha, agendar retry em 30s → 5min → 30min (3 tentativas). Só marca `FALHA` definitiva depois.
**Esforço:** ~3h. Depende da fila persistente acima.

### Healthcheck endpoint + monitor externo
**Problema:** Se a app cai de madrugada, ninguém sabe.
**Proposta:** endpoint `GET /api/health` que checa DB, SMTP fallback e disco. Cadastrar UptimeRobot (grátis) apontando pra esse endpoint, alerta por e-mail e WhatsApp se 2 checks consecutivos falharem.
**Esforço:** ~1h dev + 15min config UptimeRobot.

### Sentry (ou similar) para erros em produção
**Problema:** Stack trace de erro fica só no log do container — quem não checa, não vê. Erros silenciosos passam despercebidos.
**Proposta:** Sentry SDK no `app/layout.tsx` + `next.config.ts`. Tier free aguenta volume típico do projeto.
**Esforço:** ~2h.

### Alerta proativo de SMTP/Evo com taxa de erro alta
**Problema:** Token expirou no meio do dia → todos os envios começam a falhar → ninguém percebe até alguém ligar.
**Proposta:** se ≥3 envios consecutivos da mesma credencial falham, marcar `DESCONECTADO` automaticamente E enviar e-mail pro admin. Re-ativa quando teste manual passa.
**Esforço:** ~2h. Independe da Story 06 mas combina bem.

---

## 🥉 Tier 3 — Hardening de longo prazo

### Audit trail de mudanças críticas
**Problema:** Não dá pra saber quem deletou um SmtpConfig, quem mudou role de usuário, quem aprovou quem.
**Proposta:** modelo Prisma `AuditLog` (timestamp, userId, action, entity, entityId, before, after). Middleware ou helpers em endpoints sensíveis. Tela `/admin/audit` pra consulta.
**Esforço:** ~6h.

### Rate limiting nos endpoints públicos
**Problema:** Endpoints `/sign`, `/api/sign`, magic link podem ser abusados por bot.
**Proposta:** middleware com bucket por IP (ex.: `next-rate-limit`). 10 req/min em endpoints sensíveis.
**Esforço:** ~2h.

### Modo "manutenção"
**Problema:** Quando preciso fazer manutenção pesada, não tenho como bloquear novos uploads/envios sem derrubar o site.
**Proposta:** flag em `SmtpConfig`-like ou env var. Quando ativa, página principal mostra banner "manutenção" e endpoints de gravação retornam 503.
**Esforço:** ~3h.

### Verificação de espaço em disco
**Problema:** PDFs acumulam em `uploads/`. Auto-cleanup existe (>30 dias) mas pode falhar silenciosamente. Disco cheio = sistema parado.
**Proposta:** healthcheck endpoint reporta uso de disco; alertar se > 80%.
**Esforço:** ~30min.

### Alerta de quota SMTP / WhatsApp
**Problema:** Office365 tem limite de envios/dia. Estourar = bloqueio temporário.
**Proposta:** contador diário no DB; alerta quando atinge 80% da quota conhecida da credencial.
**Esforço:** ~3h.

### Snapshot diário do schema
**Problema:** Se o `migrate deploy` rodar uma migration inesperada, hoje só sabemos depois. Nunca de novo, mas paranoia justificada após o incidente do `db push`.
**Proposta:** cron diário que faz `prisma migrate status` e arquiva. Alerta se uma migration nova foi aplicada sem PR.
**Esforço:** ~2h.

### Backup automático ANTES de toda migration
**Proposta:** wrapper no startup do container: se `migrate status` indica migration pendente, faz `pg_dump` rápido antes de rodar `migrate deploy`.
**Esforço:** ~2h. Bons retornos contra erro humano.

### CSRF protection / security headers review
**Problema:** Não foi revisado especificamente. NextAuth dá uma base mas vale auditar.
**Proposta:** rodar `securityheaders.com` contra prod, adicionar middleware com headers (CSP, HSTS, X-Frame-Options) onde faltar.
**Esforço:** ~3h.

---

## 📋 Recomendação de sequência

Sugestão pragmática pros próximos sprints:

**Sprint A (hoje + amanhã, alta urgência):**
1. ✅ Story 06 — teste de credenciais (FEITO)
2. Backup offsite B2 + drill de restore
3. Filtros do dashboard
4. Reenviar recibo

**Sprint B (próxima semana):**
5. Validação periódica de credenciais (Tier 2) — usa Story 06
6. Healthcheck + UptimeRobot
7. Sentry

**Sprint C (quando der):**
8. Fila persistente + retry com backoff (Tier 2)
9. Audit trail (Tier 3)
10. Demais itens conforme dor surgir

---

**Como esse documento deve ser usado:**
- John (PM) abre antes de cada sprint, recomenda sequência ao Bruno
- Bruno aprova e John convoca o agente certo (Amelia/Winston)
- Item finalizado vira commit + atualização do status do item aqui
