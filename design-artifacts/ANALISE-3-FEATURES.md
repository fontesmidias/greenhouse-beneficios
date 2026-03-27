# 🏗️ ANÁLISE MULTIDIMENSIONAL: 4 FEATURES - GREENHOUSE BENEFÍCIOS

**Projeto:** GreenHouse Benefícios  
**Stack:** Next.js 16, TypeScript, Prisma, NeonDB PostgreSQL  
**Data:** Março 2026  
**Orquestrador:** Análise Colaborativa de 6 Perspectivas

---

## 🎯 RESUMO EXECUTIVO DAS 4 FEATURES

| Feature | Usuário | Objetivo | Valor |
|---------|---------|----------|-------|
| **F1: Template PDF Editável** | DP (logado) | Customizar templates sem alterar código | Flexibilidade operacional, reduz tempo de TI |
| **F2: Mensagens WhatsApp** | DP (logado) | Gerenciar variações de mensagens via UI | Autonomia DP, sem dependência de dev |
| **F3: Download em Massa** | DP (logado) | Baixar múltiplos recibos zipados | Eficiência, reduz cliques manuais |
| **F4: Obter Link Manual** | DP (logado) | Obter link único para reenvio quando contato mudou | Flexibilidade, acessibilidade, suporte |

---

# 📊 PERSPECTIVA 1: PRODUCT MANAGER (John)

## 1.1 Requisitos Claros e Priorização

### Feature 1: Template PDF Editável
**MoSCoW Priority:** SHOULD (nice-to-have, mas estratégico)  
**Stakeholders:** DP, Gestão RH

**Requisitos Funcionais:**
- [ ] DP logado acessa dashboard "Customização de Templates"
- [ ] Interface WYSIWYG ou form-based para editar:
  - Texto estático (cabeçalho, rodapé, termos)
  - Layout (posições de campos)
  - Fontes e tamanhos (within safe boundaries)
  - Logo/branding
- [ ] Preview em tempo real do PDF resultado
- [ ] Histórico de versões (revert se necessário)
- [ ] Validação: templates não podem quebrar geração de PDF

**Requisitos Não-Funcionais:**
- Segurança: apenas ADMIN/DP com role apropriado
- Performance: preview renderiza em <500ms
- Persistência: templates salvos no banco de dados

---

### Feature 2: Mensagens WhatsApp
**MoSCoW Priority:** MUST (core para operação)  
**Stakeholders:** DP, Comunicação

**Requisitos Funcionais:**
- [ ] DP logado acessa "Gerenciador de Mensagens WhatsApp"
- [ ] Dashboard com lista de mensagens padrão:
  - Mensagem de boas-vindas
  - Lembrete de assinatura
  - Confirmação de recebimento
  - Mensagem de erro/recusa
- [ ] CRUD completo: criar, editar, deletar, ativar/desativar
- [ ] Variáveis/placeholders: {{NOME}}, {{CPF}}, {{VALOR}}, {{DATA}}
- [ ] Preview com valores de exemplo
- [ ] Ativa/Inativa por contexto (se necessário)

**Requisitos Não-Funcionais:**
- Segurança: auditoria de mudanças (who/when changed)
- UX: interface intuitiva (usuários não-técnicos)
- Performance: carregamento em <200ms

---

### Feature 3: Download em Massa de Recibos
**MoSCoW Priority:** MUST (eficiência operacional)  
**Stakeholders:** DP, Gestão Processual

**Requisitos Funcionais:**
- [ ] Dashboard "Recibos" com tabela paginada de receipts
- [ ] Checkbox multi-seleção por linha + "Selecionar Todos" (página atual)
- [ ] Botão "Download Massa" ativado apenas com seleção > 0
- [ ] Click ativa:
  - Validação: todos recibos status ASSINADO
  - Zipa os PDFs: `recibos-{data-hora}.zip`
  - Inicia download automático
- [ ] Feedback visual: loading, sucesso, erro
- [ ] Limite seguro: máx 100 recibos por vez (performance)

**Requisitos Não-Funcionais:**
- Segurança: validar permissões DP antes de cada download
- Performance: zip gerado em <3s para 100 recibos
- Storage: arquivos temporários deletados após 1h

---

### Feature 4: Obter Link Manual de Assinatura
**MoSCoW Priority:** SHOULD (nice-to-have, mas muito prático)  
**Stakeholders:** DP, Suporte, Colaboradores

**Requisitos Funcionais:**
- [ ] Dashboard "Recibos": cada linha tem ação "Obter Link"
- [ ] Click "Obter Link" → modal exibe magic link (readonly)
- [ ] DP pode copiar link com botão de clipboard
- [ ] Integrado com F3: seleção múltipla → "Obter Links em Massa"
  - Click → exibe list de links (um por collaborador/recibo)
  - Copiar todos os links (text format)
- [ ] Link reutiliza o magic link existente (NÃO gera novo)
- [ ] Link NÃO expira (permanente, vinculado ao recibo)
- [ ] DP pode compartilhar link manualmente (email, WhatsApp, etc)
- [ ] Validação: link válido apenas se recibo status ∈ [ENVIADO, ASSINADO]

**Requisitos Não-Funcionais:**
- Segurança: qualquer DP logado pode obter qualquer link (sem scope restrict)
- Performance: modal carrega em <100ms
- Auditoria: registrar todos os "Obter Link" (quando, por quem)

---

## 1.2 Valor para o Cliente (why → impact)

### For DP (Dayparks/Departamento Pessoal)
- **Autonomia:** Sem depender de dev para customizar templates/mensagens
- **Velocidade:** Download em massa reduz tarefas manuais repetitivas
- **Profissionalismo:** Templates personalizados (com branding, termos legais)
- **Flexibilidade:** Reenviar links quando colaborador muda contato (sem gerar novo)
- **Suporte:** Facilita atendimento ao cliente (copia link, envia manualmente)

### For Organização
- **Escalabilidade:** Modelo operacional suporta múltiplos departamentos com templates diferentes
- **Compliance:** Auditoria de mudanças em templates/mensagens
- **Redução de overhead:** DP autossuficiente
- **Retenção:** Recibos não expiram, colaborador pode acessar sempre

---

## 1.3 Dependências Entre Features

```
Feature 4 (Obter Link Manual)
  ↓ (não depende de outras, mas integra com F3)
  
Feature 3 (Download Massa)
  ↓ (não depende de outras, mas tem UI que integra com F4)
  
Feature 2 (Mensagens WhatsApp)
  ↓ (usa dados de Receipt, independente)
  
Feature 1 (Template PDF)
  ↓ (usa dados de Receipt, independente)
  
⚠️ Nota: F1 e F2 são **independentes**, podem ser desenvolvidas em paralelo
     F3 e F4 são **complementares**, geralmente desenvolvidas juntas
     F4 reusa o magic link de Receipt existente (minimal backend changes)
```

---

## 1.4 Sequência Recomendada de MVP

**MVP 1 (Sprint 1-2):** Feature 3 + 4 (Download Massa + Obter Link Manual)
- Menor complexidade, máximo impacto (eficiência + flexibilidade)
- Usa apenas Receipt table existente + magic link existente
- Prova viabilidade de UI para seleção múltipla
- F4 é "feature lightweight" integrada naturalmente em F3

**MVP 2 (Sprint 3-4):** Feature 2 (Mensagens WhatsApp)
- Core para operação diária
- Cria novo modelo (WhatsAppTemplate ou similar)
- Reusa padrões de CRUD

**MVP 3 (Sprint 5-6):** Feature 1 (Template PDF)
- Mais complexa, requer WYSIWYG ou form-based editor
- Pode ser iterado com feedback de F2/F3
- Máximo retorno quando F2 e F3 ja estão rodando

---

---

# 🏛️ PERSPECTIVA 2: ARQUITETO (Winston)

## 2.1 Arquitetura de Banco de Dados (Prisma)

### Modelos Necessários

```prisma
// FEATURE 1: Templates PDF
model PdfTemplate {
  id          String    @id @default(uuid())
  name        String    @unique // ex: "Template_Recibo_Standard"
  description String?
  
  // Conteúdo estruturado (JSON para flexibilidade)
  content     Json      @default("{}")
  // Ex: { "header": "...", "footer": "...", "sections": [...], "fonts": {...} }
  
  // Metadata
  isActive    Boolean   @default(true)
  version     Int       @default(1)
  createdBy   String    // userId
  createdAt   DateTime  @default(now())
  updatedAt   DateTime  @updatedAt
  lastModifiedBy String?
  
  @@index([isActive])
}

model PdfTemplateHistory {
  id         String    @id @default(uuid())
  templateId String
  version    Int
  content    Json      // snapshot da versão
  changedBy  String    // userId
  changes    String?   // resumo do que mudou
  createdAt  DateTime  @default(now())
  
  @@unique([templateId, version])
  @@index([templateId])
  @@index([createdAt])
}

// FEATURE 2: Mensagens WhatsApp
model WhatsAppTemplate {
  id          String    @id @default(uuid())
  name        String    @unique // ex: "msg_boas_vindas"
  displayName String    // "Mensagem de Boas-vindas"
  content     String    // "Olá {{NOME}}, bem-vindo!"
  category    String    // "CONFIRMACAO", "LEMBRETE", "ERRO", "WELCOME"
  
  isActive    Boolean   @default(true)
  createdBy   String    // userId
  createdAt   DateTime  @default(now())
  updatedAt   DateTime  @updatedAt
  lastModifiedBy String?
  
  // Auditoria
  auditLog    String?   // JSON com histórico de mudanças
  
  @@index([category])
  @@index([isActive])
}

// Opcional: versioning granular para mensagens
model WhatsAppTemplateHistory {
  id         String    @id @default(uuid())
  templateId String
  version    Int
  content    String    // previous content
  changedBy  String
  reason     String?
  createdAt  DateTime  @default(now())
  
  @@unique([templateId, version])
}

// FEATURE 3: Não requer novo modelo - usa Receipt existente
// Apenas precisa de índice otimizado em status + createdAt

// FEATURE 4: Não requer novo modelo - usa Receipt.magicLinkToken existente
// Apenas adiciona auditoria de acesso aos links
model MagicLinkAudit {
  id        String   @id @default(uuid())
  receiptId String
  userId    String?  // DP que obteve o link
  action    String   // "LINK_OBTAINED", "LINK_COPIED", "LINK_ACCESSED"
  ipAddress String?
  createdAt DateTime @default(now())
  
  @@index([receiptId])
  @@index([action])
  @@index([createdAt])
}
```

### Migrations Necessárias

```bash
# Criar modelos PdfTemplate, PdfTemplateHistory, WhatsAppTemplate, WhatsAppTemplateHistory
npx prisma migrate dev --name add_templates_feature
```

---

## 2.2 Segurança e Autorização

### Padrão: Role-Based Access Control (RBAC)

```typescript
// lib/auth-middleware.ts (novo)
export const requireRole = (roles: string[]) => {
  return async (req: NextRequest, next: NextMiddleware) => {
    const session = await getSession({ req });
    
    if (!session?.user) {
      return new NextResponse('Unauthorized', { status: 401 });
    }
    
    if (!roles.includes(session.user.role)) {
      return new NextResponse('Forbidden', { status: 403 });
    }
    
    return next();
  };
};

// Roles requeridos para cada feature:
// F1 (Template PDF):    role === "ADMIN" || role === "DP_MANAGER"
// F2 (Mensagens WA):    role === "ADMIN" || role === "DP_MANAGER"
// F3 (Download Massa):  role === "ADMIN" || role === "DP_MANAGER" || role === "USER"
```

### Diretrizes

- ✅ User model: adicionar campo `role` com valores: "ADMIN", "DP_MANAGER", "USER"
- ✅ Validar role em cada API route (middleware + explícito em handler)
- ✅ Logar todas as mudanças em templates (auditoria)
- ✅ Saltar validação apenas para leitura; write sempre requer ADMIN/DP_MANAGER

---

## 2.3 Padrões Arquiteturais

### Estrutura de Pastas Proposta

```
src/
├── app/
│   ├── api/
│   │   ├── admin/
│   │   │   ├── templates/
│   │   │   │   ├── pdf/
│   │   │   │   │   ├── route.ts        # GET/POST PDF templates
│   │   │   │   │   └── [id]/route.ts   # GET/PUT/DELETE specific template
│   │   │   │   └── whatsapp/
│   │   │   │       ├── route.ts        # GET/POST WhatsApp messages
│   │   │   │       └── [id]/route.ts   # GET/PUT/DELETE specific message
│   │   ├── download/
│   │   │   └── bulk/
│   │   │       └── route.ts            # POST bulk download (cria zip)
│   │   └── receipts/
│   │       └── [id]/
│   │           ├── pdf/
│   │           │   └── route.ts        # GET PDF binary (existing)
│   │           └── link/
│   │               └── route.ts        # GET magic link (F4)
│   │
│   ├── admin/
│   │   ├── settings/
│   │   │   ├── page.tsx                (existing)
│   │   │   └── templates/ (new)
│   │   │       ├── page.tsx            # Dashboard F1 + F2
│   │   │       ├── pdf-editor/         # Component F1
│   │   │       └── whatsapp-editor/    # Component F2
│   │   └── dashboard/
│   │       ├── page.tsx                # Dashboard F3 (ou integrar em "receipts view")
│   │       └── components/
│   │           └── bulk-download/      # Component F3
│   │
│   └── api-sdk/                        # Optional: client-side API helpers
│       ├── templates.ts
│       ├── whatsapp.ts
│       └── downloads.ts
│
├── lib/
│   ├── auth.ts                         # Enhance with role validation
│   ├── pdf.ts                          # Enhance para usar template do DB
│   ├── whatsapp.ts                     # Enhance para usar template do DB
│   └── templates.ts (new)              # Template rendering logic
│
└── types/
    ├── templates.ts (new)               # Type definitions
    └── whatsapp.ts (new)
```

---

## 2.4 Fluxos Arquiteturais

### F1: Template PDF Editável

```
DP acessa /admin/templates
  ↓
GET /api/admin/templates/pdf → backend retorna lista + template atual
  ↓
UX renderiza editor (form + preview)
  ↓
DP edita conteúdo → preview atualiza (client-side)
  ↓
Click "Salvar" → PUT /api/admin/templates/pdf/{id}
  ↓
Backend valida + salva em PdfTemplate + cria PdfTemplateHistory
  ↓
Next time generateReceiptPDF() é chamado:
  - Busca template ativo do DB
  - Injeta dados de Receipt
  - Renderiza com pdf-lib
  ↓
DP vê confirmação "Template atualizado"
```

**Segurança:**
- Validar campos obrigatórios no template
- Sanitizar HTML/scripts (XSS)
- Logar mudanças: user, timestamp, changed fields

---

### F2: Mensagens WhatsApp

```
DP acessa /admin/templates/whatsapp
  ↓
GET /api/admin/templates/whatsapp → backend retorna lista de mensagens
  ↓
UX renderiza lista + form de edição
  ↓
DP clica "Editar Mensagem" → form popula
  ↓
DP altera conteúdo (ex: "Olá {{NOME}}, assinatura pendente!")
  ↓
Preview mostra: "Olá João Silva, assinatura pendente!"
  ↓
Click "Salvar" → PUT /api/admin/templates/whatsapp/{id}
  ↓
Backend valida (variáveis válidas) + salva + auditoria
  ↓
Next time sendWhatsAppMessage() é chamado:
  - Busca template ativo do DB
  - Substitui variáveis com dados do Receipt
  - Envia via Evolution API
```

**Segurança:**
- Whitelist de variáveis: NOME, CPF, VALOR, DATA, etc.
- Impedir {{SENSITIVE}} ou calls to APIs
- Logar mudanças

---

### F3: Download em Massa

```
DP acessa /admin/receipts (ou similar)
  ↓
UI renderiza tabela com checkboxes (pagination, ex: 20/página)
  ↓
DP seleciona múltiplas rows → botão "Download Massa" ativa
  ↓
Click botão → POST /api/download/bulk
  Payload: { receiptIds: [id1, id2, ...] }
  ↓
Backend:
  1. Valida: existe sessão DP_MANAGER (+log)
  2. Valida: todos receiptIds existem + status === "ASSINADO"
  3. Busca PDFs do storage (ou regenera se necessário)
  4. Cria ZIP em tmpdir: `/tmp/recibos-{uuid}.zip`
  5. Retorna stream (Content-Type: application/zip)
  ↓
UA faz download: "recibos-2026-03-27-14-30.zip"
  ↓
Cleanup: DELETE /tmp/recibos-{uuid}.zip após 1h (ou manual)
```

**Segurança:**
- Verificar permissão DP_MANAGER
- Validar todos receiptIds
- Rate-limit: max 5 downloads/min/user
- Log todas as operações

---

### F4: Obter Link Manual

```
DP acessa /admin/receipts
  ↓
UI aciona "Obter Link" em linha específica (ou F3 integrado para massa)
  ↓
(Opção A: Link Único)
  Click "Obter Link" → GET /api/receipts/{id}/magic-link
    ↓
  Backend:
    1. Valida: receiptId existe, status ∈ [ENVIADO, ASSINADO]
    2. Busca magicLinkToken existente (não gera novo)
    3. Monta URL: {BASE_URL}/sign?token={magicLinkToken}
    4. Log auditoria: "MAGIC_LINK_OBTAINED", timestamp, user
    ↓
  Frontend: Modal exibe link + botão "Copiar"
    ↓
  DP copia e envia manualmente

(Opção B: Links em Massa, integrado com F3)
  DP seleciona múltiplos recibos + clica "Obter Links"
    ↓
  Backend: POST /api/receipts/bulk/magic-links
    Payload: { receiptIds: [id1, id2, ...] }
    ↓
  Backend retorna:
    {
      links: [
        { receiptId: id1, collaboratorName: "João", link: "..." },
        { receiptId: id2, collaboratorName: "Maria", link: "..." }
      ]
    }
    ↓
  Frontend: Modal exibe tabela com link por person
    ↓
  DP copia todos (text format) ou individual
```

**Segurança:**
- Permissão: qualquer DP logado (sem restrição por scope)
- Validação: receipt status deve permitir acesso (ENVIADO+)
- Rate-limit: max 50 requisições/min/user (generoso para massa)
- Auditoria: log ALL magic link requests

**DB Changes:** Nenhuma! Reutiliza magicLinkToken + Receipt existente

---

## 2.5 Performance & Otimizações

### F1: Template PDF
- Cache templates em memória com um TTL (5 min)
- Usar índice em `isActive` para busca rápida
- Preview renderiza **client-side** (não hit API a cada keystroke)

### F2: Mensagens WhatsApp
- Cache templates (simples, texto)
- Buscar variáveis em memória (regex pré-compiladas)
- Índice em `category` + `isActive`

### F3: Download em Massa
- Usar `jszip` (client + server possible)
- **Paralelizar** leitura de PDFs (Promise.all)
- Cache PDFs já gerados (se no storage, reusar)
- Limitar CHUNK_SIZE: processar em batches de 10-20 por vez
- Streaming response se zip > 10MB

```typescript
// Performance: generate zip em paralelo
const pdfs = await Promise.all(
  receiptIds.map(id => getPdfBinary(id))
);
const zip = new JSZip();
pdfs.forEach((pdf, idx) => {
  zip.file(`recibo-${idx}.pdf`, pdf);
});
const blob = await zip.generateAsync({ type: 'blob' });
```

---

---

# 🎨 PERSPECTIVA 3: UX DESIGNER (Sally)

## 3.1 Interface para Feature 1: Template PDF Editável

### Opção A: WYSIWYG Editor (Recomendado)
**Pros:** Flexível, intuitivo, preview real-time  
**Cons:** Mais complexo, requer lib externa

**Componentes:**
- Split-screen: Left = Editor, Right = PDF Preview
- Toolbar: Bold, Italic, Font Size, Color, Align
- Drag-drop para reordenar seções
- Inserir variáveis: {{NOME}}, {{EMPRESA}}, etc (button dropdown)
- Undo/Redo

**Biblioteca Sugerida:** 
- `react-quill` (rich text, simples)
- `tiptap` (mais moderno, headless)
- Custom com `contenteditable` (controle total)

**Mockup de Fluxo:**
```
┌─────────────────────────────────────────────────────────┐
│ Template PDF - Edição                                    │
├─────────────────────┬─────────────────────────────────────┤
│ EDITOR              │        PREVIEW (PDF)                │
├─────────────────────┤─────────────────────────────────────┤
│ [B] [I] [U]         │                                     │
│ Font: Helvetica ▼   │  ╔════════════════════════════════╗ │
│ Size: 12 ▼          │  ║  ACME Corp                       ║ │
│                     │  ║  Comprovante de Rendimentos     ║ │
│ [Insert Variable ▼] │  ║                                  ║ │
│ • {{NOME}}          │  ║  Nome: João Silva                ║ │
│ • {{EMPRESA}}       │  ║  Empresa: Tech Corp              ║ │
│ • {{VALOR}}         │  ║  Valor: R$ 1.000,00             ║ │ 
│ • {{DATA}}          │  ║                                  ║ │
│                     │  ║                                  ║ │
│ ── Main Content ──  │  ║ Assinado em: 27/03/2026         ║ │
│ Editar aqui...      │  ║                                  ║ │
│ (Text editor)       │  ╚════════════════════════════════╝ │
│                     │                                     │
│                     │ [Copiar para Clipboard]            │
├─────────────────────┴─────────────────────────────────────┤
│ [← Descartar]         [Salvar Template ▶]                 │
└─────────────────────────────────────────────────────────────┘
```

### Opção B: Form-Based (Simpler, Faster)
**Pros:** Rápido de implementar, previsível  
**Cons:** Menos flexível

**Campos Estruturados:**
- Header (logo, title, company name)
- Sections: Recipient, Content, Footer
- Each section: enable/disable, text input, font options

**Mockup:**
```
┌──────────────────────────────┐
│ Template PDF - Configuração   │
├──────────────────────────────┤
│ ☑ Header                      │
│   Logo: [Choose File]          │
│   Title: [Comprovante]         │
│   Company: [ACME Corp]         │
│                                │
│ ☑ Content                      │
│   Text: [Rich Editor]          │
│                                │
│ ☑ Footer                       │
│   Terms: [Text]                │
│   Copyright: [Text]            │
│                                │
│ Preview:  [Show/Hide]         │
│ [Discard]  [Save Template]    │
└──────────────────────────────┘
```

**Recomendação:** Form-Based (menos overhead, fácil QA, boa experiência DP)

---

## 3.2 Interface para Feature 2: Mensagens WhatsApp

### Layout: Manager Dashboard

```
┌─────────────────────────────────────────────────────┐
│ WhatsApp Messages - Gerenciador                      │
├─────────────────────────────────────────────────────┤
│                                                      │
│ [+ Nova Mensagem]                                    │
│                                                      │
│ Filtro: [Categoria ▼] [Status ▼]                   │
│                                                      │
│ ┌──────────────────────────────────────────────────┐│
│ │ Categoria         │ Nome            │ Status     ││
│ ├──────────────────────────────────────────────────┤│
│ │ BOAS_VINDAS      │ Welcome Msg      │ ✓ Ativo   ││
│ │ LEMBRETE         │ Reminder Sign    │ ✓ Ativo   ││
│ │ CONFIRMACAO      │ Confirmation     │ ✗ Inativo ││
│ │ ERRO             │ Error Msg        │ ✓ Ativo   ││
│ └──────────────────────────────────────────────────┘│
│   Ações: [Editar] [Duplicar] [Deletar] [Preview]    │
│                                                      │
└─────────────────────────────────────────────────────┘
```

### Modal: Editar Mensagem

```
┌──────────────────────────────────┐
│ Editar: Mensagem de Boas-vindas   │
├──────────────────────────────────┤
│                                  │
│ Nome Display:                    │
│ [Mensagem de Boas-vindas     ]  │
│                                  │
│ Categoria: [BOAS_VINDAS ▼]      │
│                                  │
│ Conteúdo:                        │
│ ┌────────────────────────────┐  │
│ │Olá {{NOME}}! 👋           │  │
│ │Bem-vindo ao nosso app.    │  │
│ │                            │  │
│ │Clique aqui para assinar:  │  │
│ │{{MAGIC_LINK}}             │  │
│ └────────────────────────────┘  │
│ [140/160 chars]                 │
│                                  │
│ Variáveis Disponíveis:           │
│ {{NOME}} {{CPF}} {{EMPRESA}}    │
│ {{VALOR}} {{DATA}} {{MAGIC_LINK}}│
│                                  │
│ ☑ Status: Ativo                  │
│                                  │
│ [Preview] [Cancelar] [Salvar]   │
└──────────────────────────────────┘
```

### Preview Modal

```
┌─────────────────────────────────────┐
│ Preview: Como DP receberá           │
├─────────────────────────────────────┤
│                                     │
│ 📱 WhatsApp Message                │
│                                     │
│ Olá João Silva! 👋                 │
│ Bem-vindo ao nosso app.             │
│                                     │
│ Clique aqui para assinar:           │
│ https://app.greenh.../magic/xyz... │
│                                     │
│ ✓ Looks good!                       │
│                                     │
│ [Close] [Use Template Values]      │
└─────────────────────────────────────┘
```

---

## 3.3 Interface para Feature 3: Download em Massa

### Receipts Dashboard (com seleção múltipla)

```
┌──────────────────────────────────────────────────────────────┐
│ Dashboard: Recibos                                            │
├──────────────────────────────────────────────────────────────┤
│                                                              │
│ Filtro: [Status ▼] [Data ▼]  [🔍 Buscar...]              │
│                                                              │
│ [Selecionar Todos (página)] [Limpar Seleção]               │
│                                                              │
│ ┌────────────────────────────────────────────────────────┐ │
│ │☐ │ Nome        │ CPF     │ Status │ Data      │ Ação  │ │
│ ├────────────────────────────────────────────────────────┤ │
│ │☑ │ João Silva  │ 123.456 │ ✓ Asin │ 27/03    │ Baixar│ │
│ │☑ │ Maria Santos│ 234.567 │ ✓ Asin │ 27/03    │ Baixar│ │
│ │☐ │ Pedro Oliveira│234.567 │ ⏳ Pend │ 27/03    │ -     │ │
│ │☑ │ Ana Costa   │ 345.678 │ ✓ Asin │ 26/03    │ Baixar│ │
│ │                                                          │ │
│ └────────────────────────────────────────────────────────┘ │
│                                                              │
│ Selecionados: 3 de 20                                       │
│                                                              │
│ ┌─────────────────────────────────────────────────────────┐│
│ │ [Cancelar]          [⬇️ Download Massa]                ││
│ │                     (habilitado apenas com seleção > 0) ││
│ └─────────────────────────────────────────────────────────┘│
│                                                              │
│ Página 1 de 4  [◀] [1] [2] [3] [4] [▶]                    │
└──────────────────────────────────────────────────────────────┘
```

### Download Feedback

```
Click "Download Massa" → Estados:

[Estado 1: Loading]
┌──────────────────────────┐
│ 🔄 Preparando download...│
│ Processando 3 recibos    │
│ [████░░░░░░] 40%        │
└──────────────────────────┘

[Estado 2: Success]
┌──────────────────────────┐
│ ✓ Download iniciado!      │
│ recibos-2026-03-27.zip   │
│ 2.3 MB                    │
│ [Fechar]                 │
└──────────────────────────┘

[Estado 3: Error]
┌──────────────────────────┐
│ ✗ Erro ao processador    │
│ Um ou mais recibos não   │
│ estão assinados.         │
│ [Tentar Novamente]       │
└──────────────────────────┘
```

---

## 3.4 Princípios de Design

### Para F1, F2, F3:
- **Consistência:** Usar componentes de UI existentes (Tailwind)
- **Feedback:** Toast/modal para cada ação (save, delete, error)
- **Acessibilidade:** ARIA labels, keyboard navigation
- **Performance:** Lazy load tabelas grandes (React Virtualization se > 1000 rows)
- **Mobile-first:** Responsivo (apesar de ser interno, DP pode acessar mobile)

---

---

# 💻 PERSPECTIVA 4: DEVELOPER (Amelia)

## 4.1 Stack Técnico e Bibliotecas

### Dependências a Adicionar

```json
{
  "dependencies": {
    "jszip": "^3.10.1",           // F3: Zipar PDFs
    "react-quill": "^2.0.0",      // F1: WYSIWYG (ou tiptap) → Inicialmente Form-based
    "react-copy-to-clipboard": "^5.1.0",  // F4: Copiar link para clipboard
    "zod": "^3.22.4"              // Validação schema
  }
}
```

**Instalação:**
```bash
npm install jszip react-copy-to-clipboard zod
npm install -D @types/jszip
```

---

## 4.2 Implementação: F3 + F4 (MVP α)

### 4.2.1 Database Migration

```typescript
// prisma/migrations/[timestamp]_add_magic_link_permanent/migration.sql
ALTER TABLE "Receipt" ADD COLUMN "magicLinkPermanent" BOOLEAN NOT NULL DEFAULT false;
```

**Prisma Schema Update:**
```prisma
model Receipt {
  // ... existing fields ...
  magicLinkToken      String?
  magicLinkExpiresAt  DateTime?
  magicLinkPermanent  Boolean   @default(false)  // NEW: F4 support
  
  // Audit
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  
  @@index([magicLinkToken])
  @@index([status])
}

// NEW: Auditoria de Magic Link Access
model MagicLinkAudit {
  id        String   @id @default(uuid())
  receiptId String
  userId    String?  // DP que obteve o link
  action    String   // "LINK_OBTAINED", "LINK_COPIED", "LINK_ACCESSED"
  ipAddress String?
  createdAt DateTime @default(now())
  
  @@index([receiptId])
  @@index([action])
  @@index([createdAt])
}
```

---

### 4.2.2 API Endpoints

#### **F3: POST /api/download/bulk**

```typescript
// src/app/api/download/bulk/route.ts
import { auth } from '@/lib/auth';
import JSZip from 'jszip';
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/prisma';
import { logAudit } from '@/lib/audit';

const MAX_RECEIPTS_PER_DOWNLOAD = 100;

export async function POST(req: NextRequest) {
  try {
    // 1. Autenticação e RBAC
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!['ADMIN', 'DP_MANAGER'].includes(session.user.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // 2. Validação de Input
    const { receiptIds } = await req.json();
    
    if (!Array.isArray(receiptIds) || receiptIds.length === 0) {
      return NextResponse.json(
        { error: 'receiptIds deve ser array não-vazio' },
        { status: 400 }
      );
    }

    if (receiptIds.length > MAX_RECEIPTS_PER_DOWNLOAD) {
      return NextResponse.json(
        { error: `Máximo ${MAX_RECEIPTS_PER_DOWNLOAD} recibos por vez` },
        { status: 400 }
      );
    }

    // 3. Buscar Recibos (apenas ASSINADO)
    const receipts = await db.receipt.findMany({
      where: {
        id: { in: receiptIds },
        status: 'ASSINADO'
      }
    });

    if (receipts.length === 0) {
      return NextResponse.json(
        { error: 'Nenhum recibo assinado encontrado' },
        { status: 400 }
      );
    }

    if (receipts.length !== receiptIds.length) {
      const invalidIds = receiptIds.filter(
        id => !receipts.find(r => r.id === id)
      );
      console.warn('Recibos não-assinados ignorados:', invalidIds);
    }

    // 4. Gerar PDFs em paralelo
    const pdfPromises = receipts.map(receipt =>
      getPdfBinary(receipt.id).catch(err => {
        console.error(`Erro gerando PDF para ${receipt.id}:`, err);
        return null;
      })
    );

    const pdfs = await Promise.all(pdfPromises);
    const validPdfs = pdfs.filter((pdf): pdf is Buffer => pdf !== null);

    if (validPdfs.length === 0) {
      return NextResponse.json(
        { error: 'Erro ao gerar PDFs' },
        { status: 500 }
      );
    }

    // 5. Criar ZIP
    const zip = new JSZip();
    validPdfs.forEach((pdf, idx) => {
      const receipt = receipts[idx];
      const filename = `recibo_${receipt.collaboratorName}_${receipt.id}.pdf`;
      zip.file(filename, pdf);
    });

    const blob = await zip.generateAsync({ type: 'uint8array' });

    // 6. Auditoria
    await logAudit({
      action: 'BULK_DOWNLOAD',
      userId: session.user.id,
      receiptCount: validPdfs.length,
      receiptIds: receipts.map(r => r.id)
    });

    // 7. Response
    const timestamp = new Date().toISOString().split('T')[0];
    return new NextResponse(blob, {
      headers: {
        'Content-Type': 'application/zip',
        'Content-Disposition': `attachment; filename="recibos-${timestamp}.zip"`
      }
    });

  } catch (error) {
    console.error('Erro em bulk download:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}

// Helper: Retorna PDF em bytes
async function getPdfBinary(receiptId: string): Promise<Buffer> {
  // Implementação existente ou fetch do storage
  // TODO: Implementar baseado no sistema atual
  throw new Error('Not implemented');
}
```

---

#### **F4: GET /api/receipts/{id}/magic-link**

```typescript
// src/app/api/receipts/[id]/magic-link/route.ts
import { auth } from '@/lib/auth';
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/prisma';
import { logMagicLinkAccess } from '@/lib/audit';

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // 1. Autenticação (qualquer DP logado)
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 2. Buscar Recibo
    const receipt = await db.receipt.findUnique({
      where: { id: params.id }
    });

    if (!receipt) {
      return NextResponse.json(
        { error: 'Recibo não encontrado' },
        { status: 404 }
      );
    }

    // 3. Validar Status (deve estar ENVIADO ou ASSINADO)
    if (!['ENVIADO', 'ASSINADO'].includes(receipt.status)) {
      return NextResponse.json(
        { error: 'Recibo não é elegível para obter link' },
        { status: 400 }
      );
    }

    // 4. Validar Token (não deve estar expirado, a menos que magicLinkPermanent)
    if (receipt.magicLinkToken) {
      if (!receipt.magicLinkPermanent && receipt.magicLinkExpiresAt) {
        if (new Date() > receipt.magicLinkExpiresAt) {
          return NextResponse.json(
            { error: 'Magic link expirado' },
            { status: 400 }
          );
        }
      }
    } else {
      return NextResponse.json(
        { error: 'Recibo não possui magic link gerado' },
        { status: 400 }
      );
    }

    // 5. Montar URL
    const magicLink = `${process.env.NEXT_PUBLIC_BASE_URL}/sign?token=${receipt.magicLinkToken}`;

    // 6. Auditoria
    await logMagicLinkAccess({
      action: 'MAGIC_LINK_OBTAINED',
      receiptId: receipt.id,
      userId: session.user.id,
      ipAddress: req.ip
    });

    // 7. Response
    return NextResponse.json({
      receiptId: receipt.id,
      collaboratorName: receipt.collaboratorName,
      magicLink,
      expiresAt: receipt.magicLinkExpiresAt,
      isPermanent: receipt.magicLinkPermanent
    });

  } catch (error) {
    console.error('Erro obtendo magic link:', error);
    return NextResponse.json(
      { error: 'Erro interno' },
      { status: 500 }
    );
  }
}
```

---

#### **F4: POST /api/receipts/bulk/magic-links**

```typescript
// src/app/api/receipts/bulk/magic-links/route.ts
import { auth } from '@/lib/auth';
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/prisma';
import { logMagicLinkAccess } from '@/lib/audit';

const MAX_LINKS_PER_REQUEST = 50;

export async function POST(req: NextRequest) {
  try {
    // 1. Autenticação
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 2. Validação
    const { receiptIds } = await req.json();

    if (!Array.isArray(receiptIds) || receiptIds.length === 0) {
      return NextResponse.json(
        { error: 'receiptIds deve ser array não-vazio' },
        { status: 400 }
      );
    }

    if (receiptIds.length > MAX_LINKS_PER_REQUEST) {
      return NextResponse.json(
        { error: `Máximo ${MAX_LINKS_PER_REQUEST} links por vez` },
        { status: 400 }
      );
    }

    // 3. Buscar Recibos com Magic Link Token
    const receipts = await db.receipt.findMany({
      where: {
        id: { in: receiptIds },
        magicLinkToken: { not: null },
        status: { in: ['ENVIADO', 'ASSINADO'] }
      }
    });

    if (receipts.length === 0) {
      return NextResponse.json(
        { error: 'Nenhum recibo com link válido encontrado' },
        { status: 400 }
      );
    }

    // 4. Montar Links (reutilizando tokens existentes)
    const links = receipts
      .filter(r => {
        // Skip recibos com token expirado (a menos que permanente)
        if (!r.magicLinkPermanent && r.magicLinkExpiresAt) {
          return new Date() <= r.magicLinkExpiresAt;
        }
        return true;
      })
      .map(r => ({
        receiptId: r.id,
        collaboratorName: r.collaboratorName,
        magicLink: `${process.env.NEXT_PUBLIC_BASE_URL}/sign?token=${r.magicLinkToken}`,
        expiresAt: r.magicLinkExpiresAt,
        isPermanent: r.magicLinkPermanent
      }));

    // 5. Auditoria (log para múltiplos links)
    await logMagicLinkAccess({
      action: 'MAGIC_LINKS_BULK_OBTAINED',
      receiptId: receiptIds.join(','),
      userId: session.user.id,
      ipAddress: req.ip,
      count: links.length
    });

    // 6. Response
    return NextResponse.json({
      count: links.length,
      links
    });

  } catch (error) {
    console.error('Erro obtendo links em massa:', error);
    return NextResponse.json(
      { error: 'Erro interno' },
      { status: 500 }
    );
  }
}
```

---

### 4.2.3 React Components

#### **BulkReceiptsSelector Component**

```typescript
// src/components/receipts/BulkReceiptsSelector.tsx
'use client';

import { useState } from 'react';
import { Checkbox } from '@/components/ui/checkbox';

interface Receipt {
  id: string;
  collaboratorName: string;
  cpf: string;
  status: 'DRAFT' | 'ENVIADO' | 'ASSINADO' | 'RECUSADO';
  createdAt: Date;
  companyName: string;
}

interface BulkReceiptsSelectorProps {
  receipts: Receipt[];
  onSelectionChange: (selectedIds: string[]) => void;
  maxBulkSize?: number;
}

export function BulkReceiptsSelector({
  receipts,
  onSelectionChange,
  maxBulkSize = 100
}: BulkReceiptsSelectorProps) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [selectAll, setSelectAll] = useState(false);

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      const allIds = new Set(receipts.map(r => r.id).slice(0, maxBulkSize));
      setSelectedIds(allIds);
      setSelectAll(true);
      onSelectionChange(Array.from(allIds));
    } else {
      setSelectedIds(new Set());
      setSelectAll(false);
      onSelectionChange([]);
    }
  };

  const handleSelectOne = (receiptId: string, checked: boolean) => {
    const newSelected = new Set(selectedIds);
    if (checked) {
      newSelected.add(receiptId);
    } else {
      newSelected.delete(receiptId);
      setSelectAll(false);
    }
    setSelectedIds(newSelected);
    onSelectionChange(Array.from(newSelected));
  };

  return (
    <div className="space-y-4">
      {/* Header com Selecionar Todos */}
      <div className="flex items-center justify-between px-4 py-2 bg-gray-50 border-b">
        <label className="flex items-center gap-2">
          <Checkbox
            checked={selectAll}
            onChange={(e) => handleSelectAll(e.target.checked)}
          />
          <span className="text-sm font-medium">Selecionar Todos</span>
        </label>
        <span className="text-sm text-gray-600">
          {selectedIds.size} de {receipts.length} selecionados
        </span>
      </div>

      {/* Tabela de Recibos */}
      <table className="w-full border-collapse">
        <thead>
          <tr className="bg-gray-100">
            <th className="w-10 p-2 text-left">#</th>
            <th className="p-2 text-left">Nome</th>
            <th className="p-2 text-left">CPF</th>
            <th className="p-2 text-left">Empresa</th>
            <th className="p-2 text-left">Data</th>
            <th className="p-2 text-left">Status</th>
          </tr>
        </thead>
        <tbody>
          {receipts.map(receipt => (
            <tr key={receipt.id} className="border-b hover:bg-blue-50">
              <td className="p-2">
                <Checkbox
                  checked={selectedIds.has(receipt.id)}
                  onChange={(e) => handleSelectOne(receipt.id, e.target.checked)}
                />
              </td>
              <td className="p-2">{receipt.collaboratorName}</td>
              <td className="p-2 font-mono text-sm">{receipt.cpf}</td>
              <td className="p-2 text-sm">{receipt.companyName}</td>
              <td className="p-2 text-sm">
                {new Date(receipt.createdAt).toLocaleDateString('pt-BR')}
              </td>
              <td className="p-2">
                <span
                  className={`px-2 py-1 rounded text-xs font-bold ${
                    receipt.status === 'ASSINADO'
                      ? 'bg-green-100 text-green-800'
                      : receipt.status === 'ENVIADO'
                      ? 'bg-blue-100 text-blue-800'
                      : 'bg-gray-100 text-gray-800'
                  }`}
                >
                  {receipt.status === 'ASSINADO' && '✓ Assinado'}
                  {receipt.status === 'ENVIADO' && '⏳ Enviado'}
                  {receipt.status === 'DRAFT' && '📝 Rascunho'}
                  {receipt.status === 'RECUSADO' && '✗ Recusado'}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
```

---

#### **BulkActionsBar Component**

```typescript
// src/components/receipts/BulkActionsBar.tsx
'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { MagicLinkModal } from './MagicLinkModal';

interface BulkActionsBarProps {
  selectedIds: string[];
  onDownload: () => Promise<void>;
  onGetLinks: () => Promise<{ links: Array<{ receiptId: string; collaboratorName: string; magicLink: string }> }>;
}

export function BulkActionsBar({
  selectedIds,
  onDownload,
  onGetLinks
}: BulkActionsBarProps) {
  const [isDownloading, setIsDownloading] = useState(false);
  const [isFetchingLinks, setIsFetchingLinks] = useState(false);
  const [links, setLinks] = useState<any[]>([]);
  const [showModal, setShowModal] = useState(false);

  const handleDownload = async () => {
    if (selectedIds.length === 0) {
      toast.error('Selecione pelo menos um recibo');
      return;
    }

    setIsDownloading(true);
    try {
      await onDownload();
      toast.success(`${selectedIds.length} recibos baixados!`);
    } catch (error) {
      toast.error('Erro ao baixar recibos');
      console.error(error);
    } finally {
      setIsDownloading(false);
    }
  };

  const handleGetLinks = async () => {
    if (selectedIds.length === 0) {
      toast.error('Selecione pelo menos um recibo');
      return;
    }

    setIsFetchingLinks(true);
    try {
      const result = await onGetLinks();
      setLinks(result.links);
      setShowModal(true);
      toast.success(`${result.links.length} links obtidos!`);
    } catch (error) {
      toast.error('Erro ao obter links');
      console.error(error);
    } finally {
      setIsFetchingLinks(false);
    }
  };

  const isDisabled = selectedIds.length === 0;

  return (
    <>
      <div className="flex gap-2 items-center justify-between p-4 bg-blue-50 border-t">
        <span className="text-sm font-medium">
          {selectedIds.length} recibo(s) selecionado(s)
        </span>
        <div className="flex gap-2">
          <Button
            onClick={handleDownload}
            disabled={isDisabled || isDownloading}
            variant="primary"
            className="flex items-center gap-2"
          >
            {isDownloading ? '⏳' : '⬇️'} Download Massa
          </Button>
          <Button
            onClick={handleGetLinks}
            disabled={isDisabled || isFetchingLinks}
            variant="secondary"
          >
            {isFetchingLinks ? '⏳' : '🔗'} Obter Links
          </Button>
        </div>
      </div>

      {showModal && (
        <MagicLinkModal
          links={links}
          onClose={() => setShowModal(false)}
        />
      )}
    </>
  );
}
```

---

#### **MagicLinkModal Component**

```typescript
// src/components/receipts/MagicLinkModal.tsx
'use client';

import { useState } from 'react';
import CopyToClipboard from 'react-copy-to-clipboard';
import { toast } from 'sonner';

interface MagicLinkModalProps {
  links: Array<{
    receiptId: string;
    collaboratorName: string;
    magicLink: string;
  }>;
  onClose: () => void;
}

export function MagicLinkModal({ links, onClose }: MagicLinkModalProps) {
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const handleCopyOne = (link: string, id: string) => {
    setCopiedId(id);
    toast.success('Link copiado! 📋');
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleCopyAll = () => {
    const text = links
      .map(l => `${l.collaboratorName}: ${l.magicLink}`)
      .join('\n');
    
    navigator.clipboard.writeText(text);
    toast.success('Todos os links copiados! 📋');
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-lg max-w-2xl w-full max-h-[80vh] overflow-auto">
        {/* Header */}
        <div className="sticky top-0 bg-gray-100 p-4 border-b flex justify-between items-center">
          <h2 className="text-lg font-bold">🔗 Links de Assinatura</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 text-2xl"
          >
            ×
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          <p className="text-gray-600">
            Copie os links abaixo para enviar manualmente:
          </p>

          {links.map((link) => (
            <div
              key={link.receiptId}
              className="p-4 bg-gray-50 rounded border border-gray-200"
            >
              <div className="font-medium mb-2 text-sm">
                {link.collaboratorName}
              </div>
              <div className="flex gap-2 items-center">
                <input
                  type="text"
                  readOnly
                  value={link.magicLink}
                  className="flex-1 p-2 bg-white border border-gray-300 rounded font-mono text-xs px-3"
                />
                <CopyToClipboard
                  text={link.magicLink}
                  onCopy={() => handleCopyOne(link.magicLink, link.receiptId)}
                >
                  <button
                    className={`px-4 py-2 rounded font-medium transition-colors ${
                      copiedId === link.receiptId
                        ? 'bg-green-500 text-white'
                        : 'bg-blue-500 text-white hover:bg-blue-600'
                    }`}
                  >
                    {copiedId === link.receiptId ? '✓ Copiado!' : 'Copiar'}
                  </button>
                </CopyToClipboard>
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-gray-100 p-4 border-t flex gap-2 justify-end">
          <button
            onClick={handleCopyAll}
            className="px-4 py-2 bg-green-500 text-white rounded font-medium hover:bg-green-600"
          >
            📋 Copiar Todos
          </button>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-400 text-white rounded font-medium hover:bg-gray-500"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
}
```

---

## 4.3 API Client Helper

```typescript
// src/lib/api/downloads.ts
export async function bulkDownloadReceipts(receiptIds: string[]): Promise<void> {
  const response = await fetch('/api/download/bulk', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ receiptIds })
  });

  if (!response.ok) {
    throw new Error(`Download failed: ${response.statusText}`);
  }

  const blob = await response.blob();
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `recibos-${new Date().toISOString().split('T')[0]}.zip`;
  document.body.appendChild(a);
  a.click();
  window.URL.revokeObjectURL(url);
  document.body.removeChild(a);
}

export async function getOrMoreMagicLinks(receiptIds: string[]) {
  const response = await fetch('/api/receipts/bulk/magic-links', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ receiptIds })
  });

  if (!response.ok) {
    throw new Error(`Failed to get links: ${response.statusText}`);
  }

  return response.json();
}

export async function getSingleMagicLink(receiptId: string) {
  const response = await fetch(`/api/receipts/${receiptId}/magic-link`);

  if (!response.ok) {
    throw new Error(`Failed to get link: ${response.statusText}`);
  }

  return response.json();
}
```

---

## 4.4 Auditoria Helper

```typescript
// src/lib/audit.ts
import { db } from '@/lib/prisma';

interface AuditLogParams {
  action: string;
  userId: string;
  receiptId?: string;
  receiptIds?: string[];
  receiptCount?: number;
  ipAddress?: string;
  [key: string]: any;
}

export async function logAudit(params: AuditLogParams) {
  try {
    // Salvar em tabela de auditoria (criar se não existir)
    // Para MVP, pode salvar em logs ou banco de dados
    console.log('[AUDIT]', {
      timestamp: new Date().toISOString(),
      ...params
    });

    // TODO: Implementar persistência em DB
    // await db.auditLog.create({ data: params });
  } catch (error) {
    console.error('Erro ao logar auditoria:', error);
  }
}

export async function logMagicLinkAccess(params: any) {
  // Especializado para magic link
  await logAudit({
    ...params,
    category: 'MAGIC_LINK'
  });
}
```

---

## 4.5 Integração no Dashboard

```typescript
// src/app/admin/dashboard/page.tsx (ou receipts/page.tsx)
'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { BulkReceiptsSelector } from '@/components/receipts/BulkReceiptsSelector';
import { BulkActionsBar } from '@/components/receipts/BulkActionsBar';
import { bulkDownloadReceipts, getOrMoreMagicLinks } from '@/lib/api/downloads';

async function fetchReceipts() {
  const res = await fetch('/api/receipts?limit=50');
  if (!res.ok) throw new Error('Failed to fetch');
  return res.json();
}

export default function DashboardPage() {
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const { data: receipts = [], isLoading } = useQuery({
    queryKey: ['receipts'],
    queryFn: fetchReceipts
  });

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Recibos</h1>

      {isLoading ? (
        <div>Loading...</div>
      ) : (
        <>
          <BulkReceiptsSelector
            receipts={receipts}
            onSelectionChange={setSelectedIds}
          />
          <BulkActionsBar
            selectedIds={selectedIds}
            onDownload={() => bulkDownloadReceipts(selectedIds)}
            onGetLinks={() => getOrMoreMagicLinks(selectedIds)}
          />
        </>
      )}
    </div>
  );
}
```

---



## 4.2 Estrutura de Projeto (detalhado)

```
src/
├── app/
│   ├── api/
│   │   ├── admin/
│   │   │   ├── templates/
│   │   │   │   ├── pdf/
│   │   │   │   │   ├── route.ts
│   │   │   │   │   │   // GET:  list templates
│   │   │   │   │   │   // POST: create template
│   │   │   │   │   │
│   │   │   │   │   └── [id]/
│   │   │   │   │       └── route.ts
│   │   │   │   │           // GET:    fetch specific
│   │   │   │   │           // PUT:    update
│   │   │   │   │           // DELETE: remove  
│   │   │   │   │
│   │   │   │   └── whatsapp/
│   │   │   │       ├── route.ts
│   │   │   │       │   // GET:  list messages
│   │   │   │       │   // POST: create message
│   │   │   │       │
│   │   │   │       └── [id]/
│   │   │   │           └── route.ts
│   │   │   │               // GET, PUT, DELETE
│   │   │   │
│   │   │   └── settings/    (existing)
│   │   │
│   │   └── download/
│   │       └── bulk/
│   │           └── route.ts
│   │               // POST: initiate bulk zip + download
│   │
│   ├── admin/
│   │   ├── settings/
│   │   │   ├── page.tsx         (existing)
│   │   │   └── templates/       (new)
│   │   │       ├── page.tsx     // Main templates dashboard
│   │   │       ├── pdf-editor.tsx
│   │   │       ├── whatsapp-editor.tsx
│   │   │       └── components/
│   │   │           ├── TemplateSelector.tsx
│   │   │           ├── EditorModal.tsx
│   │   │           └── PreviewPane.tsx
│   │   │
│   │   ├── receipts/          (or existing receipts view)
│   │   │   ├── page.tsx
│   │   │   └── components/
│   │   │       └── BulkDownloadSection.tsx
│   │   │
│   │   └── dashboard/ (existing)
│   │
│   ├── api-sdk/                (client API helpers)
│   │   ├── templates.ts        // API calls for F1, F2
│   │   ├── downloads.ts        // API calls for F3
│   │   └── index.ts
│   │
│   └── types/
│       ├── index.ts            (existing)
│       ├── templates.ts        (new)
│       ├── whatsapp.ts         (new)
│       └── validation.ts       (new: Zod schemas)
│
├── lib/
│   ├── auth.ts                 (enhance)
│   ├── db.ts                   (existing)
│   ├── pdf.ts                  (enhance: use DB template)
│   ├── whatsapp.ts             (enhance: use DB message)
│   ├── prisma.ts               (existing)
│   ├── templates.ts            (new: template logic)
│   ├── validators/             (new)
│   │   ├── pdf-template.ts
│   │   ├── whatsapp-template.ts
│   │   └── index.ts
│   └── services/               (new: business logic)
│       ├── PdfTemplateService.ts
│       ├── WhatsAppTemplateService.ts
│       └── BulkDownloadService.ts
│
└── constants/
    └── templates.ts            (new: default templates)
```

---

## 4.3 Implementação Detalhada

### FEATURE 1: API Route - GET Templates
**File:** `src/app/api/admin/templates/pdf/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET(req: NextRequest) {
  // 1. Auth
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // 2. Role check
  if (!['ADMIN', 'DP_MANAGER'].includes(session.user.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    // 3. Fetch templates
    const templates = await prisma.pdfTemplate.findMany({
      where: { isActive: true },
      select: {
        id: true,
        name: true,
        description: true,
        version: true,
        updatedAt: true,
        lastModifiedBy: true,
      },
      orderBy: { updatedAt: 'desc' },
    });

    return NextResponse.json({ data: templates }, { status: 200 });
  } catch (error) {
    console.error('Error fetching templates:', error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  // Similar auth, role check
  const session = await getServerSession(authOptions);
  if (!['ADMIN', 'DP_MANAGER'].includes(session.user?.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    const body = await req.json();

    // Validate input
    const schema = PdfTemplateCreateSchema; // from zod
    const validated = schema.parse(body);

    // Create template
    const template = await prisma.pdfTemplate.create({
      data: {
        name: validated.name,
        description: validated.description,
        content: validated.content,
        createdBy: session.user.id,
      },
    });

    // Log audit
    await logAudit('PDF_TEMPLATE_CREATED', session.user.id, template.id);

    return NextResponse.json({ data: template }, { status: 201 });
  } catch (error) {
    console.error('Error creating template:', error);
    return NextResponse.json(
      { error: 'Invalid input' },
      { status: 400 }
    );
  }
}
```

---

### FEATURE 1: API Route - PUT (Update)
**File:** `src/app/api/admin/templates/pdf/[id]/route.ts`

```typescript
export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!['ADMIN', 'DP_MANAGER'].includes(session.user?.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    const body = await req.json();
    const schema = PdfTemplateUpdateSchema;
    const validated = schema.parse(body);

    // Fetch old template (for history)
    const oldTemplate = await prisma.pdfTemplate.findUnique({
      where: { id: params.id },
    });

    if (!oldTemplate) {
      return NextResponse.json({ error: 'Not Found' }, { status: 404 });
    }

    // Update template
    const updated = await prisma.pdfTemplate.update({
      where: { id: params.id },
      data: {
        ...validated,
        version: oldTemplate.version + 1,
        lastModifiedBy: session.user.id,
        updatedAt: new Date(),
      },
    });

    // Create history entry
    await prisma.pdfTemplateHistory.create({
      data: {
        templateId: params.id,
        version: oldTemplate.version,
        content: oldTemplate.content,
        changedBy: session.user.id,
        changes: JSON.stringify({
          before: oldTemplate,
          after: updated,
        }),
      },
    });

    // Log audit
    await logAudit('PDF_TEMPLATE_UPDATED', session.user.id, params.id);

    return NextResponse.json({ data: updated }, { status: 200 });
  } catch (error) {
    return NextResponse.json({ error: 'Invalid input' }, { status: 400 });
  }
}
```

---

### FEATURE 2: Service - WhatsApp Messages

**File:** `src/lib/services/WhatsAppTemplateService.ts`

```typescript
import { prisma } from '@/lib/prisma';

export class WhatsAppTemplateService {
  // Get all templates
  static async getAllTemplates() {
    return await prisma.whatsAppTemplate.findMany({
      where: { isActive: true },
      orderBy: { category: 'asc' },
    });
  }

  // Get template by ID
  static async getTemplate(id: string) {
    return await prisma.whatsAppTemplate.findUnique({ where: { id } });
  }

  // Interpolate variables
  static interpolateVariables(
    template: string,
    data: Record<string, string>
  ): string {
    let result = template;
    Object.entries(data).forEach(([key, value]) => {
      result = result.replace(new RegExp(`{{${key}}}`, 'g'), value || '');
    });
    return result;
  }

  // Validate template (check for invalid variables)
  static validateTemplate(template: string): { valid: boolean; error?: string } {
    const allowedVars = ['NOME', 'CPF', 'EMPRESA', 'VALOR', 'DATA', 'MAGIC_LINK'];
    const regex = /{{([A-Z_]+)}}/g;
    let match;

    while ((match = regex.exec(template)) !== null) {
      if (!allowedVars.includes(match[1])) {
        return {
          valid: false,
          error: `Invalid variable: {{${match[1]}}}. Allowed: ${allowedVars.join(', ')}`,
        };
      }
    }

    return { valid: true };
  }

  // Update template
  static async updateTemplate(
    id: string,
    data: Partial<WhatsAppTemplate>,
    userId: string
  ) {
    // Validate content
    const validation = this.validateTemplate(data.content || '');
    if (!validation.valid) throw new Error(validation.error);

    // Update
    const template = await prisma.whatsAppTemplate.update({
      where: { id },
      data: {
        ...data,
        lastModifiedBy: userId,
        updatedAt: new Date(),
      },
    });

    // Log audit
    await logAudit('WHATSAPP_TEMPLATE_UPDATED', userId, id, {
      fieldChanged: Object.keys(data),
    });

    return template;
  }
}
```

---

### FEATURE 3: Service - Bulk Download

**File:** `src/lib/services/BulkDownloadService.ts`

```typescript
import JSZip from 'jszip';
import { prisma } from '@/lib/prisma';
import { getPdfBinary } from '@/lib/pdf';

export class BulkDownloadService {
  static readonly MAX_FILES = 100;
  static readonly BATCH_SIZE = 10;

  // Validate receipt IDs
  static async validateReceiptIds(
    receiptIds: string[]
  ): Promise<{ valid: boolean; error?: string; invalidIds?: string[] }> {
    if (receiptIds.length === 0) {
      return { valid: false, error: 'No receipts selected' };
    }

    if (receiptIds.length > this.MAX_FILES) {
      return { valid: false, error: `Maximum ${this.MAX_FILES} files allowed` };
    }

    // Check all receipts exist and are signed
    const receipts = await prisma.receipt.findMany({
      where: { id: { in: receiptIds } },
      select: { id: true, status: true },
    });

    const foundIds = new Set(receipts.map(r => r.id));
    const invalidIds = receiptIds.filter(id => !foundIds.has(id));

    const unsignedIds = receipts
      .filter(r => r.status !== 'ASSINADO')
      .map(r => r.id);

    if (invalidIds.length > 0 || unsignedIds.length > 0) {
      return {
        valid: false,
        error: 'Some receipts are not available for download',
        invalidIds: [...invalidIds, ...unsignedIds],
      };
    }

    return { valid: true };
  }

  // Generate ZIP
  static async generateZip(receiptIds: string[]): Promise<Uint8Array> {
    const zip = new JSZip();

    // Process in batches to avoid memory overload
    for (let i = 0; i < receiptIds.length; i += this.BATCH_SIZE) {
      const batch = receiptIds.slice(i, i + this.BATCH_SIZE);

      // Fetch PDFs in parallel
      const pdfPromises = batch.map(id =>
        getPdfBinary(id)
          .then(pdf => ({ id, pdf, error: null }))
          .catch(error => ({ id, pdf: null, error: error.message }))
      );

      const results = await Promise.all(pdfPromises);

      // Add to ZIP
      results.forEach(({ id, pdf, error }) => {
        if (pdf && !error) {
          zip.file(`recibo_${id}.pdf`, pdf);
        }
      });
    }

    const blob = await zip.generateAsync({ type: 'arraybuffer' });
    return new Uint8Array(blob);
  }

  // Generate filename
  static generateZipFilename(): string {
    const now = new Date();
    const formatted = now
      .toISOString()
      .replace(/[T:.]/g, '-')
      .split('-')
      .slice(0, 3)
      .join('-'); // YYYY-MM-DD

    return `recibos_${formatted}_${Date.now()}.zip`;
  }
}
```

---

### FEATURE 3: API Route - Bulk Download

**File:** `src/app/api/download/bulk/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { prisma } from '@/lib/prisma';
import { BulkDownloadService } from '@/lib/services/BulkDownloadService';

export async function POST(req: NextRequest) {
  // Auth + Role
  const session = await getServerSession(authOptions);
  if (!['ADMIN', 'DP_MANAGER'].includes(session.user?.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    const body = await req.json();
    const { receiptIds } = body;

    // Validate
    const validation = await BulkDownloadService.validateReceiptIds(receiptIds);
    if (!validation.valid) {
      return NextResponse.json(
        { error: validation.error, invalidIds: validation.invalidIds },
        { status: 400 }
      );
    }

    // Rate limit check (pseudo-code)
    await checkRateLimit(session.user.id, 5); // 5 downloads per minute

    // Generate ZIP
    const zipData = await BulkDownloadService.generateZip(receiptIds);
    const filename = BulkDownloadService.generateZipFilename();

    // Log
    await logAudit('BULK_DOWNLOAD', session.user.id, {
      count: receiptIds.length,
      filename,
    });

    // Return
    return new NextResponse(zipData, {
      status: 200,
      headers: {
        'Content-Type': 'application/zip',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Content-Length': zipData.length.toString(),
      },
    });
  } catch (error) {
    console.error('Bulk download error:', error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}
```

---

### FEATURE 1: Update existing lib/pdf.ts

**Enhancement:** Usar template do DB ao invés de hardcoded

```typescript
// src/lib/pdf.ts (existing, enhance)

import { prisma } from '@/lib/prisma';

export async function generateReceiptPDF(data: any): Promise<Uint8Array> {
  // 1. Fetch active template from DB
  const template = await prisma.pdfTemplate.findFirst({
    where: { isActive: true },
  });

  // 2. Merge template content with receipt data
  const templateContent = template?.content || DEFAULT_TEMPLATE_CONTENT;

  // 3. Generate PDF using templateContent
  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage([595.28, 420.94]);

  // ... render template with data ...

  return pdfDoc.save();
}

const DEFAULT_TEMPLATE_CONTENT = {
  // fallback default template
  header: 'Comprovante de Rendimentos',
  footer: 'Documento válido apenas com assinatura digital',
};
```

---

### FEATURE 2: Update existing lib/whatsapp.ts

**Enhancement:** Usar template do DB

```typescript
// src/lib/whatsapp.ts (existing, enhance)

export async function sendWhatsAppMessage(
  phone: string,
  templateName: string,  // instead of full text
  data: Record<string, string>
) {
  // 1. Fetch template by name
  const template = await prisma.whatsAppTemplate.findUnique({
    where: { name: templateName },
  });

  if (!template || !template.isActive) {
    throw new Error(`Template '${templateName}' not found`);
  }

  // 2. Interpolate variables
  const text = WhatsAppTemplateService.interpolateVariables(
    template.content,
    data
  );

  // 3. Send via Evolution API
  const response = await fetch(`${SERVER_URL}/message/sendText/${INSTANCE_NAME}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': GLOBAL_KEY,
    },
    body: JSON.stringify({
      number: phone.replace(/\D/g, ''),
      options: { delay: 1500, presence: 'composing' },
      text: text,
    }),
  });

  return response.ok;
}
```

---

## 4.4 Validation Schemas (Zod)

**File:** `src/app/types/validation.ts`

```typescript
import { z } from 'zod';

// Feature 1: PDF Templates
export const PdfTemplateCreateSchema = z.object({
  name: z.string().min(3).max(255).unique(), // would need custom unique check
  description: z.string().optional(),
  content: z.record(z.any()).default({}),
});

export const PdfTemplateUpdateSchema = PdfTemplateCreateSchema.partial();

// Feature 2: WhatsApp Messages
export const WhatsAppTemplateCreateSchema = z.object({
  name: z.string().min(3).max(50),
  displayName: z.string().min(3).max(100),
  content: z
    .string()
    .min(10)
    .max(300)
    .refine(
      (val) => WhatsAppTemplateService.validateTemplate(val).valid,
      'Invalid template variables'
    ),
  category: z.enum(['BOAS_VINDAS', 'LEMBRETE', 'CONFIRMACAO', 'ERRO']),
  isActive: z.boolean().default(true),
});

export const WhatsAppTemplateUpdateSchema = WhatsAppTemplateCreateSchema.partial();

// Feature 3: Bulk Download
export const BulkDownloadSchema = z.object({
  receiptIds: z.array(z.string().uuid()).min(1).max(100),
});
```

---

## 4.5 Frontend Components Example

### Component: PDF Template Selector
**File:** `src/app/admin/settings/templates/components/TemplateSelector.tsx`

```typescript
'use client';

import { useEffect, useState } from 'react';
import type { PdfTemplate } from '@/types';

export function TemplateSelector() {
  const [templates, setTemplates] = useState<PdfTemplate[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/admin/templates/pdf')
      .then(r => r.json())
      .then(d => setTemplates(d.data))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div>Loading...</div>;

  return (
    <div>
      <h2>PDF Templates</h2>
      <ul>
        {templates.map(t => (
          <li key={t.id}>
            <span>{t.name}</span>
            <button onClick={() => editTemplate(t.id)}>Edit</button>
            <button onClick={() => duplicateTemplate(t.id)}>Duplicate</button>
          </li>
        ))}
      </ul>
    </div>
  );
}
```

---

---

# 🧪 PERSPECTIVA 5: QA (Quinn)

## 5.1 Estratégia de Testes

### Test Pyramid

```
         △
        / \       E2E (5-10%)
       /   \      - Critical user flows
      /─────\     - No mock, real browser
     /       \
    /─────────\   Integration (20-30%)
   /           \  - API + DB
  /─────────────\ - Service logic
 /               \
/─────────────────\
   Unit (60-70%)   - Functions, utils
```

---

## 5.2 Matriz de Testes por Feature

### FEATURE 1: Template PDF

| Tipo | Cenário | Status | Prioridade |
|------|---------|--------|-----------|
| **Unit** | PdfTemplate schema validation | ❌ TODO | ALTA |
| **Unit** | generateReceiptPDF com template | ❌ TODO | ALTA |
| **Unit** | sanitizePdfContent (XSS prevention) | ❌ TODO | ALTA |
| **Integration** | GET /api/admin/templates/pdf (auth) | ❌ TODO | ALTA |
| **Integration** | PUT /api/admin/templates/pdf/[id] (RBAC) | ❌ TODO | ALTA |
| **Integration** | PdfTemplateHistory creation on update | ❌ TODO | MÉDIA |
| **E2E** | DP edita template → save → preview | ❌ TODO | ALTA |
| **E2E** | USER sem permissão tenta editar → Forbidden | ❌ TODO | ALTA |
| **Edge Case** | Template com {{INVALID_VAR}} | ❌ TODO | MÉDIA |
| **Performance** | Template > 1MB rejected | ❌ TODO | BAIXA |

---

### FEATURE 2: Mensagens WhatsApp

| Tipo | Cenário | Status | Prioridade |
|------|---------|--------|-----------|
| **Unit** | WhatsAppTemplateService.interpolateVariables | ❌ TODO | ALTA |
| **Unit** | WhatsAppTemplateService.validateTemplate | ❌ TODO | ALTA |
| **Unit** | Whitelist variables enforcement | ❌ TODO | ALTA |
| **Integration** | GET /api/admin/templates/whatsapp | ❌ TODO | ALTA |
| **Integration** | PUT /api/admin/templates/whatsapp/[id] | ❌ TODO | MÉDIA |
| **Integration** | Invalid variable rejected | ❌ TODO | MÉDIA |
| **Integration** | Audit log created on change | ❌ TODO | MÉDIA |
| **E2E** | DP edita mensagem → preview → save | ❌ TODO | ALTA |
| **E2E** | Message sent via WhatsApp with variables | ❌ TODO | ALTA |
| **Edge Case** | Empty content rejected | ❌ TODO | BAIXA |
| **Edge Case** | >300 chars truncated | ❌ TODO | BAIXA |

---

### FEATURE 3: Download em Massa

| Tipo | Cenário | Status | Prioridade |
|------|---------|--------|-----------|
| **Unit** | BulkDownloadService.validateReceiptIds | ❌ TODO | ALTA |
| **Unit** | generateZip (JSZip logic) | ❌ TODO | ALTA |
| **Unit** | Rate limit check | ❌ TODO | MÉDIA |
| **Integration** | POST /api/download/bulk (valid IDs) | ❌ TODO | ALTA |
| **Integration** | POST /api/download/bulk (invalid IDs) | ❌ TODO | ALTA |
| **Integration** | Audit log on bulk download | ❌ TODO | MÉDIA |
| **E2E** | DP seleciona 3 recibos → Download Massa → zip | ❌ TODO | ALTA |
| **E2E** | USER sem permissão → Forbidden | ❌ TODO | ALTA |
| **Performance** | Zip 100 files < 3s | ❌ TODO | ALTA |
| **Performance** | Memory < 500MB for 100 files | ❌ TODO | MÉDIA |
| **Edge Case** | 0 receipts selected → error | ❌ TODO | BAIXA |
| **Edge Case** | >100 receipts attempted → rejected | ❌ TODO | BAIXA |
| **Edge Case** | Non-signed receipt → excluded | ❌ TODO | ALTA |

---

### FEATURE 4: Obter Link Manual

| Tipo | Cenário | Status | Prioridade |
|------|---------|--------|-----------|
| **Unit** | LinkService.getMagicLink | ❌ TODO | ALTA |
| **Unit** | LinkService.validateReceiptStatus | ❌ TODO | ALTA |
| **Unit** | MagicLinkAudit logging | ❌ TODO | MÉDIA |
| **Integration** | GET /api/receipts/[id]/link (valid) | ❌ TODO | ALTA |
| **Integration** | GET /api/receipts/[id]/link (invalid) | ❌ TODO | ALTA |
| **Integration** | Audit log on link access | ❌ TODO | MÉDIA |
| **E2E** | DP clica "Obter Link" → modal com link | ❌ TODO | ALTA |
| **E2E** | USER sem permissão → Forbidden | ❌ TODO | ALTA |
| **E2E** | Link copiado para clipboard | ❌ TODO | ALTA |
| **Performance** | GET link response < 100ms | ❌ TODO | ALTA |
| **Edge Case** | Receipt sem magicLinkToken → error | ❌ TODO | BAIXA |
| **Edge Case** | Receipt status ≠ ENVIADO/ASSINADO → error | ❌ TODO | ALTA |
| **Edge Case** | Concurrent link access → same link returned | ❌ TODO | BAIXA |

---

## 5.3 Cenários de Erro e Edge Cases

### FEATURE 1: Template PDF

**Error Scenarios:**
1. ❌ DP tries to edit without ADMIN role → 403 Forbidden
2. ❌ Browser back/forward breaks editor state → recover state
3. ❌ Large template (>5MB) → handle gracefully, reject
4. ❌ Invalid JSON in content → validation error
5. ❌ XSS attempt in template text (e.g., `<script>`) → sanitized

**Edge Cases:**
1. ❌ First template doesn't exist → use fallback
2. ❌ Unicode/emojis in text → render correctly
3. ❌ Missing logo file → render without, no crash
4. ❌ Concurrent edits (2 users) → last-write-wins or warning
5. ❌ Revert to old version → history lookup + restore

---

### FEATURE 2: Mensagens WhatsApp

**Error Scenarios:**
1. ❌ Invalid variable e.g. {{HACK}} → rejected with message
2. ❌ Message > 320 chars → warning or truncate
3. ❌ Empty message → validation error
4. ❌ User deletes active message → error, prevent deletion

**Edge Cases:**
1. ❌ Variable not in data object → replace with empty string (safe)
2. ❌ Multiple same variables {{NOME}} {{NOME}} → both replaced
3. ❌ Database message rename conflict → unique constraint error
4. ❌ Simultaneous message send + template change → use cached version

---

### FEATURE 3: Download em Massa

**Error Scenarios:**
1. ❌ User selects 0 → button disabled
2. ❌ User selects receipt not owned by them → 403 (verify scope)
3. ❌ One receipt not signed → error, abort, show which one
4. ❌ Network timeout during zip → partial fail, retry
5. ❌ Disk full → 500 with message
6. ❌ Rate limit exceeded → 429 Too Many Requests, retry after

**Edge Cases:**
1. ❌ Empty PDF file corrupted → skip in zip, log warning
2. ❌ Concurrent bulk downloads (2 users) → separate temp files
3. ❌ Browser crashes during download → resume?
4. ❌ Receipt deleted between selection + download → skip gracefully
5. ❌ Zip filename collision → use UUID to avoid

---

### FEATURE 4: Obter Link Manual

**Error Scenarios:**
1. ❌ Receipt não existe → 404 Not Found
2. ❌ Receipt status ≠ ENVIADO/ASSINADO → 400 Bad Request
3. ❌ User sem permissão DP → 403 Forbidden
4. ❌ Receipt sem magicLinkToken → 500 Internal Error
5. ❌ Database connection fail → 500 with retry

**Edge Cases:**
1. ❌ Link acessado múltiplas vezes → same link returned
2. ❌ Receipt status muda durante acesso → validate on each call
3. ❌ Concurrent requests same receipt → same link, separate audit logs
4. ❌ Magic link expired (se aplicável) → error message
5. ❌ Unicode characters in receipt data → link encoding ok

---

## 5.4 Performance Targets

### F1: Template PDF
- ✅ GET templates list: < 200ms
- ✅ PUT template update: < 300ms
- ✅ PDF generation with template: < 500ms
- ✅ Preview render (client): < 100ms

### F2: Mensagens WhatsApp
- ✅ GET messages list: < 150ms
- ✅ Interpolate variables (1000 chars): < 10ms
- ✅ Validation (regex): < 5ms
- ✅ PUT message: < 200ms

### F3: Download em Massa
- ✅ POST validate IDs: < 100ms
- ✅ Zip 10 files: < 500ms
- ✅ Zip 50 files: < 1.5s
- ✅ Zip 100 files: < 3s
- ✅ Memory during zip: < 500MB

### F4: Obter Link Manual
- ✅ GET /api/receipts/[id]/link: < 100ms
- ✅ Modal render: < 50ms
- ✅ Clipboard copy: < 10ms
- ✅ Audit log write: < 50ms

---

## 5.5 Test Plans (Draft)

### Unit Tests Example (Vitest/Jest)

```typescript
// __tests__/lib/services/BulkDownloadService.test.ts

import { describe, it, expect } from 'vitest';
import { BulkDownloadService } from '@/lib/services/BulkDownloadService';

describe('BulkDownloadService', () => {
  describe('validateReceiptIds', () => {
    it('should reject empty array', async () => {
      const result = await BulkDownloadService.validateReceiptIds([]);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('No receipts');
    });

    it('should reject > 100 items', async () => {
      const ids = Array(101)
        .fill(null)
        .map(() => 'uuid-' + Math.random());
      const result = await BulkDownloadService.validateReceiptIds(ids);
      expect(result.valid).toBe(false);
    });

    it('should validate 50 signed receipts', async () => {
      // Mock prisma
      const result = await BulkDownloadService.validateReceiptIds([...]);
      expect(result.valid).toBe(true);
    });
  });
});
```

---

---

# 📅 PERSPECTIVA 6: SEQUÊNCIA E PRÓXIMOS PASSOS

## 6.1 Roadmap Consolidado (MVP → Full)

### **SPRINT 1-2: MVP - Feature 3 (Download em Massa)**
**Por que primeiro?** Menor complexidade, máximo impacto operacional

**Tasks:**
- [ ] DB: Create Receipt indexes (status, createdAt)
- [ ] Backend: BulkDownloadService (validation, zip logic)
- [ ] API: POST /api/download/bulk + rate limiting
- [ ] Middleware: Auth + role validation
- [ ] Frontend: Receipts dashboard + checkbox multi-select
- [ ] Frontend: "Download Massa" button + loading states
- [ ] Tests: Unit (service validation), Integration (API), E2E (flow)
- [ ] Deployment: Migration + QA approval

**Estimativa:** 8-10 story points  
**Entregáveis:** Botão "Download Massa" funcional, docs de uso

---

### **SPRINT 3-4: MVP - Feature 2 (Mensagens WhatsApp)**
**Por que segundo?** Core para operação, reusa pattern CRUD já testado

**Tasks:**
- [ ] DB: Create WhatsAppTemplate + WhatsAppTemplateHistory models
- [ ] Migration: `npx prisma migrate dev --name add_whatsapp_templates`
- [ ] Service: WhatsAppTemplateService (validation, interpolation)
- [ ] API: GET/POST/PUT/DELETE /api/admin/templates/whatsapp
- [ ] lib/whatsapp.ts: Upgrade para usar DB templates
- [ ] Frontend: Dashboard WhatsApp Messages (list + CRUD)
- [ ] Frontend: Modal editar + preview + variables help
- [ ] Tests: Unit (interpolation, validation), Integration (API), E2E
- [ ] Audit: Log all changes

**Estimativa:** 10-12 story points  
**Entregáveis:** Manager WhatsApp no admin, API funcional

---

### **SPRINT 5-6: MVP - Feature 1 (Template PDF Editável)**
**Por que por último?** Mais complexa, é "nice-to-have" mas estratégica. Aproveita padrões de F2.

**Tasks:**
- [ ] DB: Create PdfTemplate + PdfTemplateHistory models
- [ ] Migration
- [ ] Service: PdfTemplateService (rendering, validation, versioning)
- [ ] API: GET/POST/PUT/DELETE /api/admin/templates/pdf
- [ ] lib/pdf.ts: Upgrade para usar template do DB
- [ ] Frontend: Template editor (Form-based or WYSIWYG)
- [ ] Frontend: Preview pane (real-time PDF preview)
- [ ] Frontend: Version history + revert
- [ ] Tests: Unit, Integration, E2E
- [ ] Performance: Cache templates, test with large content

**Estimativa:** 12-15 story points  
**Entregáveis:** PDF Template Manager, customization working

---

## 6.2 Dependências Técnicas

```
Feature 3 (Download Massa)
  └─ JSZip lib ✓ (add to package.json)
  └─ Receipt model ✓ (já existe)
  └─ Auth middleware ✓ (existente)

Feature 4 (Obter Link Manual)
  └─ Receipt.magicLinkToken ✓ (já existe)
  └─ MagicLinkAudit model (CREATE via migration)
  └─ react-copy-to-clipboard (add to package.json)
  └─ Auth middleware ✓ (existente)

Feature 2 (Mensagens WhatsApp)
  └─ WhatsAppTemplate model (CREATE via migration)
  └─ Prisma migration (CREATE)
  └─ Zod libraries (add)
  └─ WhatsAppTemplateService (CREATE)
  └─ lib/whatsapp.ts enhancement (MODIFY)

Feature 1 (Template PDF)
  └─ PdfTemplate model (CREATE via migration)
  └─ Prisma migration (CREATE)
  └─ React-Quill OR form library (add if WYSIWYG)
  └─ PdfTemplateService (CREATE)
  └─ lib/pdf.ts enhancement (MODIFY)
```

**Critical Path:** JSZip + Prisma migrations + Zod

---

## 6.3 Dependências de Sequência

```
┌─────────────────────────────────────────────────────────┐
│ SEMANA 1-2: Setup + F3                                  │
│                                                          │
│ Tasks Paralelos:                                         │
│ • Add dependencies (JSZip, Zod)                          │
│ • Create DB migrations (PdfTemplate, WhatsAppTemplate)  │
│ • Setup auth middleware enhancement                      │
│ │                                                         │
│ • F3 Backend: BulkDownloadService                        │
│ • F3 Frontend: Receipts + checkboxes                     │
│ └→ DEPLOY F3_MVP                                         │
│                                                          │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│ SEMANA 3-4: F2                                           │
│                                                          │
│ Depende de: F3 deployment + auth patterns               │
│                                                          │
│ • F2 Service: WhatsAppTemplateService                   │
│ • F2 API: CRUD endpoints                                │
│ • F2 Frontend: Manager dashboard                        │
│ • Upgrade lib/whatsapp.ts → use DB templates           │
│ └→ DEPLOY F2_MVP                                        │
│                                                          │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│ SEMANA 5-6: F1                                           │
│                                                          │
│ Depende de: F2 patterns + migration experience          │
│                                                          │
│ • F1 Service: PdfTemplateService                        │
│ • F1 API: CRUD endpoints                                │
│ • F1 Frontend: Editor + preview                         │
│ • Upgrade lib/pdf.ts → use DB templates                │
│ • Performance tuning                                     │
│ └→ DEPLOY F1_MVP                                        │
│                                                          │
└─────────────────────────────────────────────────────────┘
```

---

## 6.4 Plano de Testes Paralelo

**Ongoing (todos os sprints):**
- ✅ Unit tests conforme código é escrito
- ✅ Integration tests para cada API route
- ✅ Manual QA em DEV/STAGING antes de PROD

**Sprint 1-2 (F3):**
- 🧪 Unit: BulkDownloadService
- 🧪 Integration: /api/download/bulk
- 🧪 E2E: Checkout → seleção recibos → download → validar ZIP

**Sprint 3-4 (F2):**
- 🧪 Unit: WhatsAppTemplateService
- 🧪 Integration: /api/admin/templates/whatsapp/*
- 🧪 E2E: Edit mensagem → save → verificar enviada com vars corretas

**Sprint 5-6 (F1):**
- 🧪 Unit: PdfTemplateService
- 🧪 Integration: /api/admin/templates/pdf/*
- 🧪 E2E: Edit template → save → gerar PDF → validar template aplicado

---

## 6.5 GO-TO-LIVE Plan

### Phase 1: Internal Testing (1 sem)
- Deploy em STAGING
- DP testa F3 com recibos de teste
- Feedback loop rápido

### Phase 2: Pilot (1-2 sem)
- Deploy em PROD com feature flags
- 1-2 departamentos DP usam F3
- Monitorar performance, erros

### Phase 3: Full Release (1 sem)
- All DP depts usam F3
- Repeat P2 para F2
- Repeat P2 para F1

### Rollback Plan:
- Feature flags off → volta ao upstream
- Migrations reversível (Prisma down)
- Logs centralizados para debugging

---

---

# 🎯 CONSOLIDAÇÃO FINAL: PLANO ÚNICO E ESTRUTURADO

## **PLANO MAESTRO: 3 FEATURES - GREENHOUSE BENEFÍCIOS**

### **OBJETIVO GERAL**
Dotar usuários DP de autonomia para gerenciar templates, mensagens e downloads em massa via dashboard intuitivo, sem alterar código do servidor.

---

### **FEATURES VALIDADAS**

| # | Feature | Prioridade | MVP | Estimativa | Status |
|---|---------|-----------|-----|-----------|--------|
| **F3** | Download em Massa (Recibos ZIP) | ⭐⭐⭐ MUST | 8-10 SP | Sprint 1-2 | ⏳ TODO |
| **F2** | Gerenciar Mensagens WhatsApp | ⭐⭐⭐ MUST | 10-12 SP | Sprint 3-4 | ⏳ TODO |
| **F1** | Editar Templates PDF | ⭐⭐ SHOULD | 12-15 SP | Sprint 5-6 | ⏳ TODO |

**Total:** ~30-37 story points = ~6-8 semanas com 1 dev fulltime (ou paralelo)

---

### **ARQUITETURA TÉCNICA**

#### **Banco de Dados (Prisma)**
```prisma
+ PdfTemplate { id, name, description, content, version, isActive, ... }
+ PdfTemplateHistory { id, templateId, version, content, changedBy, ... }
+ WhatsAppTemplate { id, name, displayName, content, category, isActive, ... }
+ WhatsAppTemplateHistory { id, templateId, version, content, changedBy, ... }
+ Enhance User { role: ADMIN | DP_MANAGER | USER }
+ Enhance Receipt { indices on (status, createdAt) }
```

#### **API Endpoints**
```
POST   /api/admin/templates/pdf              (create)
GET    /api/admin/templates/pdf              (list)
GET    /api/admin/templates/pdf/[id]         (read)
PUT    /api/admin/templates/pdf/[id]         (update + history)
DELETE /api/admin/templates/pdf/[id]         (soft delete)

POST   /api/admin/templates/whatsapp         (create)
GET    /api/admin/templates/whatsapp         (list)
GET    /api/admin/templates/whatsapp/[id]    (read)
PUT    /api/admin/templates/whatsapp/[id]    (update + audit)
DELETE /api/admin/templates/whatsapp/[id]    (delete)

POST   /api/download/bulk                    (initiate zip + download)
```

#### **Segurança**
- ✅ RBAC: apenas ADMIN + DP_MANAGER podem editar templates
- ✅ Auditoria: log todas mudanças em templates (who, what, when)
- ✅ Validação: XSS sanitization em PDF templates
- ✅ Whitelist: variáveis permitidas em mensagens ({{NOME}}, {{CPF}}, ...)
- ✅ Rate-limit: máx 5 bulk downloads/min/user
- ✅ Scope: DP só vê/edita seus próprios templates

---

### **FRONTEND**

**Estrutura de Páginas**
```
/admin/settings/templates/
├── page.tsx                    (main dashboard)
├── pdf-editor.tsx              (F1 editor component)
├── whatsapp-editor.tsx         (F2 editor component)
└── components/
    ├── TemplateSelector.tsx
    ├── EditorModal.tsx
    ├── PreviewPane.tsx
    └── VariableHelper.tsx

/admin/receipts/
├── page.tsx                    (enhanced with F3)
└── components/
    └── BulkDownloadSection.tsx
```

**Componentes Reusáveis**
- ☐ TemplateForm (form + validação)
- ☐ PreviewPane (PDF + WhatsApp preview real-time)
- ☐ HistoryBrowser (version history + revert)
- ☐ AuditLog (quem fez o quê e quando)
- ☐ CheckboxTable (multi-select com estado)
- ☐ VariableInserter (dropdown de variáveis)

---

### **SERVIÇOS & UTILIDADES**

```typescript
lib/services/
├── PdfTemplateService.ts       (F1: create, update, validate, render)
├── WhatsAppTemplateService.ts  (F2: interpolate, validate, audit)
├── BulkDownloadService.ts      (F3: validate, zip, rate limit)
└── AuditService.ts             (cross-features: log changes)

lib/validators/
├── pdf-template.ts             (Zod schemas)
├── whatsapp-template.ts        (Zod schemas)
└── bulk-download.ts            (Zod schemas)

lib/
├── auth.ts                     (enhance: role validation)
├── pdf.ts                      (enhance: use DB template)
├── whatsapp.ts                 (enhance: use DB template)
└── templates.ts                (new: template helpers)
```

---

### **DEPENDÊNCIAS A ADICIONAR**

```bash
npm install jszip zod react-quill react-copy-to-clipboard
npm install -D @types/jszip
```

---

### **ROADMAP EXECUTIVO**

#### **SPRINT 1-2: Feature 3+4 (F3+F4) - Download em Massa + Obter Link [10-12 SP]**

**Backlog:**
1. ✅ Add indexes to Receipt model (status, createdAt)
2. ✅ Create MagicLinkAudit model + migration
3. ✅ Create BulkDownloadService (validation + zip)
4. ✅ Create POST /api/download/bulk endpoint
5. ✅ Create GET /api/receipts/[id]/link endpoint (F4)
6. ✅ Create Receipts dashboard with multi-select UI
7. ✅ Frontend: "Download Massa" button + loading states
8. ✅ Frontend: "Obter Link" button per receipt + modal (F4)
9. ✅ Tests: Unit (service) + Integration (API) + E2E (flow)
10. ✅ Documentation: API docs + user guide
11. ✅ QA sign-off

**Deliverable:** Features 3+4 em PROD, DP pode baixar recibos zipados + obter links manuais

---

#### **SPRINT 3-4: Feature 2 (F2) - Mensagens WhatsApp [10-12 SP]**

**Backlog:**
1. ✅ Create PrismaDB models: WhatsAppTemplate + WhatsAppTemplateHistory
2. ✅ Migrate: `prisma migrate dev --name add_whatsapp_templates`
3. ✅ Create WhatsAppTemplateService (interpolate, validate)
4. ✅ Create CRUD endpoints: /api/admin/templates/whatsapp/*
5. ✅ Upgrade lib/whatsapp.ts para usar DB templates
6. ✅ Frontend: Dashboard gerenciador de mensagens
7. ✅ Frontend: Modal edit + preview + variable helper
8. ✅ Auditoria: log mudanças de templates
9. ✅ Tests: Unit + Integration + E2E
10. ✅ QA sign-off

**Deliverable:** Feature 2 em PROD, DP gerencia mensagens via UI

---

#### **SPRINT 5-6: Feature 1 (F1) - Templates PDF [12-15 SP]**

**Backlog:**
1. ✅ Create PrismaDB models: PdfTemplate + PdfTemplateHistory
2. ✅ Migrate
3. ✅ Create PdfTemplateService (render, validate, version)
4. ✅ Create CRUD endpoints: /api/admin/templates/pdf/*
5. ✅ Upgrade lib/pdf.ts para usar DB templates
6. ✅ Frontend: Template editor (form-based ou WYSIWYG)
7. ✅ Frontend: Preview pane (real-time PDF render)
8. ✅ Frontend: Version history + revert
9. ✅ Sanitization: XSS protection
10. ✅ Cache: templates em memória (TTL 5 min)
11. ✅ Tests: Unit + Integration + E2E
12. ✅ Performance: validate with 100+ files
13. ✅ QA sign-off

**Deliverable:** Feature 1 em PROD, DP customiza templates

---

### **MATRIZ DE TESTES**

#### **Coverage by Feature**

| Feature | Unit | Integration | E2E | Performance |
|---------|------|-------------|-----|-------------|
| **F1** | ✅ | ✅ | ✅ | ✅ (PDF gen < 500ms) |
| **F2** | ✅ | ✅ | ✅ | ✅ (var replace < 10ms) |
| **F3** | ✅ | ✅ | ✅ | ✅ (100 files zip < 3s) |

**Target Coverage:** 70% overall, 90% for critical paths

---

### **PRÓXIMAS AÇÕES (SEMANA 1)**

#### **Hoje (D+0):**
- [ ] Criar PR com esta análise
- [ ] Revisar com PM (John) + Arquiteta (Winston)
- [ ] Confirm priorização: F3 → F2 → F1

#### **D+1 a D+2 (Planejamento):**
- [ ] Quebrar cada Sprint em tasks granulares
- [ ] Estimar por task (horas)
- [ ] Assign aos devs (Amelia + support)
- [ ] Setup de branch/CI CD

#### **D+3 (Sprint 1 Kickoff):**
- [ ] Start Feature 3 development
- [ ] Setup Prisma migration scaffolding
- [ ] Create API route templates e add dependencies

---

### **RISCOS & MITIGAÇÃO**

| Risco | Impacto | Mitigação |
|-------|---------|-----------|
| Performance ZIP > 3s | MÉDIA | Batch processing, streaming, testing early |
| WYSIWYG complexity | ALTA | Start form-based, upgrade later if needed |
| Concurrent edits conflicts | BAIXA | Last-write-wins ou pessimistic locking |
| XSS in PDF templates | ALTA | Sanitize input, validate schema, code review |
| DB migration rollback issues | MÉDIA | Test migrations backwards, feature flags |
| DP learning curve (UI) | BAIXA | Onboarding docs, tooltips, sample templates |
| Link sharing abuse (F4) | MÉDIA | Audit logs, rate limiting, IP tracking |

---

### **SUCESSO DEFINIDO**

✅ **F4 Success:** DP clica "Obter Link" → modal mostra link, copia para clipboard  
✅ **F3 Success:** DP clica "Download Massa" → zip baixa em < 3s, contém PDFs corretos  
✅ **F2 Success:** DP edita mensagem → mudança refletida ao enviar WhatsApp  
✅ **F1 Success:** DP customiza template → PDF gerado com novo layout+branding  

**Métrica Global:** 0 bugs críticos em PROD, < 24h resolution para P0s

---

---

## 📋 **CHECKLIST DE IMPLEMENTAÇÃO**

**[ ] Week 1: Setup & Planning**
- [ ] Approve análise com stakeholders
- [ ] Create Jira epics/stories
- [ ] Setup branches (feature/f3-f4-bulk-download-link, etc.)
- [ ] Install dependencies (jszip, zod, react-copy-to-clipboard)

**[ ] Week 2-3: Feature 3+4 Development**
- [ ] Database: Index Receipt (status, createdAt) + MagicLinkAudit model
- [ ] Backend: BulkDownloadService + LinkService + validation
- [ ] API: POST /api/download/bulk + GET /api/receipts/[id]/link
- [ ] Frontend: Multi-select receipts + "Download Massa" + "Obter Link" buttons
- [ ] Tests: 70% coverage, E2E passing
- [ ] Deploy: STAGING → QA approval → PROD

**[ ] Week 4-5: Feature 2 Development**
- [ ] Database: WhatsAppTemplate models + migration
- [ ] Service: WhatsAppTemplateService
- [ ] API: GET/POST/PUT/DELETE endpoints
- [ ] Frontend: Manager dashboard + editor
- [ ] Tests: integration + E2E
- [ ] Deploy: STAGING → PROD

**[ ] Week 6-8: Feature 1 Development**
- [ ] Database: PdfTemplate models + migration
- [ ] Service: PdfTemplateService
- [ ] API: GET/POST/PUT/DELETE endpoints
- [ ] Frontend: Editor (form-based) + preview
- [ ] Tests: performance + E2E
- [ ] Deploy: STAGING → PROD

**[ ] Post-launch: Monitoring & Iteration**
-[ ] Monitor performance metrics
- [ ] Collect DP feedback
- [ ] Plan V2 enhancements (WYSIWYG, advanced templates)

---

**Este plano é vosso mapa de navegação. Ajustem conforme velocidade real do time, feedback de usuários, e descobertas técnicas.**

Força e sucesso! 🚀

---

---

# 📚 DOCUMENTOS COMPLEMENTARES CONSOLIDADOS

Esta análise foi desdobrada em **4 documentos estruturados**, acessíveis em:

## **1️⃣ ANALISE-3-FEATURES.md** (Este arquivo)
**Conteúdo Completo:**
- 6 perspectivas: PM, Arquiteto, UX Designer, Dev, QA, Scrum Master
- Requisitos detalhados por feature
- Arquitetura de banco de dados
- Endpoints API
- Componentes React com código
- Sequenciamento atualizado com Feature 4

**Use quando:** Precisa entender requisitos, arquitetura, ou contexto geral

---

## **📋 2️⃣ 4-PLANO_TESTES_QA.md**
**Conteúdo:**
- Estratégia de testes (piramide)
- Testes unitários com exemplos (Jest)
- Testes de integração (APIs)
- Testes E2E (Playwright)
- Matriz de segurança
- Critérios de sucesso
- Cronograma de execução

**Use quando:** Precisa entender cobertura de testes ou criar test cases

---

## **⚡ 3️⃣ 5-GUIA_RAPIDO_IMPLEMENTACAO.md**
**Conteúdo:**
- Quick checklist (tasks únicos)
- Step-by-step setup
- Database migration script
- Code snippets prontos para copiar
- React components completos
- Integration examples
- Troubleshooting

**Use quando:** É dev e precisa de "apenas comece aqui"

---

## **📊 4️⃣ 6-SUMARIO_EXECUTIVO.md**
**Conteúdo:**
- Responsabilidades por role
- Timeline semanal detalhada
- Story point breakdown
- Definition of Done
- Risk matrix
- Success criteria
- Próximas ações imediatas

**Use quando:** É PM/SM/Stakeholder e precisa gerenciar o programa

---

---

## 🎯 COMO USAR ESTA DOCUMENTAÇÃO

### **Para Product Manager (John):**
1. Leia **ANALISE-3-FEATURES.md** → Seção "PERSPECTIVA 1: PRODUCT MANAGER"
2. Leia **6-SUMARIO_EXECUTIVO.md** → Whole document
3. Use para comunicar com stakeholders

### **Para Arquiteto (Winston):**
1. Leia **ANALISE-3-FEATURES.md** → Seção "PERSPECTIVA 2: ARQUITETO"
2. Revise security + performance sections
3. Faça code review periodicamente

### **Para UX Designer (Sally):**
1. Leia **ANALISE-3-FEATURES.md** → Seção "PERSPECTIVA 3: UX DESIGNER"
2. Revise mockups contra implementação
3. Validar acessibilidade

### **Para Developer (Amelia):**
1. Leia **5-GUIA_RAPIDO_IMPLEMENTACAO.md** → Start here!
2. Use code snippets como template
3. Consulte **ANALISE-3-FEATURES.md** para requisitos
4. Trabalhe com Quinn usando **4-PLANO_TESTES_QA.md**

### **Para QA (Quinn):**
1. Leia **4-PLANO_TESTES_QA.md** → Whole document
2. Revise test matrix contra feature requirements
3. Coordene com Amelia + John

### **Para Scrum Master (Bob):**
1. Leia **6-SUMARIO_EXECUTIVO.md** → Planning + Timeline
2. Use Story Point breakdown para planning
3. Monitor contra DoD

---

---

## 📁 ESTRUTURA DE ARQUIVOS

```
design-artifacts/
├── ANALISE-3-FEATURES.md              ← Análise completa (este arquivo)
├── 4-PLANO_TESTES_QA.md              ← Estratégia de testes
├── 5-GUIA_RAPIDO_IMPLEMENTACAO.md    ← Guia prático do dev
├── 6-SUMARIO_EXECUTIVO.md            ← Sumário para liderança
└── (histórico anterior)
    ├── ANALISE-UX-SCENARIO.md
    ├── Feature-Brief-*.md
    └── ...
```

---

---

## 🚀 PRÓXIMAS AÇÕES ESTRUTURADAS

### **IMEDIATAMENTE (This Week):**

```
[ ] John: Distribua estes 4 documentos ao time
[ ] Winston: Review arquitetura + segurança
[ ] Bob: Crie Jira stories baseado em "PLANO_TESTES_QA" + "SUMARIO"
[ ] Amelia: Setup branches + ambiente local
[ ] Quinn: Configure test framework (Playwright + Jest)
```

### **PRÓXIMA SEMANA:**

```
[ ] Planning Meeting: Break features into sprint tasks
[ ] John: Define release plan + comms
[ ] Amelia: Start migrations + API scaffolding
[ ] Quinn: Create test fixtures
[ ] All: Daily standup starts
```

### **SPRINT 1-2:**

```
[ ] Amelia: Deliver F3+F4 backend + frontend
[ ] Quinn: Testing as-you-go
[ ] John: Gather feedback (STAGING)
[ ] Deploy to STAGING week 2 (Go/No-Go)
```

### **SPRINT 3-4:**

```
[ ] Amelia: Deliver F2 backend + frontend
[ ] Quinn: Testing as-you-go
[ ] John: Gather feedback (STAGING)
[ ] Deploy to STAGING week 4 (Go/No-Go)
```

### **SPRINT 5-6:**

```
[ ] Amelia: Deliver F1 backend + frontend
[ ] Quinn: Testing as-you-go
[ ] John: Gather feedback (STAGING)
[ ] Deploy to STAGING week 6 (Go/No-Go)
```

---

---

## 💭 NOTAS IMPORTANTES

### ⚠️ **Scope Management**
- Feature 4 integrada com F3 no Sprint 1-2
- Requisitos claros? ✅ Sim
- Impacto em priorização? ✅ Sim (F4 integrada com F3, não adiciona peso significativo)
- Roadmap ajustado: F3+F4 → F2 → F1
- Recomendação: **Manter priorização F3+F4 → F2 → F1**

### ⚠️ **Dependências Externas**
- NextAuth (existente) → Auth middleware ok
- Prisma (existente) → ORM ok
- React Query (hopefully existing) → for data fetching
- Tailwind CSS (existente) → UI ok
- **Novas:** jszip, react-copy-to-clipboard

### ⚠️ **Riscos Críticos**
1. **Performance de ZIP**: Monitor em load testing
2. **Security**: RBAC + auditoria essenciais antes de PROD
3. **Dados: DB migrations** precisam rollback plan
4. **SLA DP**: Se primeira feature falhar, adoção desaba

---

---

## 🔗 CROSS-REFERENCES

### Documentação Relacionada (fora deste projeto):
- NextAuth auth docs
- Prisma migration guide
- Playwright test guide
- React best practices

### Pessoas-chave para contactar:
- **TypeScript patterns:** Winston (Architect)
- **React performance:** Sally (UX Designer)
- **DB design questions:** Winston (Architect)
- **Test coverage:** Quinn (QA)
- **Roadmap changes:** John (PM)

---

---

## 📈 METRICS DE SUCESSO (TRACKING)

### Durante Desenvolvimento:
- Velocity (target: 5+ SP/sprint)
- Bug leakage (target: < 3 bugs/sprint)
- Code coverage (target: 70%+)

### Pós-Launch:
- DP adoption (target: 50%+ w1, 80%+ w2)
- Error rate (target: < 0.1% of transactions)
- Performance (target: p99 < 2s)
- Satisfaction (target: > 4/5 stars)

---

---

## 👏 AGRADECIMENTOS & PRÓXIMO PASSO

**Esse análise foi resultado de:**
- Discussão colaborativa com 6 especialistas BMAD
- Iteração sobre requisitos DP
- Validação técnica contra arquitetura existente

**Produzido:** Março 27, 2026  
**Status:** ✅ READY FOR EXECUTION  
**Next:** Kickoff meeting com todo time

---

**🎯 Objetivo:** Transformar operações com autonomia para DP através de tecnologia inteligente, incluindo flexibilidade para reenvio de links quando necessário.

**💪 Visão:** Um sistema que DP ama usar, TI ama manter, e colaboradores se beneficiam de imediato.

**🚀 Vamos mexer nisso!**



