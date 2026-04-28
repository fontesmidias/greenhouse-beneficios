import {
  normalizeDate,
  normalizeMoney,
  formatCompetencia,
  formatMoneyBRL,
  normalizeAndFormatMoney,
  formatDateBR,
} from "./spreadsheet";

describe("normalizeDate", () => {
  it("retorna null para entradas vazias ou inválidas", () => {
    expect(normalizeDate(null)).toBeNull();
    expect(normalizeDate(undefined)).toBeNull();
    expect(normalizeDate("")).toBeNull();
    expect(normalizeDate("   ")).toBeNull();
    expect(normalizeDate("xyz")).toBeNull();
  });

  it("aceita Date já válido", () => {
    const d = new Date(Date.UTC(2026, 4, 1));
    expect(normalizeDate(d)?.toISOString()).toBe(d.toISOString());
  });

  it("converte serial number do Excel para Date", () => {
    // Serial 45413 corresponde a 01/05/2024 (já validado)
    const result = normalizeDate(45413);
    expect(result?.getUTCFullYear()).toBe(2024);
    expect(result?.getUTCMonth()).toBe(4); // maio
    expect(result?.getUTCDate()).toBe(1);
  });

  it("converte serial number passado como string numérica", () => {
    const result = normalizeDate("45413");
    expect(result?.getUTCMonth()).toBe(4);
  });

  it("trata number puro sempre como serial (veio direto do Excel)", () => {
    // Se a célula vem como number, o Excel já a interpretou como serial.
    expect(normalizeDate(45413)).toBeInstanceOf(Date);
  });

  it("string numérica fora da janela plausível não vira data", () => {
    // String "100" não parece serial Excel (fora de 10000-100000)
    expect(normalizeDate("100")).toBeNull();
  });

  it("parse DD/MM/YYYY", () => {
    const d = normalizeDate("01/05/2026");
    expect(d?.getUTCFullYear()).toBe(2026);
    expect(d?.getUTCMonth()).toBe(4);
    expect(d?.getUTCDate()).toBe(1);
  });

  it("parse YYYY-MM-DD (ISO)", () => {
    const d = normalizeDate("2026-05-01");
    expect(d?.getUTCFullYear()).toBe(2026);
    expect(d?.getUTCMonth()).toBe(4);
    expect(d?.getUTCDate()).toBe(1);
  });

  it("parse DD-MM-YYYY", () => {
    const d = normalizeDate("01-05-2026");
    expect(d?.getUTCMonth()).toBe(4);
  });

  it("parse DD.MM.YYYY", () => {
    const d = normalizeDate("01.05.2026");
    expect(d?.getUTCMonth()).toBe(4);
  });

  it("parse ano de 2 dígitos como 20XX", () => {
    const d = normalizeDate("01/05/26");
    expect(d?.getUTCFullYear()).toBe(2026);
  });

  it("parse data por extenso pt-BR", () => {
    const d = normalizeDate("01 de maio de 2026");
    expect(d?.getUTCFullYear()).toBe(2026);
    expect(d?.getUTCMonth()).toBe(4);
    expect(d?.getUTCDate()).toBe(1);
  });

  it("parse data por extenso pt-BR com mês abreviado", () => {
    const d = normalizeDate("15 de jan de 2026");
    expect(d?.getUTCMonth()).toBe(0);
  });
});

describe("formatCompetencia", () => {
  it("retorna null para datas inválidas", () => {
    expect(formatCompetencia(null)).toBeNull();
  });

  it("formata como MM/AAAA", () => {
    const d = new Date(Date.UTC(2026, 4, 1));
    expect(formatCompetencia(d)).toBe("05/2026");
  });

  it("padding zero no mês", () => {
    const d = new Date(Date.UTC(2026, 0, 15));
    expect(formatCompetencia(d)).toBe("01/2026");
  });
});

describe("normalizeMoney", () => {
  it("retorna null para vazios", () => {
    expect(normalizeMoney(null)).toBeNull();
    expect(normalizeMoney(undefined)).toBeNull();
    expect(normalizeMoney("")).toBeNull();
    expect(normalizeMoney("   ")).toBeNull();
  });

  it("aceita number direto", () => {
    expect(normalizeMoney(46.38)).toBe(46.38);
    expect(normalizeMoney(0)).toBe(0);
  });

  it("aceita decimal pt-BR com vírgula", () => {
    expect(normalizeMoney("46,38")).toBe(46.38);
  });

  it("aceita decimal en-US com ponto", () => {
    expect(normalizeMoney("46.38")).toBe(46.38);
  });

  it("aceita prefixo R$ com espaço", () => {
    expect(normalizeMoney("R$ 46,38")).toBe(46.38);
  });

  it("aceita prefixo R$ sem espaço", () => {
    expect(normalizeMoney("R$46,38")).toBe(46.38);
  });

  it("aceita milhar pt-BR (1.234,56)", () => {
    expect(normalizeMoney("1.234,56")).toBe(1234.56);
  });

  it("aceita milhar pt-BR com R$", () => {
    expect(normalizeMoney("R$ 1.234,56")).toBe(1234.56);
  });

  it("aceita milhar en-US (1,234.56)", () => {
    expect(normalizeMoney("1,234.56")).toBe(1234.56);
  });

  it("aceita inteiros simples", () => {
    expect(normalizeMoney("1234")).toBe(1234);
  });

  it("aceita negativos", () => {
    expect(normalizeMoney("-46,38")).toBe(-46.38);
  });

  it("retorna null para lixo não-numérico", () => {
    expect(normalizeMoney("abc")).toBeNull();
    expect(normalizeMoney("R$ -")).toBeNull();
  });
});

describe("formatMoneyBRL", () => {
  it("formata como BRL pt-BR", () => {
    expect(formatMoneyBRL(46.38)).toMatch(/R\$\s?46,38/);
    expect(formatMoneyBRL(1234.56)).toMatch(/R\$\s?1\.234,56/);
  });

  it("trata null/undefined como zero", () => {
    expect(formatMoneyBRL(null)).toMatch(/R\$\s?0,00/);
    expect(formatMoneyBRL(undefined)).toMatch(/R\$\s?0,00/);
  });
});

describe("normalizeAndFormatMoney (pipeline)", () => {
  it("converte qualquer formato bruto em BRL formatado", () => {
    expect(normalizeAndFormatMoney("R$ 1.234,56")).toMatch(/R\$\s?1\.234,56/);
    expect(normalizeAndFormatMoney(46.38)).toMatch(/R\$\s?46,38/);
    expect(normalizeAndFormatMoney("46.38")).toMatch(/R\$\s?46,38/);
    expect(normalizeAndFormatMoney("")).toMatch(/R\$\s?0,00/);
  });
});

describe("formatDateBR", () => {
  it("formata como DD/MM/AAAA", () => {
    const d = new Date(Date.UTC(2026, 4, 1));
    expect(formatDateBR(d)).toBe("01/05/2026");
  });

  it("retorna null para data inválida", () => {
    expect(formatDateBR(null)).toBeNull();
  });
});

describe("integração: pipeline completo de competência", () => {
  it("serial Excel → Date → MM/AAAA", () => {
    const d = normalizeDate(45413);
    expect(formatCompetencia(d)).toBe("05/2024");
  });

  it("DD/MM/AAAA → Date → MM/AAAA", () => {
    const d = normalizeDate("15/05/2026");
    expect(formatCompetencia(d)).toBe("05/2026");
  });

  it("string vazia não quebra", () => {
    const d = normalizeDate("");
    expect(formatCompetencia(d)).toBeNull();
  });
});
