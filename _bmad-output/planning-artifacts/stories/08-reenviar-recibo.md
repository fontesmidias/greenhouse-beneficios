# Story 08 — Reenviar recibo (e-mail e/ou WhatsApp) sem regenerar token

**Status:** ✅ Implementado (commit `736af38`, pushado pra main)
**Owner (PM):** John

## O que foi entregue

### Backend
- Novo endpoint `POST /api/receipts/[id]/resend`
  - Body: `{ channel: "email" | "whatsapp" | "both" }`
  - Reusa o `magicLinkToken` existente (sem regenerar)
  - Reporta sucesso/falha por canal independentemente
  - Logger estruturado (receiptId, channel, sent, errors, requestedBy)

### Frontend (`src/app/page.tsx`)
- Botão circular ⟳ âmbar na coluna Ações de cada recibo
- Click abre dropdown com 3 opções: **Por E-mail** / **Por WhatsApp** / **Ambos os canais**
- Itens individuais desabilitados quando recibo não tem o canal correspondente
- Botão raiz desabilitado e com tooltip "Sem contato cadastrado" quando não tem nada
- Spinner de loading durante envio
- Toast de feedback com texto descritivo:
  - **success:** "Reenviado com sucesso por e-mail e WhatsApp para Fulano"
  - **warning:** sucesso parcial (um canal OK, outro falhou)
  - **error:** todos os canais falharam, com detalhes
- Dropdown fecha ao clicar fora ou apertar Esc

## Decisões de UX tomadas

- Não substituiu os botões existentes de disparo individual (email/whatsapp/download/delete) — adicionou o "Reenviar" como **ação distinta** (ícone de seta circular âmbar), porque o disparo individual existente passa pela fila de roteamento (com intervalos anti-spam) enquanto o resend é síncrono e direto
- Cor âmbar separa visualmente de "novo disparo" (cinza/verde) e "ação destrutiva" (vermelho)
- Dropdown vertical compacto cabe sem empurrar o layout
