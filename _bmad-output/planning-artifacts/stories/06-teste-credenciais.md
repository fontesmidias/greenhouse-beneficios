# Story 06 — Teste de credenciais SMTP e WhatsApp/Evo

**Status:** ✅ Implementado (commit 065702a, pushado pra main)
**Owner (PM):** John
**Estimativa:** ~2-3h
**Prioridade:** P0 (Bruno marcou como prioridade)

## Contexto

Hoje o admin cadastra/edita credenciais de SMTP e Evolution API (WhatsApp) na tela `/admin/settings` e só descobre se elas funcionam quando dispara um lote real — momento muito tarde pra detectar erro de configuração. Bruno pediu botão de **"Enviar teste"** em cada credencial (existentes e novas) que dispara uma mensagem real e mostra resultado na hora.

## User Story

> **Como** admin do GreenHouse,
> **eu quero** clicar em "Enviar teste" ao lado de cada credencial SMTP/Evo cadastrada,
> **para** validar imediatamente se ela está funcionando antes de disparar um lote.

## Critérios de Aceite

### CA-1 — Endpoint `POST /api/admin/settings/test-smtp`
- Body: `{ smtpId: string, toEmail: string }` OU `{ smtpInline: { host, port, user, password, senderName }, toEmail }` (suporta testar credencial não-salva ainda)
- Requer ADMIN (usar `requireAdmin()`)
- Cria transporter nodemailer ad-hoc com a credencial (não usa o SMTP global de fallback)
- Envia e-mail com assunto: `"Teste de SMTP — GreenHouse DP"` e conteúdo identificando qual SMTP está sendo testado
- Retorna `{ success: true, messageId: string }` em caso de sucesso ou `{ success: false, error: string }` com a mensagem de erro do nodemailer/SMTP

### CA-2 — Endpoint `POST /api/admin/settings/test-evo`
- Body: `{ evoId: string, toPhone: string }` OU `{ evoInline: { name, apiUrl, apiKey }, toPhone }`
- Requer ADMIN
- Chama diretamente `${apiUrl}/message/sendText/${name}` com o `apikey` no header (mesmo padrão de `lib/whatsapp.ts`)
- Conteúdo: `"Teste de Evolution API — GreenHouse DP. Se você recebeu essa mensagem, a credencial está funcionando."`
- Retorna `{ success, error?, response? }`
- Sanitiza `toPhone` para só dígitos

### CA-3 — UI em `/admin/settings`
- Em cada card de SMTP existente: botão **"Enviar teste"** (azul/sky)
- Em cada card de Evo existente: botão **"Enviar teste"**
- No formulário de adicionar novo SMTP/Evo: botão **"Testar antes de salvar"** que usa as credenciais que estão sendo digitadas no form, sem precisar salvar
- Ao clicar, abre modal pequeno pedindo:
  - Para SMTP: e-mail destinatário (default = e-mail do admin logado)
  - Para Evo: número WhatsApp destinatário (placeholder com formato esperado: 5561999999999)
- Botão "Enviar" → loading → mostra resultado (sucesso verde ou erro vermelho com a mensagem)

### CA-4 — Logs estruturados
- Logger registra: tipo (smtp/evo), id ou label, destinatário, sucesso/falha, mensagem de erro (se houver)
- Não logar senha SMTP nem apiKey

### CA-5 — Segurança
- Endpoints exigem `requireAdmin()`
- Backend NUNCA retorna a senha/apiKey nas respostas, mesmo em erro

## Decisões de produto (autônomas)

- Botão "Testar antes de salvar" adicional ao "Enviar teste" cobre o caso "to digitando, será que vai funcionar?" sem forçar o admin a salvar lixo no banco
- Default do destinatário no SMTP = e-mail do admin logado, pra reduzir um clique (situação mais comum)
- Modal pequeno em vez de inline: dá foco ao teste e não polui o card

## Fora de escopo

- Validação periódica automática (cron testando todo dia) — Story 07 sugerida (ver brainstorm)
- Histórico de testes anteriores — não precisa, é um teste pontual

## Arquivos a tocar

- **Novos:**
  - `src/app/api/admin/settings/test-smtp/route.ts`
  - `src/app/api/admin/settings/test-evo/route.ts`
- **Modificados:**
  - `src/app/admin/settings/page.tsx` (adicionar botões + modal)

## Definition of Done

- [ ] Botão "Enviar teste" funcional em cada card SMTP/Evo existente
- [ ] Botão "Testar antes de salvar" no formulário de novo SMTP/Evo
- [ ] Resultado mostrado imediatamente (sucesso ou erro com mensagem útil)
- [ ] Endpoints exigem ADMIN, retornam 403 caso contrário
- [ ] Senhas/keys nunca aparecem em respostas ou logs
- [ ] Build de produção passa
- [ ] Pushado pra main
