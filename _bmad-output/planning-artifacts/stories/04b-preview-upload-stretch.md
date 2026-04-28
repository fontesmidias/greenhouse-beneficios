# Story 04b — Preview de upload de planilha (stretch da Story 04)

**Status:** Backlog (não implementada)
**Owner (PM):** John
**Estimativa:** ~6-8h
**Prioridade:** P2 (UX safety net — não bloqueia uso atual)

## Contexto

Originalmente concebida como CA-4 da [Story 04](04-validacao-planilha-e-tooltips.md). Após implementação dos normalizers (CA-1, 2, 3, 6) e tooltips (CA-5), o problema central foi resolvido: planilhas mal formatadas agora processam sem erro. O preview seria uma camada extra de confiança visual antes de gravar — útil, mas não bloqueador.

Decisão tomada durante a Story 04: deixar como sub-story separada para escopo focado e revisitar conforme demanda real.

## User Story

> **Como** usuário do DP fazendo upload,
> **eu quero** ver uma prévia das linhas parseadas (com avisos sobre dados ambíguos)
> **antes de** confirmar a geração dos PDFs,
> **para** evitar gerar lote inteiro com erro de digitação.

## Critérios de Aceite

### CA-1 — Endpoint `/api/upload` retorna estrutura de preview
- Para cada linha do XLSX/CSV, retornar:
  ```ts
  {
    rowNumber: number,        // número da linha na planilha (com cabeçalho = linha 1)
    raw: Record<string, any>, // valores originais
    normalized: {
      nome: string,
      cpf: string,
      competencia: string | null,
      dataInicio: string | null,  // DD/MM/AAAA
      dataFim: string | null,
      valorVA: number | null,
      valorVT: number | null,
      // ... demais campos normalizados
    },
    severity: "ok" | "warning" | "error",
    issues: { field: string, message: string, severity: "warning" | "error" }[]
  }
  ```
- Severidades:
  - **ok**: tudo certo
  - **warning**: campo opcional faltante, formato ambíguo (ex.: data interpretada como serial), valor monetário 0
  - **error**: NOME ou CPF ausente, data não-parseável, CPF inválido (11 dígitos)

### CA-2 — UI de preview no frontend
- Após upload bem-sucedido, NÃO chama `/api/process` automaticamente.
- Mostra tabela com:
  - Indicador de severidade na 1ª coluna (✅/⚠️/❌)
  - Colunas principais (Nome, CPF, Competência, VA, VT)
  - Tooltip ao passar o mouse na linha mostra os `issues` específicos
- Filtros: "Mostrar todos" / "Só com problema" / "Só erros"
- Resumo no topo: `42 OK | 3 com aviso | 1 com erro`
- Botões:
  - **"Gerar PDFs (apenas linhas OK)"** — descarta erros silenciosamente
  - **"Gerar PDFs (incluindo avisos)"** — gera tudo com severity ≤ warning
  - **"Cancelar"** — limpa preview, volta ao drop zone

### CA-3 — Validação de CPF
- Adicionar `validateCPF(value)` em `src/lib/spreadsheet.ts`.
- Aceita 11 dígitos (com ou sem máscara), valida dígitos verificadores.
- Retorna `{ valid: boolean, normalized: string }`.

### CA-4 — Testes
- Unit tests para `validateCPF` cobrindo casos válidos, inválidos, máscara/sem máscara.
- Snapshot test do estado de preview com fixture XLSX problemática (mock de payload).

## Decisões adiadas

- **Edição inline na preview**: usuário pode corrigir um campo direto na UI? Adiar — pra uma 04c se demanda surgir.
- **Salvar como rascunho**: poder fechar a tela e voltar depois? Adiar.

## Por que isso ficou de fora da Story 04

A solução B (validação inteligente no backend) cobre 90% da dor. A preview é "cinto + suspensório" — bom de ter, mas não essencial. Bruno está com pressa (gente querendo usar), e os normalizers + tooltips destravam o uso imediato. A preview entra quando aparecer relato de "subi e só descobri o problema depois".

## Sinais para priorizar essa story

Voltar nessa quando:
- Algum usuário relatar ter gerado lote inteiro com PDF errado
- Tempo médio entre upload e descoberta de erro > 1 dia
- Volume de lotes regenerados (ações de "descartar lote") subir
