# Story 03 — Admin cria usuários direto pelo painel

**Status:** ✅ Implementado (Amelia, commits 3691d7f, 408c552, dce53f6) — pendente: push + smoke test em prod
**Owner (PM):** John
**Estimativa:** ~4-6h
**Prioridade:** P0 (alta)

## Contexto

Hoje o cadastro só acontece pelo fluxo de auto-registro (`/register`) → e-mail pro admin → admin clica no link de aprovação. Funciona, mas o admin precisa de um caminho direto: **criar usuário pré-aprovado a partir do painel administrativo**, sem o usuário precisar se autocadastrar primeiro.

## User Story

> **Como** administrador (`role=ADMIN`),
> **eu quero** criar novos usuários diretamente pelo painel `/admin`,
> **para que** eu possa onboardar pessoas rapidamente sem depender do fluxo de auto-cadastro + aprovação por e-mail.

## Critérios de Aceite

### CA-1 — Endpoint POST `/api/admin/users` (novo)
- Aceita: `{ nome, email, cargo? , role? }` (role default `USER`).
- Validação:
  - Apenas sessão com `role=ADMIN` pode chamar (retorna 403 caso contrário).
  - Email é normalizado (lowercase + trim).
  - Email duplicado retorna 409 com mensagem clara.
- Cria User com:
  - `status = "ATIVO"` (já aprovado, não passa pelo fluxo de aprovação)
  - `senha`: hash bcrypt de uma senha aleatória descartável (32 chars). O usuário **nunca vai usar essa senha** — vai trocar via reset.
  - `resetToken`: `crypto.randomBytes(32).toString('hex')`
  - `resetTokenExpiry`: **`null`** (não expira — ver CA-3)
- Dispara e-mail de "definição de senha" pro novo usuário (template separado de `forgot`, ver CA-2).
- Retorna `{ success: true, user: { id, nome, email, role, status } }`.

### CA-2 — E-mail de boas-vindas + definição de senha
- Disparado via `sendEmailMessage()` (já existe em `lib/email.ts`).
- Assunto: `"Bem-vindo ao GreenHouse DP — defina sua senha"`
- Conteúdo HTML (mesma identidade visual do email de aprovação atual — verde `#10B981`):
  - Saudação personalizada com nome
  - Texto: "Sua conta foi criada pelo administrador da GreenHouse. Para começar a usar, defina sua senha clicando no botão abaixo."
  - CTA: link `${NEXT_PUBLIC_BASE_URL}/reset?token=${resetToken}`
  - Nota em rodapé pequena: "Este link permanece válido até você definir sua senha pela primeira vez."
- Falha de envio NÃO deve quebrar a criação do usuário — log do erro e retorno success ainda assim (admin pode reenviar).

### CA-3 — Reset sem expiração para esse fluxo
- Modificar `POST /api/auth/reset` (ou equivalente) para aceitar token cujo `resetTokenExpiry IS NULL` como **válido sem checar prazo**.
- Lógica:
  - Se `resetTokenExpiry === null` → válido independente do tempo.
  - Se `resetTokenExpiry` é uma data → comparar com `Date.now()` como hoje (mantém comportamento do `forgot password` normal).
- Após uso bem-sucedido, **limpar** `resetToken` e `resetTokenExpiry` (já deve ser o comportamento atual — confirmar).

### CA-4 — UI no painel admin
- Adicionar nova aba/seção em `/admin/settings` (ou nova rota `/admin/users` se preferir separar): **"Gerenciar Usuários"**.
- Listagem de usuários existentes (tabela): Nome, Email, Cargo, Role, Status, Ações.
  - Filtros básicos por status (PENDENTE/ATIVO/RECUSADO) e busca por nome/email.
  - Ação "Aprovar" (para PENDENTE) — chama o endpoint existente `/api/admin/approve`.
  - Ação "Recusar" (para PENDENTE) — atualiza status para RECUSADO (criar endpoint se não existir).
  - Ação "Reenviar link de senha" (para qualquer ATIVO) — gera novo `resetToken` (sem expiry) e dispara e-mail.
- Botão destacado **"+ Criar Novo Usuário"** abre modal/form:
  - Campos: Nome (obrigatório), Email (obrigatório), Cargo (opcional), Role (select: USER / ADMIN, default USER).
  - Submit chama `POST /api/admin/users`.
  - Em caso de sucesso: toast "Usuário criado. Link de definição de senha enviado para `<email>`." + atualiza tabela.
  - Em caso de erro 409 (email duplicado): mensagem inline no campo email.
- Toda a UI segue o estilo visual do painel atual (Tailwind, dark theme, verde `#10B981` como primary).

### CA-5 — Segurança / proteção
- Endpoints `/api/admin/users*` checam sessão NextAuth e role ADMIN no servidor (não confiar só na UI).
- Logs estruturados: criar user, falha de envio de email, reenvio de link.

## Decisões de produto (já validadas com Bruno)

- **Reset não expira** quando vem do fluxo "admin cria usuário" — Bruno explicitamente pediu. Justificativa: usuário pode demorar dias pra abrir o e-mail, não queremos atrito.
- **Manter o fluxo atual** de auto-cadastro + aprovação intacto. Esse novo é caminho **paralelo**, não substituto.
- **Senha temporária**: NÃO mostrar senha em lugar nenhum. Usuário define via link, e pronto.

## Fora de escopo (não fazer agora)

- Edição de usuário (mudar role, mudar email, mudar nome). Stub de futura story.
- Deleção de usuário (apenas marcar como RECUSADO se necessário).
- Bulk create de usuários por CSV.
- 2FA / SSO.

## Arquivos prováveis a tocar

- **Novos:**
  - `src/app/api/admin/users/route.ts` (POST = criar; GET = listar)
  - `src/app/api/admin/users/[id]/resend-reset/route.ts` (POST = reenviar link)
  - `src/app/api/admin/users/[id]/reject/route.ts` (POST = recusar) — se não existir
  - `src/app/admin/users/page.tsx` (ou aba dentro de `admin/settings/page.tsx`)
- **Modificados:**
  - `src/app/api/auth/reset/route.ts` (aceitar `expiry === null` como válido)
  - `src/lib/email.ts` (novo template `sendWelcomeWithPasswordSetup` se ficar mais limpo separado)
  - Navegação do `/admin` (link pra nova aba)

## Definition of Done

- [ ] Admin consegue criar usuário pelo painel sem mexer em SQL
- [ ] Usuário recém-criado recebe e-mail funcional com link de definição de senha
- [ ] Link funciona mesmo após dias (não expira)
- [ ] Após o usuário definir a senha, o token é invalidado
- [ ] Tela de listagem mostra todos os usuários com filtros
- [ ] Ações de aprovar / recusar / reenviar funcionam
- [ ] Endpoints negam acesso pra não-ADMIN
- [ ] Funciona em dev local (`npm run dev`) e build de produção (`npm run build`)
- [ ] Não quebra o fluxo de auto-cadastro existente
