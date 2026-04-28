/**
 * Utilitários para normalizar valores que vêm de planilhas Excel/CSV
 * com formatação inconsistente — o usuário pode digitar dados em
 * células "Geral", "Texto", "Data" ou "Número" e o backend precisa
 * tolerar todos os casos sem quebrar.
 */

const MESES_PT_BR: Record<string, number> = {
  janeiro: 1, jan: 1,
  fevereiro: 2, fev: 2,
  marco: 3, marco_acento: 3, mar: 3, "março": 3,
  abril: 4, abr: 4,
  maio: 5, mai: 5,
  junho: 6, jun: 6,
  julho: 7, jul: 7,
  agosto: 8, ago: 8,
  setembro: 9, set: 9,
  outubro: 10, out: 10,
  novembro: 11, nov: 11,
  dezembro: 12, dez: 12,
};

/**
 * Converte serial number do Excel (dias desde 1899-12-30) em Date UTC.
 * Funciona para datas a partir de 1900-03-01. Datas anteriores podem
 * ser afetadas pelo bug histórico do leap year do Excel — não relevante
 * para folha de pagamento atual.
 */
function excelSerialToDate(serial: number): Date | null {
  if (!Number.isFinite(serial) || serial <= 0) return null;
  const ms = Math.round(serial * 86400 * 1000);
  // Epoch do Excel: 1899-12-30 (UTC)
  const epoch = Date.UTC(1899, 11, 30);
  const date = new Date(epoch + ms);
  if (isNaN(date.getTime())) return null;
  return date;
}

function isValidDate(d: Date | null): d is Date {
  return d instanceof Date && !isNaN(d.getTime());
}

/**
 * Normaliza qualquer entrada plausível de data para Date UTC, ou null.
 * Aceita: serial Excel (number), DD/MM/YYYY, YYYY-MM-DD, DD-MM-YYYY,
 * DD.MM.YYYY, "01 de maio de 2026", Date já válido.
 */
export function normalizeDate(value: unknown): Date | null {
  if (value == null) return null;
  if (value instanceof Date) return isValidDate(value) ? value : null;

  if (typeof value === "number") {
    return excelSerialToDate(value);
  }

  const raw = String(value).trim();
  if (raw === "") return null;

  // Caso o valor seja só dígitos: ou é serial Excel, ou é lixo numérico
  // (ano isolado, número aleatório). Sem outro contexto, é serial só se
  // estiver na janela plausível.
  if (/^\d+(\.\d+)?$/.test(raw)) {
    const asNumber = Number(raw);
    if (asNumber >= 10000 && asNumber <= 100000) {
      return excelSerialToDate(asNumber);
    }
    return null;
  }

  // ISO YYYY-MM-DD ou YYYY/MM/DD
  let m = raw.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})/);
  if (m) {
    const [, y, mo, d] = m;
    const date = new Date(Date.UTC(+y, +mo - 1, +d));
    return isValidDate(date) ? date : null;
  }

  // DD/MM/YYYY, DD-MM-YYYY ou DD.MM.YYYY
  m = raw.match(/^(\d{1,2})[/.\-](\d{1,2})[/.\-](\d{2,4})/);
  if (m) {
    const [, d, mo, yRaw] = m;
    let y = +yRaw;
    if (y < 100) y += 2000; // 26 → 2026
    const date = new Date(Date.UTC(y, +mo - 1, +d));
    return isValidDate(date) ? date : null;
  }

  // "01 de maio de 2026" (pt-BR)
  m = raw
    .toLowerCase()
    .match(/^(\d{1,2})\s+de\s+([a-zçãéíóú]+)\s+de\s+(\d{4})/);
  if (m) {
    const [, d, mesNome, y] = m;
    const mesNum =
      MESES_PT_BR[mesNome] ??
      MESES_PT_BR[mesNome.normalize("NFD").replace(/[̀-ͯ]/g, "")];
    if (mesNum) {
      const date = new Date(Date.UTC(+y, mesNum - 1, +d));
      return isValidDate(date) ? date : null;
    }
  }

  // Última tentativa: parse nativo (cobre alguns formatos exóticos)
  const fallback = new Date(raw);
  return isValidDate(fallback) ? fallback : null;
}

/**
 * Formata uma Date como competência MM/AAAA (mês e ano).
 */
export function formatCompetencia(date: Date | null): string | null {
  if (!isValidDate(date)) return null;
  const mes = String(date.getUTCMonth() + 1).padStart(2, "0");
  const ano = date.getUTCFullYear();
  return `${mes}/${ano}`;
}

/**
 * Normaliza qualquer entrada plausível de valor monetário para number,
 * em unidade de moeda (não centavos), ou null.
 *
 * Aceita: number puro, "46,38", "46.38", "R$ 46,38", "R$1.234,56",
 * "1.234,56" (pt-BR), "1234.56" (en-US), vazio/null/undefined → null.
 */
export function normalizeMoney(value: unknown): number | null {
  if (value == null) return null;
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : null;
  }

  const raw = String(value).trim();
  if (raw === "") return null;

  // Remove R$, espaços, e caracteres não-numéricos (preserva ., , e -)
  let sanitized = raw.replace(/[Rr]\$\s*/g, "").replace(/[^0-9,.\-]/g, "");
  if (sanitized === "" || sanitized === "-") return null;

  const lastComma = sanitized.lastIndexOf(",");
  const lastDot = sanitized.lastIndexOf(".");

  if (lastComma > -1 && lastDot > -1) {
    // Se tem ambos: o último é decimal, o outro é separador de milhar
    if (lastComma > lastDot) {
      // pt-BR: 1.234,56
      sanitized = sanitized.replace(/\./g, "").replace(",", ".");
    } else {
      // en-US: 1,234.56
      sanitized = sanitized.replace(/,/g, "");
    }
  } else if (lastComma > -1) {
    // Só vírgula: tratar como decimal pt-BR (46,38)
    sanitized = sanitized.replace(/\./g, "").replace(",", ".");
  }
  // Só ponto ou só dígitos: já está em formato parseável

  const parsed = parseFloat(sanitized);
  return Number.isFinite(parsed) ? parsed : null;
}

/**
 * Formata um number como string de moeda BRL (R$ 1.234,56).
 * Aceita null/undefined retornando "R$ 0,00" para casos vazios.
 */
export function formatMoneyBRL(value: number | null | undefined): string {
  const num = value == null || !Number.isFinite(value) ? 0 : value;
  return num.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

/**
 * Conveniência: aceita qualquer entrada bruta da planilha e devolve
 * direto a string formatada. Útil para preencher PDFs.
 */
export function normalizeAndFormatMoney(value: unknown): string {
  const num = normalizeMoney(value);
  return formatMoneyBRL(num);
}

/**
 * Formata uma Date como string DD/MM/AAAA (pt-BR), ou null se inválida.
 */
export function formatDateBR(date: Date | null): string | null {
  if (!isValidDate(date)) return null;
  const d = String(date.getUTCDate()).padStart(2, "0");
  const m = String(date.getUTCMonth() + 1).padStart(2, "0");
  const y = date.getUTCFullYear();
  return `${d}/${m}/${y}`;
}
