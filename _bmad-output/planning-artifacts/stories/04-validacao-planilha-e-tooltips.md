# Story 04 — Validação inteligente do upload de planilha + tooltips contextuais

**Status:** ✅ Implementado (Amelia, commits 999ca89, 0171783, 059a488). CA-4 (preview UI) movido para [Story 04b](./04b-preview-upload-stretch.md) como stretch.
**Owner (PM):** John
**Estimativa:** ~1-1.5 dia
**Prioridade:** P1 (alta — alta dor relatada)

## Contexto

Bruno relatou: ao baixar a planilha modelo, várias células estão com formato "Geral". Quando o usuário cola data (`01/05/2026`) ou número, o Excel **converte para serial number** (ex.: `45413`) ou interpreta errado, e o backend quebra na hora de processar — especialmente o cálculo de **competência** (mês/ano de referência), que sai com valor sem sentido.

Causa-raiz confirmada no código: [`src/app/api/process/route.ts:33`](../../../src/app/api/process/route.ts#L33)
```ts
const competenciaVal = record['Competência'] || record['Periodo VA-VT início']?.substring(3) || 'Atual';
```
Esse `.substring(3)` assume que o campo é uma string `DD/MM/YYYY` (pra pegar `MM/YYYY`). Quando vem número serial (`45413`) ou outro formato, sai lixo.

Bruno escolheu solução **B (validação inteligente no backend)** — sem mexer em planilha. E pediu **tooltips contextuais** em três telas onde a galera pena: **upload de planilha, filtros do dashboard, tela de criar recibo**.

## User Story

> **Como** usuário do DP fazendo upload de planilha de benefícios,
> **eu quero** que o sistema entenda diferentes formatos de data e número (serial Excel, DD/MM/AAAA, AAAA-MM-DD, com vírgula ou ponto decimal),
> **para que** eu não tenha que formatar manualmente célula por célula antes de subir.
>
> E **como** novo usuário do sistema,
> **eu quero** ver dicas contextuais (`ⓘ`) em cima dos campos onde costumo errar,
> **para que** eu entenda o formato esperado e o que aquele campo significa sem precisar abrir o suporte.

## Critérios de Aceite

### CA-1 — Normalização robusta de datas no upload

Criar função utilitária `normalizeDate(value, opts?)` em `src/lib/spreadsheet.ts` (novo arquivo) que aceita:

| Entrada | Comportamento |
|---|---|
| `45413` (number — serial Excel) | Converte para `Date` correto. Excel epoch é 1900-01-01 com bug de leap year — usar `xlsx` lib (`xlsx.SSF.parse_date_code`) ou manualmente `new Date(Date.UTC(1899, 11, 30 + serial))`. |
| `"01/05/2026"` (DD/MM/YYYY) | Parse direto. |
| `"2026-05-01"` (ISO) | Parse direto. |
| `"01-05-2026"` ou `"01.05.2026"` | Parse direto. |
| `"01 de maio de 2026"` | Parse pt-BR (mês por nome). |
| `Date` já válido | Retorna como veio. |
| Vazio / inválido | Retorna `null`. |

Retorno: `Date | null`. Função pura, testável.

### CA-2 — Cálculo correto da competência

Substituir o `.substring(3)` em `process/route.ts` por:

```ts
const dataInicio = normalizeDate(record['Periodo VA-VT início']);
const competenciaVal =
  record['Competência'] ||
  (dataInicio ? `${String(dataInicio.getMonth() + 1).padStart(2, '0')}/${dataInicio.getFullYear()}` : 'Atual');
```

Resultado: competência sempre `MM/AAAA` quando a data é parseável, independente do formato original.

### CA-3 — Normalização de valores monetários (já existe parcialmente)

A função `formatMoney()` em `process/route.ts` já cobre alguns casos. Estender para também aceitar:
- Número com símbolo de moeda já incluso (ex.: `"R$ 46,38"`, `"R$1.234,56"`)
- Número com separador de milhar e vírgula decimal (`"1.234,56"`)
- Notação americana (`"1234.56"`)
- Vazio / nulo → `R$ 0,00`

Mover essa função pra `src/lib/spreadsheet.ts` também (`normalizeMoney(value)` retorna `number` em centavos ou `Date`-like, não string formatada — formatação fica na borda da apresentação).

### CA-4 — Preview antes de gravar (UX safety net)

No upload (`/api/upload` + UI correspondente), depois do parse mas **antes** de chamar `/api/process`:

1. Backend retorna estrutura preview: `{ rows: [{ raw: {...originalCells}, normalized: {...parsedValues}, errors: string[], warnings: string[] }] }`
2. Frontend mostra tabela com:
   - ✅ verde: linhas OK (todos os campos críticos parseados)
   - ⚠️ amarelo: warnings (ex.: data interpretada de formato ambíguo, campo opcional faltando)
   - ❌ vermelho: erros bloqueantes (CPF inválido, data não-parseável, valor não-numérico em coluna obrigatória)
3. Usuário confirma o que vai subir. Linhas com ❌ ficam de fora automaticamente, com opção "subir mesmo assim só as linhas verdes" ou "cancelar e refazer".
4. Só então chama `/api/process` com os dados normalizados.

> **Esforço:** se a UI de preview ficar grande, é razoável fazer ela em uma sub-story 04b. Para MVP da 04, foco no parsing + tooltips. Marcar preview como **stretch goal**: fazer se sobrar tempo, senão fica pra 04b.

### CA-5 — Tooltips contextuais (`ⓘ`)

Criar componente reutilizável `<Tooltip content={...} />` em `src/components/Tooltip.tsx`:
- Ícone: `ⓘ` discreto (Tailwind: `text-zinc-400 hover:text-emerald-400`).
- Comportamento: hover (desktop) + tap (touch).
- Renderiza balão com texto curto + opcional link "Saiba mais".
- Acessibilidade: `aria-label`, foco por teclado.

**Aplicar tooltips nas 3 telas escolhidas:**

#### 5a) Upload de planilha
Em cada coluna esperada (mostrar na tela de instruções/preview):
- **NOME**: "Nome completo do colaborador. Aceita acentos."
- **CPF**: "Pode incluir ou não pontuação (`111.222.333-44` ou `11122233344`). Será normalizado."
- **Periodo VA-VT início / fim**: "Data no formato DD/MM/AAAA. Aceita também data formatada como célula 'Data' do Excel — não precisa formatar como texto."
- **Valores (VA / VT / Descontos)**: "Aceita `46,38`, `46.38` ou `R$ 46,38`. Pode usar fórmulas Excel (ex.: `=E2*F2`)."
- **EMAIL FUNCIONARIO**: "Para envio do recibo por e-mail. Opcional se WhatsApp estiver preenchido."
- **WHATSAPP FUNCIONARIO**: "Formato com DDI: `5561999999999`. Opcional se e-mail estiver preenchido."
- **DATA ASSINATURA DO RECIBO**: "Data que aparecerá no PDF como data de emissão. Aceita texto livre (ex.: `01 de maio de 2026`)."

#### 5b) Filtros do dashboard
Em cima da seção de filtros (qual seja a tela atual de listagem de recibos):
- **Status**: "PENDENTE = aguardando assinatura. ASSINADO = colaborador já assinou. EXPIRADO = link de assinatura venceu."
- **Competência**: "Mês/ano de referência do benefício, no formato MM/AAAA (ex.: 05/2026)."
- **Período (data de criação)**: "Quando o recibo foi gerado no sistema, não a competência."
- **Busca por nome/CPF**: "Aceita nome parcial ou CPF (com ou sem pontuação)."

#### 5c) Tela de criar recibo (se houver / quando houver)
Aplicar tooltips nos mesmos campos da planilha. Se a tela de criar recibo unitário ainda não existir como UI separada, este sub-item é **n/a** por enquanto — o foco fica nos campos do upload + filtros.

### CA-6 — Logs estruturados de erro
Quando uma linha falha no parse, logar (via `lib/logger.ts`) com: linha (índice), nome da coluna problemática, valor recebido cru, motivo. Isso ajuda a investigar problemas futuros sem precisar pedir o XLSX original.

## Decisões de produto (já validadas com Bruno)

- **Solução B (validação inteligente)** escolhida em vez de A (planilha pré-formatada) ou C (form unitário). Motivo: ataca a causa-raiz e não depende do usuário fazer nada certo.
- **Tooltips focais**, não cobertura completa do sistema. Foco: upload, filtros do dashboard, tela de criar recibo.
- **Eu (John) escrevo todos os textos dos tooltips** — Bruno autorizou e pediu pra dar o melhor. Os textos acima são o draft — Amelia deve usá-los como referência e ajustar a wording só se inviável tecnicamente.

## Fora de escopo

- Reformular o template Excel em si (já tem fórmulas, está OK — só faltava parsing tolerante no backend).
- Criar um wizard step-by-step de upload.
- Internacionalização dos tooltips (PT-BR fixo).

## Arquivos prováveis a tocar

- **Novos:**
  - `src/lib/spreadsheet.ts` — `normalizeDate`, `normalizeMoney`, e helpers
  - `src/components/Tooltip.tsx` — componente reutilizável
  - `src/lib/spreadsheet.test.ts` — testes unitários (jest já configurado)
- **Modificados:**
  - `src/app/api/process/route.ts` — usar `normalizeDate` + `normalizeMoney`
  - `src/app/api/upload/route.ts` — possivelmente expor preview parseado
  - Componente atual de upload (achar via `grep "/api/upload"` no front)
  - Página de listagem/dashboard de recibos (adicionar tooltips nos filtros)

## Definition of Done

- [ ] Função `normalizeDate` cobre os 6 formatos da CA-1, com testes unitários
- [ ] Competência sai correta independente do formato da célula de "Periodo VA-VT início"
- [ ] Upload de planilha com células em formato "Geral" (não pré-formatadas) processa sem erro
- [ ] Tooltips renderizando em todos os campos listados em CA-5a e CA-5b
- [ ] Tooltips funcionam em mobile (tap)
- [ ] Logs estruturados ajudam a debugar linhas que falham
- [ ] Build de produção passa (`npm run build`)
- [ ] Teste manual: subir uma planilha que antes quebrava, agora processa
