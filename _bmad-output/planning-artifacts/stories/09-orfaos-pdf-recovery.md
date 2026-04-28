# Story 09 — Recuperador de PDFs órfãos no volume

**Status:** ✅ Implementado (etapa 1: `4966673`, etapa 2: `92a8c0b`, ambos pushados)
**Owner (PM):** John

## Contexto resolvido

Após o incidente do `prisma db push`, a tabela `Receipt` foi zerada mas os arquivos PDF físicos permaneceram no volume `uploads/`. Bruno só conseguia acessá-los via Portainer (UUIDs sem identificação), o que era impraticável pra organizar.

## O que foi entregue

### Etapa 1 — Acesso via front (commit `4966673`)
- Lib compartilhada `src/lib/orphans.ts` (listagem, sanitização de path, naming)
- `GET /api/admin/orphans`: lista órfãos
- `GET /api/admin/orphans/download?file=...`: download individual com Content-Disposition amigável
- `GET /api/admin/orphans/download-all?status=...`: ZIP organizado em `ASSINADOS/` e `SEM_ASSINATURA/`
- `DELETE /api/admin/orphans?file=...`: apaga do disco
- Tela `/admin/orphans` com cards de resumo, filtros, tabela e ações
- Ícone âmbar de alerta no header da home (admin only)

### Etapa 2 — Identificação dos arquivos (commit `92a8c0b`)
- Nova lib `src/lib/pdfParse.ts` usando `pdf-parse@2.4.5` (classe `PDFParse`)
- Cache em memória por `filename+mtime` (re-parse não acontece se arquivo não mudou)
- `parseMany` roda em paralelo limitado (5 simultâneos) com tolerância a falha individual
- Listagem do `GET /api/admin/orphans` agora inclui `parsed.{nome, cpf, competencia, dataAssinatura}`
- Tela mostra **nome do colaborador** + CPF + competência ao lado do UUID
- Download individual e ZIP usam o nome parseado quando disponível: `Joao Silva - 05-2026 - ASSINADO.pdf`
- Fallback gracioso para o UUID original quando parse falha

## Como Bruno usa

1. Login como admin
2. Header da home → ícone âmbar de alerta
3. Tela mostra todos os PDFs órfãos com identificação parseada
4. Filtra por status, baixa individualmente ou ZIP de tudo
5. ZIP vem organizado em pastas e com nomes legíveis
6. Pode apagar o que não precisa mais (com confirmação)

## Arquivos
- Novos: `src/lib/orphans.ts`, `src/lib/pdfParse.ts`, `src/app/admin/orphans/page.tsx`, `src/app/api/admin/orphans/route.ts`, `src/app/api/admin/orphans/download/route.ts`, `src/app/api/admin/orphans/download-all/route.ts`
- Modificados: `src/app/page.tsx` (ícone nav), `package.json` + `package-lock.json` (pdf-parse)

## Decisões técnicas

- **Cache no servidor (memória, não Redis)**: o volume de PDFs órfãos é finito e fechado (não cresce — só diminui à medida que Bruno baixa/apaga). Cache em memória é suficiente.
- **PDFParse v2 com Uint8Array**: nodejs Buffer é convertido automaticamente, mas faço explícito por clareza.
- **Sanitização de path**: rejeita `..`, `/`, `\` no parâmetro `file`. Só basename `.pdf`. Confirma existência via `fs.existsSync` antes de servir.

## Etapa 3 (não implementada — fora do escopo desta story)

Botão "Reimportar para o sistema" repovoando o `data/receipts.json` foi explicitamente deixado fora. Quando Bruno terminar de baixar/organizar os órfãos, a próxima decisão é se quer tentar ressuscitar parte do histórico no front. Daí abrimos Story 10.
