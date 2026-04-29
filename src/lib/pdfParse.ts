/**
 * Wrapper sobre pdf-parse v1 para extrair texto de PDFs no disco e
 * aplicar extractFields. Cache em memória por mtime.
 *
 * Por que v1 e não v2: pdf-parse v2 usa pdfjs-dist novo que requer
 * DOMMatrix/OffscreenCanvas (APIs de browser). Falha em Node puro com
 * "DOMMatrix is not defined". v1 usa pdfjs antigo, sem essa dependência.
 *
 * extractFields fica em arquivo separado (pdfExtractFields.ts) para
 * ser testável sem precisar do pdf-parse.
 */

import fs from "fs";
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

  try {
    // Importa direto o lib interno pra pular o bloco de debug do index.js
    // que tenta abrir './test/data/05-versions-space.pdf' (ENOENT em prod)
    const pdfParseMod: any = await import("pdf-parse/lib/pdf-parse.js");
    const pdfParse = pdfParseMod.default || pdfParseMod;
    const buffer = fs.readFileSync(fullPath);
    const result = await pdfParse(buffer);
    const text: string = result?.text || "";

    const parsed = extractFields(text);
    if (parsed.nome || parsed.cpf || parsed.competencia) {
      cache.set(fullPath, { mtime, parsed });
    }
    return parsed;
  } catch (e) {
    console.error("[pdfParse] falha ao parsear", fullPath, String(e));
    return null;
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
