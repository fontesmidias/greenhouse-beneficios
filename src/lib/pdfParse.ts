/**
 * Extrai metadados (nome, CPF, competência, data assinatura) de PDFs gerados
 * pelo template do sistema (src/lib/pdf.ts). Usa pdf-parse para extrair texto
 * e tenta múltiplas estratégias de regex porque a saída do pdf-parse vinda
 * de PDFs com campos posicionados (drawText em coordenadas absolutas) costuma
 * vir embaralhada.
 *
 * Cache em memória (Map) por filename + mtime: evita re-parsear arquivos que
 * não mudaram.
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
const COMPETENCIA_REGEX = /(\d{2})\s*[/\-.]\s*(\d{4})/;

const MESES_PT = "janeiro|fevereiro|março|abril|maio|junho|julho|agosto|setembro|outubro|novembro|dezembro";
const DATA_PT_REGEX = new RegExp(`(\\d{1,2}\\s+de\\s+(?:${MESES_PT})\\s+de\\s+\\d{4})`, "i");

// Heurística: o PDF do sistema sempre tem o cabeçalho "RECIBO DE PAGAMENTO DE BENEFÍCIO"
// e logo depois a competência. O nome aparece após a palavra "Colaborador".
function extractFields(text: string): PdfParsed {
  const out: PdfParsed = {};

  // Normaliza espaços
  const cleanText = text.replace(/\s+/g, " ").trim();
  // Mantém versão linha-a-linha pra estratégia 2
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  // === CPF: regex direta no texto inteiro ===
  const cpfMatch = cleanText.match(CPF_REGEX);
  if (cpfMatch) {
    out.cpf = cpfMatch[1];
  }

  // === COMPETÊNCIA: vários padrões ===
  // 1) "Competência: 05/2026" ou "Competencia 05/2026"
  let m = cleanText.match(/Compet[êe]ncia[:\s]+(\d{2})[/\-.]?(\d{4})/i);
  if (m) {
    out.competencia = `${m[1]}/${m[2]}`;
  } else {
    // 2) Qualquer MM/AAAA no texto (primeiro encontrado)
    const compAny = cleanText.match(COMPETENCIA_REGEX);
    if (compAny) {
      out.competencia = `${compAny[1]}/${compAny[2]}`;
    }
  }

  // === NOME: várias estratégias em ordem de confiabilidade ===
  let nome: string | undefined;

  // Estratégia A: "Colaborador:" seguido pelo nome até encontrar "CPF" ou ":"
  const colabMatch = cleanText.match(/Colaborador[:\s]+([A-ZÀ-Ú][A-Za-zÀ-ú0-9 .'\-]{2,80}?)\s*(?:CPF|Compet|Per[ií]odo|Di[áa]ria|RECIBO|R\$|\d{3}\.?\d{3}\.?\d{3}-?\d{2}|$)/);
  if (colabMatch && colabMatch[1]) {
    nome = colabMatch[1].trim();
  }

  // Estratégia B: linha-a-linha — "Colaborador" e a próxima linha não vazia
  if (!nome) {
    for (let i = 0; i < lines.length; i++) {
      if (/^Colaborador/i.test(lines[i])) {
        // mesmo linha, depois do label
        const sameLine = lines[i].replace(/^Colaborador:?\s*/i, "").trim();
        if (sameLine.length > 2 && !/^CPF/i.test(sameLine)) {
          nome = sameLine;
          break;
        }
        // ou próxima linha não vazia
        for (let j = i + 1; j < Math.min(i + 4, lines.length); j++) {
          const next = lines[j].trim();
          if (next.length > 2 && !/^CPF/i.test(next) && /[a-zA-ZÀ-ú]/.test(next)) {
            nome = next;
            break;
          }
        }
        break;
      }
    }
  }

  // Estratégia C: pegar o que vem ANTES do CPF (geralmente é o nome no template)
  if (!nome && out.cpf) {
    const idx = cleanText.indexOf(out.cpf);
    if (idx > 0) {
      const before = cleanText.slice(Math.max(0, idx - 120), idx);
      // pega a última sequência de palavras com 2+ caracteres antes do CPF
      const candidates = before.match(/([A-ZÀ-Ú][A-Za-zÀ-ú]+(?:\s+[A-Za-zÀ-ú]+){1,5})\s*(?:CPF[:\s]*)?$/);
      if (candidates) {
        nome = candidates[1].trim();
      }
    }
  }

  // Limpeza final do nome: remove labels que vazaram, limita comprimento
  if (nome) {
    nome = nome
      .replace(/^Colaborador:?\s*/i, "")
      .replace(/\s*CPF.*$/i, "")
      .replace(/\s*\d{3}\.?\d{3}\.?\d{3}-?\d{2}.*$/, "")
      .trim()
      .slice(0, 100);
    if (nome.length >= 3) {
      out.nome = nome;
    }
  }

  // === DATA DA ASSINATURA: padrões variados ===
  let dataAss: string | undefined;
  const dataLabel = cleanText.match(/(?:Assinado em|Data\s+da\s+assinatura|Data\s*[:\s])\s*([^\n\r]+?)(?:\s{2,}|$)/i);
  if (dataLabel && dataLabel[1]) {
    dataAss = dataLabel[1].trim().slice(0, 60);
  } else {
    const dataPt = cleanText.match(DATA_PT_REGEX);
    if (dataPt) dataAss = dataPt[1];
  }
  if (dataAss) {
    out.dataAssinatura = dataAss;
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
 * Limpa o cache de parse (útil quando ajustamos os regex em runtime).
 */
export function clearParseCache() {
  cache.clear();
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
