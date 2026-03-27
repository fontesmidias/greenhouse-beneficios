# 🧪 PLANO DETALHADO DE TESTES - GREENHOUSE BENEFÍCIOS

**Feature:** F3 + F4 (MVP Phase 1: Download em Massa + Magic Link)  
**Responsável:** Quinn (QA Engineer)  
**Data:** Março 2026  
**Framework:** Playwright + Jest + Prisma Testing  

---

## 📋 ESTRUTURA DE TESTES

### Piramide de Testes (Recomendado)

```
         ╱╲
        ╱  ╲  E2E (10-15%)
       ╱────╲ - Fluxos críticos de usuário
      ╱──────╲
     ╱────────╲ Integration (30-35%)
    ╱  Testes  ╲ - APIs, Database, Services
   ╱────────────╲
  ╱──────────────╲ Unit (50-55%)
 ╱────────────────╲ - Funções, validações
╱──────────────────╲  

Target Coverage: 70-80%
```

---

## 🧪 TESTES UNITÁRIOS (Jest)

### 1️⃣ BulkDownloadService

**Arquivo:** `src/lib/services/__tests__/BulkDownloadService.test.ts`

```typescript
import { BulkDownloadService } from '@/lib/services/BulkDownloadService';
import { db } from '@/lib/prisma';

jest.mock('@/lib/prisma');
jest.mock('jszip');

describe('BulkDownloadService', () => {
  describe('validateReceiptIds', () => {
    it('deve rejeitar array vazio', async () => {
      expect(() => BulkDownloadService.validateReceiptIds([])).toThrow(
        'receiptIds não pode ser vazio'
      );
    });

    it('deve rejeitar mais de 100 items', async () => {
      const ids = Array(101).fill('id');
      expect(() => BulkDownloadService.validateReceiptIds(ids)).toThrow(
        'Máximo 100 recibos por vez'
      );
    });

    it('deve aceitar array válido com 1-100 ids', () => {
      expect(() => BulkDownloadService.validateReceiptIds(['id1', 'id2'])).not.toThrow();
    });
  });

  describe('fetchSignedReceipts', () => {
    it('deve buscar apenas recibos ASSINADO', async () => {
      const mockReceipts = [
        { id: '1', status: 'ASSINADO' },
        { id: '2', status: 'ENVIADO' }
      ];
      
      db.receipt.findMany.mockResolvedValueOnce([mockReceipts[0]]);

      const result = await BulkDownloadService.fetchSignedReceipts(['1', '2']);

      expect(db.receipt.findMany).toHaveBeenCalledWith({
        where: {
          id: { in: ['1', '2'] },
          status: 'ASSINADO'
        }
      });
      expect(result).toHaveLength(1);
      expect(result[0].status).toBe('ASSINADO');
    });

    it('deve retornar array vazio se nenhum ASSINADO', async () => {
      db.receipt.findMany.mockResolvedValueOnce([]);
      
      const result = await BulkDownloadService.fetchSignedReceipts(['1']);
      
      expect(result).toHaveLength(0);
    });
  });

  describe('generateZip', () => {
    it('deve criar ZIP com PDFs', async () => {
      const mockPDF = Buffer.from('PDF content');
      const receipts = [
        { id: 'r1', collaboratorName: 'João Silva' }
      ];

      const zip = await BulkDownloadService.generateZip(
        receipts,
        [mockPDF]
      );

      expect(zip).toBeDefined();
      // Validate ZIP structure
      const files = Object.keys(zip.files);
      expect(files.length).toBe(1);
      expect(files[0]).toContain('João Silva');
    });

    it('deve gerar ZIP válido com múltiplos PDFs', async () => {
      const pdfs = [
        Buffer.from('PDF1'),
        Buffer.from('PDF2'),
        Buffer.from('PDF3')
      ];
      const receipts = [
        { id: 'r1', collaboratorName: 'João' },
        { id: 'r2', collaboratorName: 'Maria' },
        { id: 'r3', collaboratorName: 'Pedro' }
      ];

      const zip = await BulkDownloadService.generateZip(receipts, pdfs);

      expect(Object.keys(zip.files).length).toBe(3);
    });

    it('deve lançar erro se PDF count mismatch', async () => {
      const receipts = [{ id: 'r1', collaboratorName: 'João' }];
      const pdfs = [Buffer.from('PDF1'), Buffer.from('PDF2')];

      expect(() => 
        BulkDownloadService.generateZip(receipts, pdfs)
      ).toThrow('PDF count mismatch');
    });
  });

  describe('logBulkDownload', () => {
    it('deve registrar auditoria com det corretos', async () => {
      const auditSpy = jest.spyOn(require('@/lib/audit'), 'logAudit');

      await BulkDownloadService.logBulkDownload('user123', 3, ['r1', 'r2', 'r3']);

      expect(auditSpy).toHaveBeenCalledWith({
        action: 'BULK_DOWNLOAD',
        userId: 'user123',
        receiptCount: 3,
        receiptIds: ['r1', 'r2', 'r3']
      });
    });
  });
});
```

### 2️⃣ Magic Link Service

**Arquivo:** `src/lib/services/__tests__/MagicLinkService.test.ts`

```typescript
describe('MagicLinkService', () => {
  describe('validateReceiptForLink', () => {
    it('deve aceitar recibo ASSINADO', () => {
      const receipt = { status: 'ASSINADO', magicLinkToken: 'token123' };
      expect(() => 
        MagicLinkService.validateReceiptForLink(receipt)
      ).not.toThrow();
    });

    it('deve aceitar recibo ENVIADO', () => {
      const receipt = { status: 'ENVIADO', magicLinkToken: 'token123' };
      expect(() => 
        MagicLinkService.validateReceiptForLink(receipt)
      ).not.toThrow();
    });

    it('deve rejeitar recibo DRAFT', () => {
      const receipt = { status: 'DRAFT' };
      expect(() => 
        MagicLinkService.validateReceiptForLink(receipt)
      ).toThrow('Recibo não é elegível para link');
    });

    it('deve rejeitar recibo sem token', () => {
      const receipt = { status: 'ASSINADO', magicLinkToken: null };
      expect(() => 
        MagicLinkService.validateReceiptForLink(receipt)
      ).toThrow('Recibo não possui magic link');
    });

    it('deve aceitar token permanente mesmo expirado', () => {
      const receipt = {
        status: 'ASSINADO',
        magicLinkToken: 'token123',
        magicLinkPermanent: true,
        magicLinkExpiresAt: new Date('2020-01-01') // Expirado
      };
      expect(() => 
        MagicLinkService.validateReceiptForLink(receipt)
      ).not.toThrow();
    });

    it('deve rejeitar token não-permanente expirado', () => {
      const receipt = {
        status: 'ASSINADO',
        magicLinkToken: 'token123',
        magicLinkPermanent: false,
        magicLinkExpiresAt: new Date('2020-01-01')
      };
      expect(() => 
        MagicLinkService.validateReceiptForLink(receipt)
      ).toThrow('Magic link expirado');
    });
  });

  describe('formatMagicLink', () => {
    it('deve formatar URL corretamente', () => {
      const link = MagicLinkService.formatMagicLink('abc123xyz');
      expect(link).toMatch(/https?:\/\/.*\/sign\?token=abc123xyz/);
    });

    it('deve usar NEXT_PUBLIC_BASE_URL', () => {
      process.env.NEXT_PUBLIC_BASE_URL = 'https://app.example.com';
      const link = MagicLinkService.formatMagicLink('token123');
      expect(link).toContain('https://app.example.com');
    });
  });
});
```

---

## 🧪 TESTES DE INTEGRAÇÃO (API + DB)

### 3️⃣ Download Bulk Endpoint

**Arquivo:** `src/app/api/download/bulk/__tests__/route.test.ts`

```typescript
import { POST } from '@/app/api/download/bulk/route';
import { createMocks } from 'node-mocks-http';
import { db } from '@/lib/prisma';
import * as auth from '@/lib/auth';

jest.mock('@/lib/auth');
jest.mock('@/lib/prisma');

describe('POST /api/download/bulk', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('deve retornar 401 se não autenticado', async () => {
    auth.auth.mockResolvedValueOnce(null);

    const { req } = createMocks({
      method: 'POST',
      body: { receiptIds: ['1'] }
    });

    const res = await POST(req);
    expect(res.status).toBe(401);
  });

  it('deve retornar 403 se role insuficiente', async () => {
    auth.auth.mockResolvedValueOnce({
      user: { id: 'user1', role: 'USER' }
    });

    const { req } = createMocks({
      method: 'POST',
      body: { receiptIds: ['1'] }
    });

    const res = await POST(req);
    expect(res.status).toBe(403);
  });

  it('deve retornar 400 se receiptIds vazio', async () => {
    auth.auth.mockResolvedValueOnce({
      user: { id: 'user1', role: 'ADMIN' }
    });

    const { req } = createMocks({
      method: 'POST',
      body: { receiptIds: [] }
    });

    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it('deve retornar ZIP com múltiplos PDFs', async () => {
    auth.auth.mockResolvedValueOnce({
      user: { id: 'user1', role: 'ADMIN' }
    });

    const mockReceipts = [
      { id: '1', collaboratorName: 'João', status: 'ASSINADO' },
      { id: '2', collaboratorName: 'Maria', status: 'ASSINADO' }
    ];

    db.receipt.findMany.mockResolvedValueOnce(mockReceipts);

    // Mock PDF generation
    jest.mock('@/lib/pdf', () => ({
      getPdfBinary: jest.fn().mockResolvedValue(Buffer.from('PDF'))
    }));

    const { req } = createMocks({
      method: 'POST',
      body: { receiptIds: ['1', '2'] }
    });

    const res = await POST(req);

    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toBe('application/zip');
    expect(res.headers['content-disposition']).toContain('attachment');
  });

  it('deve retornar 400 se nenhum recibo ASSINADO', async () => {
    auth.auth.mockResolvedValueOnce({
      user: { id: 'user1', role: 'ADMIN' }
    });

    db.receipt.findMany.mockResolvedValueOnce([]);

    const { req } = createMocks({
      method: 'POST',
      body: { receiptIds: ['1', '2'] }
    });

    const res = await POST(req);
    expect(res.status).toBe(400);
    expect(res.body.error).toContain('Nenhum recibo');
  });

  it('deve limitar a 100 recibos', async () => {
    const ids = Array(101).fill('id');
    
    const { req } = createMocks({
      method: 'POST',
      body: { receiptIds: ids }
    });

    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it('deve registrar auditoria', async () => {
    auth.auth.mockResolvedValueOnce({
      user: { id: 'user1', role: 'ADMIN' }
    });

    const auditSpy = jest.spyOn(require('@/lib/audit'), 'logAudit');
    const mockReceipts = [
      { id: '1', collaboratorName: 'João', status: 'ASSINADO' }
    ];

    db.receipt.findMany.mockResolvedValueOnce(mockReceipts);

    const { req } = createMocks({
      method: 'POST',
      body: { receiptIds: ['1'] }
    });

    await POST(req);

    expect(auditSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'BULK_DOWNLOAD',
        userId: 'user1'
      })
    );
  });
});
```

### 4️⃣ Magic Link Endpoint

**Arquivo:** `src/app/api/receipts/[id]/magic-link/__tests__/route.test.ts`

```typescript
describe('GET /api/receipts/{id}/magic-link', () => {
  it('deve retornar link válido para recibo ASSINADO', async () => {
    auth.auth.mockResolvedValueOnce({
      user: { id: 'dp1' }
    });

    const receipt = {
      id: 'r1',
      status: 'ASSINADO',
      magicLinkToken: 'abc123',
      magicLinkPermanent: false,
      magicLinkExpiresAt: new Date(Date.now() + 86400000) // Tomorrow
    };

    db.receipt.findUnique.mockResolvedValueOnce(receipt);

    const { req } = createMocks({ method: 'GET' });
    const res = await GET(req, { params: { id: 'r1' } });

    expect(res.status).toBe(200);
    const data = JSON.parse(res.body);
    expect(data.magicLink).toContain('abc123');
    expect(data.isPermanent).toBe(false);
  });

  it('deve retornar 400 se recibo não elegível', async () => {
    auth.auth.mockResolvedValueOnce({
      user: { id: 'dp1' }
    });

    const receipt = {
      id: 'r1',
      status: 'DRAFT',
      magicLinkToken: null
    };

    db.receipt.findUnique.mockResolvedValueOnce(receipt);

    const { req } = createMocks({ method: 'GET' });
    const res = await GET(req, { params: { id: 'r1' } });

    expect(res.status).toBe(400);
  });

  it('deve rejeitar link expirado se não-permanente', async () => {
    auth.auth.mockResolvedValueOnce({
      user: { id: 'dp1' }
    });

    const receipt = {
      id: 'r1',
      status: 'ASSINADO',
      magicLinkToken: 'abc123',
      magicLinkPermanent: false,
      magicLinkExpiresAt: new Date(Date.now() - 86400000) // Yesterday
    };

    db.receipt.findUnique.mockResolvedValueOnce(receipt);

    const { req } = createMocks({ method: 'GET' });
    const res = await GET(req, { params: { id: 'r1' } });

    expect(res.status).toBe(400);
    expect(res.body).toContain('expirado');
  });

  it('deve aceitar link expirado se magicLinkPermanent=true', async () => {
    auth.auth.mockResolvedValueOnce({
      user: { id: 'dp1' }
    });

    const receipt = {
      id: 'r1',
      status: 'ASSINADO',
      magicLinkToken: 'permanent123',
      magicLinkPermanent: true,
      magicLinkExpiresAt: new Date('2020-01-01') // Way expired
    };

    db.receipt.findUnique.mockResolvedValueOnce(receipt);

    const { req } = createMocks({ method: 'GET' });
    const res = await GET(req, { params: { id: 'r1' } });

    expect(res.status).toBe(200);
    expect(JSON.parse(res.body).isPermanent).toBe(true);
  });
});
```

---

## 🎬 TESTES E2E (Playwright)

**Arquivo:** `e2e/features/bulk-download.spec.ts`

```typescript
import { test, expect } from '@playwright/test';

test.describe('Feature 3: Download em Massa', () => {
  test.beforeEach(async ({ page, context }) => {
    // Login como DP_MANAGER
    await context.addCookies([{
      name: 'session',
      value: 'test-session-token',
      domain: 'localhost',
      path: '/'
    }]);

    await page.goto('/admin/receipts');
    await page.waitForLoadState('networkidle');
  });

  test('DP deve ver dashboard com checkbox', async ({ page }) => {
    // Verify table exists
    await expect(page.locator('table')).toBeVisible();
    
    // Verify checkboxes existing
    const checkboxes = page.locator('input[type="checkbox"]');
    await expect(checkboxes).toBeDefined();
  });

  test('DP deve selecionar múltiplos recibos', async ({ page }) => {
    // Select first receipt
    await page.locator('input[type="checkbox"]').first().check();
    
    // Select second receipt
    await page.locator('input[type="checkbox"]').nth(1).check();

    // Verify counter shows 2
    await expect(page.locator('text=2 de')).toBeVisible();
  });

  test('Download button deve ficar habilitado com seleção', async ({ page }) => {
    const downloadButton = page.locator('button:has-text("Download Massa")');
    
    // Should be disabled initially
    await expect(downloadButton).toBeDisabled();
    
    // Select a receipt
    await page.locator('input[type="checkbox"]').first().check();
    
    // Button should be enabled now
    await expect(downloadButton).toBeEnabled();
  });

  test('DP deve conseguir fazer download de ZIP', async ({ page, context }) => {
    // Select receipts
    const checkboxes = page.locator('table input[type="checkbox"]');
    await checkboxes.nth(1).check();
    await checkboxes.nth(2).check();

    // Listen for download
    const downloadPromise = context.waitForEvent('download');
    
    // Click download button
    await page.locator('button:has-text("Download Massa")').click();
    
    // Wait for download
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toContain('recibos');
  });

  test('DP deve ver loading state durante download', async ({ page }) => {
    await page.locator('input[type="checkbox"]').first().check();
    
    // Click download
    const downloadButton = page.locator('button:has-text("Download Massa")');
    await downloadButton.click();
    
    // Should show loading indicator
    await expect(page.locator('text=Preparando download')).toBeVisible();
    
    // Should complete
    await expect(page.locator('text=Preparando download')).not.toBeVisible({ timeout: 10000 });
  });

  test('Deve mostrar erro se recibos não-assinados são selecionados', async ({ page }) => {
    // Select non-signed receipt (e.g., RASCUNHO)
    const draftCheckbox = page.locator('tr:has-text("Rascunho") input[type="checkbox"]');
    await draftCheckbox.check();
    
    // Try download
    await page.locator('button:has-text("Download Massa")').click();
    
    // Should show error
    await expect(page.locator('text=não estão assinados')).toBeVisible();
  });
});

test.describe('Feature 4: Obter Link Manual', () => {
  test('DP deve obter link simples', async ({ page, context }) => {
    await context.addCookies([{
      name: 'session',
      value: 'test-session-token',
      domain: 'localhost',
      path: '/'
    }]);

    await page.goto('/admin/receipts');
    
    // Click "Obter Link" button (action menu per row)
    await page.locator('button:has-text("Obter Link")').first().click();
    
    // Modal should appear
    await expect(page.locator('Modal, text=Links de Assinatura')).toBeVisible();
    
    // Link should be displayed
    const linkInput = page.locator('input[readonly]').first();
    await expect(linkInput).toHaveValue(/https?:\/\/.*\/sign\?token=/);
  });

  test('DP deve copiar link com botão', async ({ page, context }) => {
    await context.addCookies([{
      name: 'session',
      value: 'test-session-token',
      domain: 'localhost',
      path: '/'
    }]);

    await page.goto('/admin/receipts');
    
    // Open modal
    await page.locator('button:has-text("Obter Link")').first().click();
    
    // Copy button
    const copyButton = page.locator('button:has-text("Copiar")').first();
    await copyButton.click();
    
    // Should show "Copiado!"
    await expect(copyButton).toContainText('Copiado!');
    
    // Check clipboard (may not work in all test environments)
    // const clipboardText = await page.evaluate(() => navigator.clipboard.readText());
    // expect(clipboardText).toContain('/sign?token=');
  });

  test('DP deve obter múltiplos links', async ({ page, context }) => {
    await context.addCookies([{
      name: 'session',
      value: 'test-session-token',
      domain: 'localhost',
      path: '/'
    }]);

    await page.goto('/admin/receipts');
    
    // Select multiple receipts
    await page.locator('input[type="checkbox"]').nth(1).check();
    await page.locator('input[type="checkbox"]').nth(2).check();
    
    // Click "Obter Links"
    await page.locator('button:has-text("Obter Links")').click();
    
    // Modal should show with 2 links
    const links = page.locator('input[readonly]');
    expect(await links.count()).toBeGreaterThanOrEqual(2);
    
    // "Copiar Todos" button should exist
    await expect(page.locator('button:has-text("Copiar Todos")')).toBeVisible();
  });

  test('Link deve reutilizar token existente', async ({ page, context }) => {
    await context.addCookies([{
      name: 'session',
      value: 'test-session-token',
      domain: 'localhost',
      path: '/'
    }]);

    await page.goto('/admin/receipts');
    
    // Get first link
    await page.locator('button:has-text("Obter Link")').first().click();
    const firstLink = await page.locator('input[readonly]').first().inputValue();
    await page.locator('button:has-text("Fechar")').click();
    
    // Get same link again (should be identical)
    await page.locator('button:has-text("Obter Link")').first().click();
    const secondLink = await page.locator('input[readonly]').first().inputValue();
    
    expect(firstLink).toBe(secondLink);
  });
});
```

---

## 📊 MATRIZ DE TESTES DE SEGURANÇA

| Cenário | Teste | Esperado |
|---------|-------|----------|
| **Sem autenticação** | Try download sem session | 401 Unauthorized |
| **Role USER** | Try download com role USER | 403 Forbidden |
| **Role ADMIN** | Try download com role ADMIN | 200 + ZIP |
| **Recibo de outro user** | DP A baixa recibo de DP B | 200 (permitido) |
| **Rate limit** | 6 requests em 1 min | 429 Too Many Requests |
| **SQL Injection** | receiptIds com SQL malicioso | Erro de validação |
| **XSS em colaborador name** | PDF com nome `<script>alert()</script>` | Escapado no ZIP filename |
| **Arquivo temporário** | Zip deletado após 1h | File not found |

---

## 🎯 CRITÉRIOS DE SUCESSO

### ✅ Testes Passando
- [ ] 100% dos testes unitários passando
- [ ] 100% dos testes de integração passando
- [ ] 100% dos testes E2E passando
- [ ] Coverage ≥ 70%

### ✅ Segurança
- [ ] Sem SQL injection
- [ ] Sem XSS
- [ ] Sem escalação de privilégio
- [ ] Rate limiting funciona
- [ ] Auditoria registrada

### ✅ Performance
- [ ] ZIP gerado em < 3s para 100 recibos
- [ ] API responds < 200ms para link simples
- [ ] Modal abre em < 100ms

### ✅ UX
- [ ] Loading states visíveis
- [ ] Error messages claros
- [ ] Botões habilitados/desabilitados corretamente
- [ ] Cópia para clipboard funciona

---

## 📅 CRONOGRAMA DE EXECUÇÃO

| Semana | Atividade | Status |
|--------|-----------|--------|
| **1** | Setup test framework, create fixtures | ⏳ TODO |
| **1-2** | Unit tests para services | ⏳ TODO |
| **2** | Integration tests para APIs | ⏳ TODO |
| **2** | E2E tests para fluxos críticos | ⏳ TODO |
| **2** | Security testing + penetration | ⏳ TODO |
| **2** | Performance testing + optimization | ⏳ TODO |
| **2** | Sign-off QA | ⏳ TODO |

---

**Status:** Pronto para execução após dev completar implementação básica.

