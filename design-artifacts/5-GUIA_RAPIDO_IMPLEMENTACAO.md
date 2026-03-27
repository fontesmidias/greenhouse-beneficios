# 🚀 GUIA RÁPIDO: IMPLEMENTAÇÃO F3+F4 (MVP Phase 1)

**Público:** Devs (Amelia + time)  
**Tempo de Leitura:** 10 min  
**Última Atualização:** Março 2026

---

## 🎯 OBJETIVO

Implementar **Feature 3 (Download em Massa)** + **Feature 4 (Obter Link Manual)** em **2 sprints** (8-10 story points).

---

## 📋 QUICK CHECKLIST

```bash
[ ] Day 1: Database & Setup
    [ ] Create migration: add indices + magicLinkPermanent
    [ ] Install jszip + react-copy-to-clipboard  
    [ ] Setup auth middleware (role validation)
    [ ] Create audit schema

[ ] Day 2-3: Backend APIs
    [ ] POST /api/download/bulk (with validation + zip logic)
    [ ] GET /api/receipts/{id}/magic-link
    [ ] POST /api/receipts/bulk/magic-links

[ ] Day 4-5: Frontend Components
    [ ] React: BulkReceiptsSelector (tables with checkboxes)
    [ ] React: BulkActionsBar (buttons for download/links)
    [ ] React: MagicLinkModal (display + copy links)
    [ ] React: Integration in dashboard page

[ ] Day 6: Tests + Deployment
    [ ] Unit tests (70% coverage)
    [ ] E2E tests (critical flows)
    [ ] STAGING → QA sign-off
    [ ] PROD deployment
```

---

## 🗄️ STEP 1: DATABASE

### Migration File

```bash
# Create migration
npx prisma migrate dev --name add_bulk_download_support

# This generates:
# prisma/migrations/[timestamp]_add_bulk_download_support/migration.sql
```

**Content of migration.sql:**

```sql
-- Add index for better query performance
CREATE INDEX "Receipt_status_createdAt_idx" ON "Receipt"("status", "createdAt");

-- Add magicLinkPermanent to Receipt (for F4)
ALTER TABLE "Receipt" ADD COLUMN "magicLinkPermanent" BOOLEAN NOT NULL DEFAULT false;

-- Optional: Audit table (if not exists)
CREATE TABLE "MagicLinkAudit" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "receiptId" TEXT NOT NULL,
  "userId" TEXT,
  "action" TEXT NOT NULL,
  "ipAddress" TEXT,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY ("receiptId") REFERENCES "Receipt"("id") ON DELETE CASCADE
);

CREATE INDEX "MagicLinkAudit_receiptId_idx" ON "MagicLinkAudit"("receiptId");
CREATE INDEX "MagicLinkAudit_action_idx" ON "MagicLinkAudit"("action");
```

**Update Prisma Schema:**

```prisma
// prisma/schema.prisma

model Receipt {
  id                    String    @id @default(uuid())
  // ... existing fields ...
  
  // F4 Support
  magicLinkToken        String?
  magicLinkExpiresAt    DateTime?
  magicLinkPermanent    Boolean   @default(false)  // NEW
  
  createdAt    DateTime  @default(now())
  updatedAt    DateTime  @updatedAt
  
  @@index([status])             // NEW
  @@index([createdAt])          // NEW
  @@index([magicLinkToken])     // NEW
}

// NEW: Auditoria
model MagicLinkAudit {
  id        String   @id @default(uuid())
  receiptId String
  userId    String?
  action    String   // "LINK_OBTAINED", "LINKS_BULK_OBTAINED"
  ipAddress String?
  createdAt DateTime @default(now())
  
  @@index([receiptId])
  @@index([action])
}
```

**Apply Migration:**

```bash
npx prisma migrate deploy
npx prisma db push  # for local dev
```

---

## 📦 STEP 2: INSTALL DEPENDENCIES

```bash
npm install jszip react-copy-to-clipboard zod
npm install -D @types/jszip jest node-mocks-http
```

---

## 🔌 STEP 3: CREATE SERVICES

### Service: BulkDownloadService

**File:** `src/lib/services/BulkDownloadService.ts`

```typescript
import JSZip from 'jszip';
import { db } from '@/lib/prisma';

const MAX_RECEIPTS = 100;

export class BulkDownloadService {
  static validateReceiptIds(ids: string[]): void {
    if (!Array.isArray(ids) || ids.length === 0) {
      throw new Error('receiptIds deve ser array não-vazio');
    }
    if (ids.length > MAX_RECEIPTS) {
      throw new Error(`Máximo ${MAX_RECEIPTS} recibos por vez`);
    }
  }

  static async fetchSignedReceipts(ids: string[]) {
    return await db.receipt.findMany({
      where: {
        id: { in: ids },
        status: 'ASSINADO'
      }
    });
  }

  static async generateZip(receipts: any[], pdfs: Buffer[]) {
    if (receipts.length !== pdfs.length) {
      throw new Error('PDF count mismatch');
    }

    const zip = new JSZip();

    receipts.forEach((receipt, idx) => {
      const filename = `recibo_${receipt.collaboratorName}_${receipt.id}.pdf`;
      zip.file(filename, pdfs[idx]);
    });

    return await zip.generateAsync({ type: 'uint8array' });
  }

  static async logDownload(userId: string, count: number, receiptIds: string[]) {
    // Implementar auditoria
    console.log(`[AUDIT] BULK_DOWNLOAD by ${userId}: ${count} receipts`);
  }

  static validateUserRole(role: string): void {
    if (!['ADMIN', 'DP_MANAGER'].includes(role)) {
      throw new Error('Insufficient permissions');
    }
  }
}
```

### Service: MagicLinkService

**File:** `src/lib/services/MagicLinkService.ts`

```typescript
export class MagicLinkService {
  static validateReceiptForLink(receipt: any): void {
    if (!receipt) {
      throw new Error('Recibo não encontrado');
    }

    if (!['ENVIADO', 'ASSINADO'].includes(receipt.status)) {
      throw new Error('Recibo não é elegível para link');
    }

    if (!receipt.magicLinkToken) {
      throw new Error('Recibo não possui magic link');
    }

    // Check expiration
    if (!receipt.magicLinkPermanent && receipt.magicLinkExpiresAt) {
      if (new Date() > receipt.magicLinkExpiresAt) {
        throw new Error('Magic link expirado');
      }
    }
  }

  static formatMagicLink(token: string): string {
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
    return `${baseUrl}/sign?token=${token}`;
  }

  static formatMultipleLinks(receipts: any[]) {
    return receipts.map(r => ({
      receiptId: r.id,
      collaboratorName: r.collaboratorName,
      magicLink: this.formatMagicLink(r.magicLinkToken),
      expiresAt: r.magicLinkExpiresAt,
      isPermanent: r.magicLinkPermanent
    }));
  }
}
```

---

## 🔌 STEP 4: CREATE BACKEND ROUTES

### Route: POST /api/download/bulk

**File:** `src/app/api/download/bulk/route.ts`

```typescript
import { auth } from '@/lib/auth';
import { NextRequest, NextResponse } from 'next/server';
import { BulkDownloadService } from '@/lib/services/BulkDownloadService';
import { db } from '@/lib/prisma';

export async function POST(req: NextRequest) {
  try {
    // 1. Auth
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 2. RBAC
    BulkDownloadService.validateUserRole(session.user.role);

    // 3. Parse + Validate
    const { receiptIds } = await req.json();
    BulkDownloadService.validateReceiptIds(receiptIds);

    // 4. Fetch Signed Receipts
    const receipts = await BulkDownloadService.fetchSignedReceipts(receiptIds);
    if (receipts.length === 0) {
      return NextResponse.json(
        { error: 'Nenhum recibo assinado encontrado' },
        { status: 400 }
      );
    }

    // 5. Get PDFs in parallel
    const pdfs = await Promise.all(
      receipts.map(r => getPdfBinary(r.id))
    );

    // 6. Create ZIP
    const zipBuffer = await BulkDownloadService.generateZip(receipts, pdfs);

    // 7. Audit
    await BulkDownloadService.logDownload(session.user.id, receipts.length, receiptIds);

    // 8. Response
    const timestamp = new Date().toISOString().split('T')[0];
    return new NextResponse(zipBuffer, {
      headers: {
        'Content-Type': 'application/zip',
        'Content-Disposition': `attachment; filename="recibos-${timestamp}.zip"`
      }
    });
  } catch (error: any) {
    console.error('Download error:', error);
    return NextResponse.json(
      { error: error.message || 'Erro interno' },
      { status: 500 }
    );
  }
}

// Helper (implement based on your PDF storage)
async function getPdfBinary(receiptId: string): Promise<Buffer> {
  // TODO: Fetch from your PDF storage (filesystem, S3, etc.)
  // For now, assuming a getPdf function exists in lib/pdf.ts
  const pdf = await require('@/lib/pdf').getPdf(receiptId);
  return pdf;
}
```

### Route: GET /api/receipts/{id}/magic-link

**File:** `src/app/api/receipts/[id]/magic-link/route.ts`

```typescript
import { auth } from '@/lib/auth';
import { NextRequest, NextResponse } from 'next/server';
import { MagicLinkService } from '@/lib/services/MagicLinkService';
import { db } from '@/lib/prisma';

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const receipt = await db.receipt.findUnique({
      where: { id: params.id }
    });

    MagicLinkService.validateReceiptForLink(receipt);

    const magicLink = MagicLinkService.formatMagicLink(receipt.magicLinkToken);

    // Audit
    console.log(`[AUDIT] MAGIC_LINK_OBTAINED: ${receipt.id} by ${session.user.id}`);

    return NextResponse.json({
      receiptId: receipt.id,
      collaboratorName: receipt.collaboratorName,
      magicLink,
      expiresAt: receipt.magicLinkExpiresAt,
      isPermanent: receipt.magicLinkPermanent
    });
  } catch (error: any) {
    console.error('Magic link error:', error);
    return NextResponse.json(
      { error: error.message || 'Erro interno' },
      { status: 500 }
    );
  }
}
```

### Route: POST /api/receipts/bulk/magic-links

**File:** `src/app/api/receipts/bulk/magic-links/route.ts`

```typescript
import { auth } from '@/lib/auth';
import { NextRequest, NextResponse } from 'next/server';
import { MagicLinkService } from '@/lib/services/MagicLinkService';
import { db } from '@/lib/prisma';

const MAX_LINKS = 50;

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { receiptIds } = await req.json();

    if (!Array.isArray(receiptIds) || receiptIds.length === 0) {
      return NextResponse.json(
        { error: 'receiptIds deve ser array não-vazio' },
        { status: 400 }
      );
    }

    if (receiptIds.length > MAX_LINKS) {
      return NextResponse.json(
        { error: `Máximo ${MAX_LINKS} links por vez` },
        { status: 400 }
      );
    }

    // Fetch receipts
    const receipts = await db.receipt.findMany({
      where: {
        id: { in: receiptIds },
        magicLinkToken: { not: null },
        status: { in: ['ENVIADO', 'ASSINADO'] }
      }
    });

    if (receipts.length === 0) {
      return NextResponse.json(
        { error: 'Nenhum recibo com link válido' },
        { status: 400 }
      );
    }

    const links = MagicLinkService.formatMultipleLinks(receipts);

    // Audit
    console.log(`[AUDIT] MAGIC_LINKS_OBTAINED: ${links.length} by ${session.user.id}`);

    return NextResponse.json({ count: links.length, links });
  } catch (error: any) {
    console.error('Bulk links error:', error);
    return NextResponse.json(
      { error: error.message || 'Erro interno' },
      { status: 500 }
    );
  }
}
```

---

## 💻 STEP 5: FRONTEND COMPONENTS

### Component: BulkReceiptsSelector

**File:** `src/components/receipts/BulkReceiptsSelector.tsx`

```typescript
'use client';

import { Checkbox } from '@/components/ui/checkbox';
import { useState } from 'react';

interface ReceiptRow {
  id: string;
  collaboratorName: string;
  cpf: string;
  status: 'DRAFT' | 'ENVIADO' | 'ASSINADO' | 'RECUSADO';
  createdAt: Date;
}

export function BulkReceiptsSelector({
  receipts,
  onSelectionChange
}: {
  receipts: ReceiptRow[];
  onSelectionChange: (ids: string[]) => void;
}) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      const newSelected = new Set(receipts.map(r => r.id));
      setSelectedIds(newSelected);
      onSelectionChange(Array.from(newSelected));
    } else {
      setSelectedIds(new Set());
      onSelectionChange([]);
    }
  };

  const handleSelectOne = (id: string, checked: boolean) => {
    const newSelected = new Set(selectedIds);
    if (checked) {
      newSelected.add(id);
    } else {
      newSelected.delete(id);
    }
    setSelectedIds(newSelected);
    onSelectionChange(Array.from(newSelected));
  };

  return (
    <div>
      <table className="w-full border-collapse">
        <thead>
          <tr className="bg-gray-100">
            <th className="p-2 w-10">
              <Checkbox
                onChange={(e: any) => handleSelectAll(e.target.checked)}
              />
            </th>
            <th className="p-2 text-left">Nome</th>
            <th className="p-2 text-left">CPF</th>
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
                  onChange={(e: any) =>
                    handleSelectOne(receipt.id, e.target.checked)
                  }
                />
              </td>
              <td className="p-2">{receipt.collaboratorName}</td>
              <td className="p-2 text-sm">{receipt.cpf}</td>
              <td className="p-2 text-sm">
                {new Date(receipt.createdAt).toLocaleDateString('pt-BR')}
              </td>
              <td className="p-2">
                <span
                  className={`px-2 py-1 rounded text-xs font-bold ${
                    receipt.status === 'ASSINADO'
                      ? 'bg-green-100 text-green-800'
                      : 'bg-blue-100 text-blue-800'
                  }`}
                >
                  {receipt.status === 'ASSINADO' && '✓ Assinado'}
                  {receipt.status === 'ENVIADO' && '⏳ Enviado'}
                  {receipt.status === 'RASCUNHO' && '📝 Rascunho'}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="mt-2 text-sm text-gray-600">
        {selectedIds.size} de {receipts.length} selecionados
      </p>
    </div>
  );
}
```

### Component: MagicLinkModal

**File:** `src/components/receipts/MagicLinkModal.tsx`

```typescript
'use client';

import { useState } from 'react';
import CopyToClipboard from 'react-copy-to-clipboard';
import { toast } from 'sonner';

export function MagicLinkModal({
  links,
  onClose
}: {
  links: Array<{ receiptId: string; collaboratorName: string; magicLink: string }>;
  onClose: () => void;
}) {
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const handleCopy = (id: string, link: string) => {
    setCopiedId(id);
    toast.success('Link copiado! 📋');
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleCopyAll = () => {
    const text = links.map(l => `${l.collaboratorName}: ${l.magicLink}`).join('\n');
    navigator.clipboard.writeText(text);
    toast.success('Todos os links copiados!');
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-lg max-w-2xl w-full max-h-[80vh] overflow-auto">
        <div className="sticky top-0 bg-gray-100 p-4 border-b flex justify-between">
          <h2 className="text-lg font-bold">🔗 Links de Assinatura</h2>
          <button
            onClick={onClose}
            className="text-2xl text-gray-500 hover:text-gray-700"
          >
            ×
          </button>
        </div>

        <div className="p-6 space-y-4">
          {links.map(link => (
            <div key={link.receiptId} className="p-4 bg-gray-50 rounded border">
              <div className="font-medium mb-2">{link.collaboratorName}</div>
              <div className="flex gap-2">
                <input
                  type="text"
                  readOnly
                  value={link.magicLink}
                  className="flex-1 p-2 bg-white border rounded font-mono text-xs"
                />
                <CopyToClipboard
                  text={link.magicLink}
                  onCopy={() => handleCopy(link.receiptId, link.magicLink)}
                >
                  <button
                    className={`px-4 py-2 rounded font-medium ${
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

        <div className="sticky bottom-0 bg-gray-100 p-4 border-t flex gap-2 justify-end">
          <button
            onClick={handleCopyAll}
            className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600"
          >
            📋 Copiar Todos
          </button>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-400 text-white rounded hover:bg-gray-500"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
}
```

### Integration in Dashboard

**File:** `src/app/admin/receipts/page.tsx` (excerpt)

```typescript
'use client';

import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { BulkReceiptsSelector } from '@/components/receipts/BulkReceiptsSelector';
import { MagicLinkModal } from '@/components/receipts/MagicLinkModal';
import { toast } from 'sonner';

async function fetchReceipts() {
  const res = await fetch('/api/receipts?limit=50');
  if (!res.ok) throw new Error('Failed to fetch');
  return res.json();
}

export default function ReceiptsPage() {
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [showLinkModal, setShowLinkModal] = useState(false);
  const [links, setLinks] = useState([]);
  const { data: receipts = [], isLoading } = useQuery({
    queryKey: ['receipts'],
    queryFn: fetchReceipts
  });

  const handleDownload = async () => {
    try {
      const response = await fetch('/api/download/bulk', {
        method: 'POST',
        body: JSON.stringify({ receiptIds: selectedIds })
      });

      if (!response.ok) {
        const error = await response.json();
        toast.error(error.error || 'Erro ao baixar');
        return;
      }

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `recibos-${new Date().toISOString().split('T')[0]}.zip`;
      a.click();
      URL.revokeObjectURL(url);

      toast.success('Download iniciado!');
    } catch (error) {
      toast.error('Erro ao fazer download');
    }
  };

  const handleGetLinks = async () => {
    try {
      const response = await fetch('/api/receipts/bulk/magic-links', {
        method: 'POST',
        body: JSON.stringify({ receiptIds: selectedIds })
      });

      if (!response.ok) {
        throw new Error('Erro ao obter links');
      }

      const data = await response.json();
      setLinks(data.links);
      setShowLinkModal(true);
      toast.success(`${data.count} links obtidos!`);
    } catch (error) {
      toast.error('Erro ao obter links');
    }
  };

  if (isLoading) return <div>Carregando...</div>;

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Recibos</h1>

      <BulkReceiptsSelector
        receipts={receipts}
        onSelectionChange={setSelectedIds}
      />

      <div className="flex gap-2">
        <button
          onClick={handleDownload}
          disabled={selectedIds.length === 0}
          className="px-4 py-2 bg-blue-500 text-white rounded disabled:opacity-50"
        >
          ⬇️ Download Massa
        </button>
        <button
          onClick={handleGetLinks}
          disabled={selectedIds.length === 0}
          className="px-4 py-2 bg-green-500 text-white rounded disabled:opacity-50"
        >
          🔗 Obter Links
        </button>
      </div>

      {showLinkModal && (
        <MagicLinkModal links={links} onClose={() => setShowLinkModal(false)} />
      )}
    </div>
  );
}
```

---

## ✅ STEP 6: DEPLOY & TEST

```bash
# 1. Run tests
npm run test

# 2. Build
npm run build

# 3. Deploy to STAGING
git push origin feature/f3-f4-bulk

# 4. QA testing (see PLANO_TESTES_QA.md)

# 5. Deploy to PRODUCTION
# (via GitHub Actions or manual)
```

---

## 🎯 FINAL CHECKLIST

- [ ] Migration executed (`prisma migrate deploy`)
- [ ] Dependencies installed (`npm install jszip ...`)
- [ ] Services created (BulkDownloadService + MagicLinkService)
- [ ] All 3 API routes created + tested
- [ ] React components built (multi-select + modals)
- [ ] Integrated in dashboard page
- [ ] Unit tests passing (70%+ coverage)
- [ ] E2E tests passing (critical flows)
- [ ] STAGING deployment green
- [ ] QA sign-off received
- [ ] PROD deployment complete
- [ ] Monitored for first 24h

---

## 🆘 TROUBLESHOOTING

| Problema | Solução |
|----------|---------|
| Migration rollback error | Use `prisma migrate resolve --applied <migration_name>` |
| ZIP too large | Implement streaming response with `PassThrough` stream |
| Modal not showing | Check z-index conflict, ensure isOpen state |
| Copy not working | Verify navigator.clipboard available (HTTPS in prod) |
| Auth returning 403 | Check user.role in session + validate AuthOptions |

---

**Você tem este! 🚀 Boa sorte!**

