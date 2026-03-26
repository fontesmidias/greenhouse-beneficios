import fs from 'fs';
import path from 'path';

const dbPath = path.join(process.cwd(), 'data', 'receipts.json');

export const db = {
  getReceipts: () => {
    if (!fs.existsSync(dbPath)) return [];
    try {
      return JSON.parse(fs.readFileSync(dbPath, 'utf-8'));
    } catch {
      return [];
    }
  },
  addReceipt: (receipt: any) => {
    const receipts = db.getReceipts();
    receipts.push(receipt);
    if (!fs.existsSync(path.dirname(dbPath))) fs.mkdirSync(path.dirname(dbPath), { recursive: true });
    fs.writeFileSync(dbPath, JSON.stringify(receipts, null, 2));
  },
  updateReceipt: (id: string, updates: any) => {
    const receipts = db.getReceipts();
    const index = receipts.findIndex((r: any) => r.id === id);
    if (index !== -1) {
      receipts[index] = { ...receipts[index], ...updates };
      fs.writeFileSync(dbPath, JSON.stringify(receipts, null, 2));
    }
  },
  cleanup: (days: number = 30) => {
    const receipts = db.getReceipts();
    const thresholdDate = new Date();
    thresholdDate.setDate(thresholdDate.getDate() - days);

    const keptReceipts = receipts.filter((r: any) => {
      const createdAt = new Date(r.createdAt || new Date());
      if (createdAt < thresholdDate) {
        // Delete physical PDF
        if (r.pdfOriginalPath && fs.existsSync(r.pdfOriginalPath)) {
          fs.unlinkSync(r.pdfOriginalPath);
        }
        return false;
      }
      return true;
    });

    if (keptReceipts.length < receipts.length) {
      fs.writeFileSync(dbPath, JSON.stringify(keptReceipts, null, 2));
    }
  },
  deleteLot: (competencia: string) => {
    const receipts = db.getReceipts();
    const keptReceipts = receipts.filter((r: any) => {
      if (r.competencia === competencia) {
        if (r.pdfOriginalPath && fs.existsSync(r.pdfOriginalPath)) {
          try { fs.unlinkSync(r.pdfOriginalPath); } catch {}
        }
        return false;
      }
      return true;
    });
    fs.writeFileSync(dbPath, JSON.stringify(keptReceipts, null, 2));
  },
  deleteReceipt: (id: string) => {
    const receipts = db.getReceipts();
    const keptReceipts = receipts.filter((r: any) => {
      if (r.id === id) {
        if (r.pdfOriginalPath && fs.existsSync(r.pdfOriginalPath)) {
          try { fs.unlinkSync(r.pdfOriginalPath); } catch {}
        }
        return false;
      }
      return true;
    });
    if (keptReceipts.length < receipts.length) {
      fs.writeFileSync(dbPath, JSON.stringify(keptReceipts, null, 2));
    }
  }
};
