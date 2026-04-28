# Story 05 — Hardening: validação de role ADMIN nos endpoints administrativos

**Status:** ✅ Implementado (commit 9026485, pushado pra main)
**Owner (PM):** John
**Estimativa:** ~1-2h
**Prioridade:** P0 (segurança)

## Contexto

Durante a implementação da Story 03, Amelia identificou que vários endpoints sob `/api/admin/*` **não validam a sessão do usuário no servidor** — confiam apenas que a UI bloqueia acesso visualmente. Isso significa que **qualquer pessoa que conheça as URLs pode chamar diretamente** (curl, Postman, fetch via console) e ler/escrever dados sem ser admin.

Endpoints afetados confirmados:
- [`src/app/api/admin/settings/route.ts`](../../../src/app/api/admin/settings/route.ts) — GET/POST sem nenhuma checagem
- [`src/app/api/admin/approve/route.ts`](../../../src/app/api/admin/approve/route.ts) — GET via link de e-mail, sem validação de quem clicou (ver decisão abaixo)

## User Story

> **Como** dono do produto,
> **eu quero** que todos os endpoints administrativos exijam sessão NextAuth com role=ADMIN no servidor,
> **para que** dados sensíveis (SMTP, credenciais Evo, gestão de usuários) não possam ser lidos ou modificados por usuários comuns ou anônimos.

## Critérios de Aceite

### CA-1 — Helper compartilhado `requireAdmin()`
- Extrair a função `requireAdmin()` que já existe duplicada em três arquivos da Story 03 para um módulo reutilizável: `src/lib/authz.ts` (novo).
- Assinatura: `async function requireAdmin(): Promise<NextResponse | null>` — retorna `NextResponse 403` quando barra, `null` quando libera.
- Refatorar os 3 endpoints da Story 03 (`/api/admin/users` e suas sub-rotas) para usar o helper compartilhado.

### CA-2 — Proteger `/api/admin/settings`
- Adicionar `requireAdmin()` no início de `GET` e `POST`.
- Comportamento atual NÃO muda para usuários ADMIN. Para qualquer outro: 403 com `{ error: "Acesso negado." }`.

### CA-3 — Decisão sobre `/api/admin/approve`
- Esse endpoint é GET via link no e-mail enviado para o admin. **Mantém o comportamento por link**, MAS:
  - Adiciona checagem de sessão admin OU validação por token assinado de uso único.
  - Decisão de produto (já tomada): **adicionar `requireAdmin()`**. O admin precisa estar logado no painel pra aprovar — clica no link do e-mail, é redirecionado pro `/login` se não estiver logado, e depois cai no endpoint que aprova. Se logado, aprova direto.
  - Side effect aceitável: admin precisa ter sessão ativa pra aprovar. É a expectativa correta de segurança.
  - Atualizar a UI da Story 03 (`/admin/users` botão "Aprovar") continua funcionando porque já chama com cookie de sessão.

### CA-4 — Sanity check de outros endpoints `/api/admin/*`
- Listar todos os arquivos sob `src/app/api/admin/` e verificar se algum não tem `requireAdmin()`. Adicionar onde faltar.
- Documentar no commit message a lista de endpoints protegidos.

### CA-5 — Smoke test (manual, documentado em DoD)
- Em dev local, abrir Postman/curl sem sessão e tentar:
  - `GET /api/admin/settings` → 403
  - `GET /api/admin/users` → 403
  - `POST /api/admin/users` com payload qualquer → 403
- Logado como ADMIN: tudo funciona normal.
- Logado como USER (não-admin): mesmo retorno 403.

## Fora de escopo

- Reescrever a UI dos endpoints — não muda nada visualmente.
- Adicionar logs de auditoria de quem acessou o quê (vira story própria depois).
- Rate limiting (vira story própria depois).
- 2FA para admin (vira story própria depois).

## Arquivos a tocar

- **Novo:** `src/lib/authz.ts`
- **Modificados:**
  - `src/app/api/admin/settings/route.ts`
  - `src/app/api/admin/approve/route.ts`
  - `src/app/api/admin/users/route.ts` (refatorar pra usar helper compartilhado)
  - `src/app/api/admin/users/[id]/resend-reset/route.ts` (idem)
  - `src/app/api/admin/users/[id]/reject/route.ts` (idem)

## Definition of Done

- [ ] `requireAdmin()` centralizado em `src/lib/authz.ts`
- [ ] Todos os endpoints `/api/admin/*` retornam 403 sem sessão admin
- [ ] Endpoints continuam funcionando 100% para usuários ADMIN
- [ ] Build passa (`npm run build`)
- [ ] Commit message lista endpoints protegidos
