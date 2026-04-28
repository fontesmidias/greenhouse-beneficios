/**
 * Extrai metadados (nome, CPF, competência, data assinatura) de PDFs gerados
 * pelo template do sistema (src/lib/pdf.ts). Usa pdf-parse para extrair texto
 * e regex tolerantes pra capturar os campos.
 *
 * Cache em memória (Map) por filename + mtime: evita re-parsear arquivos que
 * não mudaram. Útil porque a tela de órfãos pode chamar a listagem várias
 * vezes em sequência.
 */

import fs from "fs";
import { PDFParse } from "pdf-parse";

export type PdfParsed = {
  nome?: string;
  cpf?: string;
  competencia?: string;
  dataAssinatura?: string;
};

type CacheEntry = { mtime: number; parsed: PdfParsed | null };
const cache = new Map<string, CacheEntry>();

const CPF_REGEX = /(\d{3}\.?\d{3}\.?\d{3}-?\d{2})/;
const COMPETENCIA_REGEX = /Compet[êe]ncia:?\s*(\d{2}\/\d{4})/i;
const COLABORADOR_REGEX = /Colaborador:?\s*([^\n\r]+?)(?:\s{2,}|CPF|$)/i;
const DATA_ASSINATURA_REGEX = /Assinado em:?\s*([^\n\r]+)/i;

function extractFields(text: string): PdfParsed {
  const out: PdfParsed = {};

  const colab = text.match(COLABORADOR_REGEX);
  if (colab && colab[1]) {
    out.nome = colab[1].trim().slice(0, 100);
  }

  const cpf = text.match(CPF_REGEX);
  if (cpf) {
    out.cpf = cpf[1];
  }

  const comp = text.match(COMPETENCIA_REGEX);
  if (comp) {
    out.competencia = comp[1];
  }

  const dataAss = text.match(DATA_ASSINATURA_REGEX);
  if (dataAss && dataAss[1]) {
    out.dataAssinatura = dataAss[1].trim().slice(0, 50);
  }

  return out;
}

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
    // pdf-parse v2 retorna { text, pages, ... } — text agrega todas as páginas
    const text =
      typeof (result as any).text === "string"
        ? (result as any).text
        : Array.isArray((result as any).pages)
          ? (result as any).pages.map((p: any) => p.text || "").join("\n")
          : "";
    const parsed = extractFields(text);
    cache.set(fullPath, { mtime, parsed });
    return parsed;
  } catch (e) {
    cache.set(fullPath, { mtime, parsed: null });
    return null;
  } finally {
    if (parser) {
      try { await parser.destroy(); } catch {}
    }
  }
}

/**
 * Roda parsePdfMetadata em paralelo com limite de concorrência,
 * pra não estourar memória/CPU em volumes com centenas de PDFs.
 */
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
