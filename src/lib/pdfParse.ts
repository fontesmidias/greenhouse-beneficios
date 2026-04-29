/**
 * Wrapper sobre pdf-parse v2 (PDFParse class) para extrair texto de
 * PDFs no disco e aplicar extractFields. Cache em memória por mtime.
 *
 * extractFields fica em arquivo separado (pdfExtractFields.ts) para
 * ser testável sem precisar do pdf-parse no Jest (que usa import.meta).
 */

import fs from "fs";
import { PDFParse } from "pdf-parse";
import { extractFields, type PdfParsed } from "./pdfExtractFields";

export type { PdfParsed } from "./pdfExtractFields";
export { extractFields } from "./pdfExtractFields";

type CacheEntry = { mtime: number; parsed: PdfParsed };
const cache = new Map<string, CacheEntry>();

export async function parsePdfMetadata(fullPath: string): Promise<PdfParsed | null> {
  let mtime: number;
  try {
    mtime = fs.statSync(fullPath).mtimeMs;
  } catch {
    return null;
  }

  const cached = cache.get(fullPath);
  if (cached && cached.mtime === mtime) {
    return cached.parsed;
  }

  let parser: PDFParse | null = null;
  try {
    const buffer = fs.readFileSync(fullPath);
    parser = new PDFParse({ data: new Uint8Array(buffer) });
    const result = await parser.getText();
    const text =
      typeof (result as any).text === "string"
        ? (result as any).text
        : Array.isArray((result as any).pages)
          ? (result as any).pages.map((p: any) => p.text || "").join("\n")
          : "";

    const parsed = extractFields(text);
    // Só cacheia resultados positivos (algum campo foi extraído).
    // Nulls são re-tentados — permite reidentificar após ajuste de regex
    // sem precisar limpar manualmente.
    if (parsed.nome || parsed.cpf || parsed.competencia) {
      cache.set(fullPath, { mtime, parsed });
    }
    return parsed;
  } catch (e) {
    return null;
  } finally {
    if (parser) {
      try { await parser.destroy(); } catch {}
    }
  }
}

export function clearParseCache() {
  cache.clear();
}

export async function parseMany<T extends { filename: string }>(
  items: T[],
  uploadsDir: string,
  concurrency: number = 5
): Promise<Map<string, PdfParsed | null>> {
  const results = new Map<string, PdfParsed | null>();
  const queue = [...items];

  async function worker() {
    while (queue.length > 0) {
      const item = queue.shift();
      if (!item) return;
      const fullPath = `${uploadsDir}/${item.filename}`;
      const parsed = await parsePdfMetadata(fullPath);
      results.set(item.filename, parsed);
    }
  }

  const workers = Array.from({ length: Math.min(concurrency, items.length) }, worker);
  await Promise.allSettled(workers);
  return results;
}
