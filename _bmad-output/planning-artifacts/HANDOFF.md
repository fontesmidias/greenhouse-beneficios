# Handoff — Greenhouse Benefícios (continuação em nova janela)

**Última atualização:** 2026-04-28 (sessão 1)
**Working dir:** `c:\Users\cery0\projetos\greenhouse-beneficios`
**Repo:** https://github.com/fontesmidias/greenhouse-beneficios
**Prod:** https://beneficios.unibot.com.br (VPS Contabo)

## Como retomar nesta nova janela

1. Mande pro Claude:
   > "Lê `_bmad-output/planning-artifacts/HANDOFF.md` e me dá um resumo do estado atual antes de continuarmos."
2. Quando você quiser retomar a persona PM (John), mande:
   > "Quero falar com o John (PM)" ou "/bmad-agent-pm"
3. Pra invocar dev (Amelia): "Quero falar com a Amelia" ou "/bmad-agent-dev"
4. Pra invocar arquiteto (Winston): "/bmad-agent-architect"

Auto mode + push automático estão autorizados pra próxima sessão (continuidade).

## Stack do projeto (rápido)

- Next.js 16 + Prisma + Postgres 15
- Deploy: Docker Compose + Traefik + GHCR
- Hospedagem: VPS Contabo
- Admin: `cery00@gmail.com` (Bruno)
- Auth: NextAuth + bcrypt + JWT

## O que foi feito nesta sessão (em ordem)

### Infra (Stories de fundação)
- ✅ **Incidente do `prisma db push`** diagnosticado e corrigido (Dockerfile agora usa `migrate deploy`)
- ✅ **Backup automático local** via service `db-backup` no compose (rotação 14d/8w/12m)
- ✅ **Hardening:** todas as senhas em `.env`, `requireAdmin()` em endpoints `/api/admin/*`
- ✅ **Story 03** Admin cria usuários direto pelo painel (`/admin/users`) com link de definição de senha sem expiração
- ✅ **Story 04** Validação inteligente de planilha (normalizers tolerantes em `src/lib/spreadsheet.ts`) + tooltips contextuais
- ✅ **Story 05** Hardening de endpoints admin
- ✅ **Story 06** Botão "Enviar teste" em credenciais SMTP/Evo
- ✅ **Story 07** Filtros do dashboard (status + competência)
- ✅ **Story 08** Reenviar recibo (e-mail/WhatsApp/ambos) sem regenerar token
- ✅ **Story 09** Recuperador de PDFs órfãos (`/admin/orphans`)
  - Lista com paginação 50/página
  - Download individual com nome amigável
  - ZIP organizado em pastas ASSINADOS/SEM_ASSINATURA
  - Apagar
  - Enviar por e-mail (anexo)
  - Botão Debug + Inspect pra calibrar parser

### Pendente do Bruno (deploy + smoke test)

⚠️ **MAIS CRÍTICO:** o último commit (`3b9c481`) ainda **precisa subir em produção**. Sequência:
1. Confirmar GHA build verde em https://github.com/fontesmidias/greenhouse-beneficios/actions (commits após `3b9c481`)
2. Portainer → **Update the stack** com **"Re-pull image and redeploy"** marcado
3. `/admin/orphans` → **♻ Limpar cache** → **🔍 Identificar arquivos (311)**
4. Confirmar que aparece nome/CPF/competência em cada linha (não mais UUID)

## Backlog priorizado pendente

Documento completo: `_bmad-output/planning-artifacts/BACKLOG_CONFIABILIDADE.md`

### Próximos imediatos (Sprint A restante)
1. **Backup offsite Backblaze B2** — service `db-backup-offsite` no compose já está pronto, falta Bruno criar conta B2 + colar credenciais no `.env` do Portainer (instruções em `docs/OFFSITE_BACKUP.md`)
2. **Drill de restore** — testar que o backup local realmente restaura (~30 min, instruções em `docs/RESTORE.md`)

### Sprint B (próximas)
- **Validação periódica de credenciais** (cron diário usando os endpoints da Story 06)
- **Healthcheck endpoint + UptimeRobot** (alerta se cair)
- **Sentry** (observabilidade de erros em prod)
- **Alerta proativo de SMTP/Evo caindo** (3 falhas seguidas → desativa + e-mail)

### Tier 3 (longo prazo)
- Audit trail (quem aprovou/mudou o quê)
- Rate limiting endpoints públicos
- Modo manutenção
- Verificação de espaço em disco
- Alerta de quota SMTP/WhatsApp
- Snapshot diário do schema
- Backup automático antes de cada migration
- Review de security headers / CSRF

## Stories abertas (concluídas mas com follow-up possível)

- **04b — Preview de upload** (stretch da 04, parsing já resolveu 90% da dor; só fazer se demanda surgir)
- **09 etapa 3** — Botão "Reimportar pro sistema" pra ressuscitar registros órfãos no DB (condicional: depende se Bruno quer só baixar e arquivar, ou repovoar o front)

## Decisões de produto importantes (não esquecer)

1. **SMTP/Evo ficam no banco**, não em `.env` — preferência explícita do Bruno
2. **Reset de senha no fluxo "admin cria usuário" não expira** (`resetTokenExpiry = null`)
3. **Senha do banco e NEXTAUTH_SECRET** estão **commitadas em texto plano** no histórico do GitHub (commits antes do hardening). **Considere comprometidas — rotacionar quando puder.** Procedimento documentado em `docs/ROLLOUT_FIX_DBPUSH.md`.
4. **PDFs órfãos** vieram do incidente do `db push` que zerou a tabela Receipt. Decisão: NÃO recuperar do snapshot Contabo. Os 311 arquivos no volume são "arquivamento histórico" — Bruno baixa, organiza fora do sistema, e **opcionalmente** reimporta no futuro (Story 09 etapa 3).

## Memórias persistentes salvas

- `project_greenhouse_stack` — stack técnica e infra
- `feedback_smtp_no_db` — preferência do Bruno por configs no DB

## Comandos úteis pra próxima sessão

```bash
# Estado dos commits
cd c:\Users\cery0\projetos\greenhouse-beneficios
git log --oneline -20

# Último commit pushado da sessão atual
# 3b9c481 fix(orphans): downgrade pdf-parse v2 -> v1.1.1 (resolve DOMMatrix error)

# Rodar testes do parser de PDF
npx jest src/lib/pdfExtractFields.test.ts

# Rodar todos os testes
npm test

# Build de produção
npm run build
```

## Estado do código (commits da sessão)

```
3b9c481 fix(orphans): downgrade pdf-parse v2 -> v1.1.1 (resolve DOMMatrix error)
bb2e5de fix(orphans): regex calibrado com PDFs reais (10/10 testes verdes)
396c827 feat(orphans): regex tolerantes + inspector de PDF + limpar cache
40cb06e fix(orphans): dynamic import de pdf-parse + runtime nodejs explicito
afd131d fix(orphans): paginação real (50 por pagina) + identificação em chunks
ed14a43 fix(orphans): parse PDF lazy (sob demanda) para nao estourar timeout
a2f5438 feat(orphans): endpoint de diagnostico + enviar PDF por e-mail
51d1fc8 docs(stories): registra Story 09 (orfaos) como entregue
92a8c0b feat(orphans): parse de metadados do PDF (nome, CPF, competencia)
4966673 feat(admin): tela de arquivos orfaos no volume + ZIP organizado
94534df docs(stories): registra Stories 07 e 08 como entregues
736af38 feat(receipts): reenviar recibo por e-mail e/ou WhatsApp sem regenerar token
02242f9 feat(dashboard): filtros por status e competencia
db3fb0a docs(backlog): backlog de confiabilidade priorizado em 3 tiers
065702a feat(admin): botao Enviar Teste em credenciais SMTP e Evolution API
9026485 feat(security): exige role ADMIN em todos os endpoints /api/admin/*
059a488 feat(ui): tooltips contextuais nos campos onde a galera mais penava
0171783 fix(process): usa normalizers tolerantes para datas e valores
999ca89 feat(spreadsheet): normalizers tolerantes para datas e valores monetarios
dce53f6 feat(admin): tela de gestao de usuarios com filtros, criacao e acoes
408c552 feat(admin): endpoints para criar, listar, recusar e reenviar link de usuarios
3691d7f feat(auth): aceita reset token sem expiracao (resetTokenExpiry NULL)
683ead8 fix(deploy): troca db push por migrate deploy + backup automatico
```

## Frase pronta pra você abrir a próxima janela

> "Estamos retomando o projeto greenhouse-beneficios. Lê `_bmad-output/planning-artifacts/HANDOFF.md` no working dir, me confirma que entendeu o contexto, depois me ajuda a [validar a Story 09 em produção / atacar próximo item do backlog / outro]."
