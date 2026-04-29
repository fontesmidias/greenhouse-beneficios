/**
 * Extração de campos do texto bruto de um PDF do template GreenHouse.
 * Função pura, sem dependência de pdf-parse — fácil de testar com snapshots
 * de texto real.
 */

export type PdfParsed = {
  nome?: string;
  cpf?: string;
  competencia?: string;
  dataAssinatura?: string;
};

const CPF_REGEX = /(\d{3}\.?\d{3}\.?\d{3}-?\d{2})/;

export function extractFields(rawText: string): PdfParsed {
  const out: PdfParsed = {};

  const text = (rawText || "").normalize("NFC");
  const cleanText = text.replace(/\s+/g, " ").trim();
  const lines = text.split(/\r?\n/).map((l) => l.trim()).filter((l) => l.length > 0);

  // === CPF ===
  const cpfMatch = cleanText.match(CPF_REGEX);
  if (cpfMatch) out.cpf = cpfMatch[1];

  // === COMPETÊNCIA ===
  // Ordem: 1) "Competência: MM/AAAA" 2) qualquer MM/AAAA solto no texto
  let cm = cleanText.match(/Compet[êe]ncia\s*:?\s*(\d{1,2})\s*\/\s*(\d{4})/i);
  if (cm) {
    out.competencia = `${cm[1].padStart(2, "0")}/${cm[2]}`;
  } else {
    const any = cleanText.match(/\b(\d{1,2})\/(\d{4})\b/);
    if (any) out.competencia = `${any[1].padStart(2, "0")}/${any[2]}`;
  }

  // === NOME ===
  let nome: string | undefined;

  // Estratégia 1 (mais confiável): "Eu, NOME, recebi"
  const euMatch = cleanText.match(/\bEu\s*,\s*([^,]{3,100}?)\s*,\s*recebi/i);
  if (euMatch && euMatch[1]) {
    nome = euMatch[1].trim();
  }

  // Estratégia 2: "Colaborador: NOME CPF"
  if (!nome) {
    const colab = cleanText.match(/Colaborador\s*:?\s*([A-ZÀ-Ú][^\n\r]{2,100}?)\s+CPF/);
    if (colab && colab[1]) {
      nome = colab[1].trim();
    }
  }

  // Estratégia 3: linha "Colaborador" + próxima linha não vazia
  if (!nome) {
    for (let i = 0; i < lines.length; i++) {
      if (/^Colaborador/i.test(lines[i])) {
        const same = lines[i].replace(/^Colaborador\s*:?\s*/i, "").replace(/\s*CPF.*$/i, "").trim();
        if (same.length > 2 && !/^CPF/i.test(same)) {
          nome = same;
          break;
        }
        for (let j = i + 1; j < Math.min(i + 4, lines.length); j++) {
          const cand = lines[j];
          if (cand.length > 2 && !/^CPF/i.test(cand) && /[A-ZÀ-Ú]/.test(cand)) {
            nome = cand.replace(/\s*CPF.*$/i, "").trim();
            break;
          }
        }
        break;
      }
    }
  }

  // Estratégia 4: o que vem antes do CPF
  if (!nome && out.cpf) {
    const idx = cleanText.indexOf(out.cpf);
    if (idx > 0) {
      const before = cleanText.slice(Math.max(0, idx - 150), idx);
      const cand = before.match(/([A-ZÀ-Ú][A-Za-zÀ-ú]+(?:\s+[A-Za-zÀ-ú]+){1,5})\s*(?:CPF\s*:?\s*)?$/);
      if (cand) nome = cand[1].trim();
    }
  }

  if (nome) {
    nome = nome
      .replace(/^Colaborador\s*:?\s*/i, "")
      .replace(/\s*CPF.*$/i, "")
      .replace(/\s*\d{3}\.?\d{3}\.?\d{3}-?\d{2}.*$/, "")
      .trim()
      .slice(0, 100);
    if (nome.length >= 3) out.nome = nome;
  }

  // === DATA ASSINATURA ===
  // Padrão observado no template: "Data/Hora (BRT): 30/03/2026, 13:06:13"
  let data: string | undefined;
  const brt = cleanText.match(/Data\/Hora\s*\(BRT\)\s*:\s*(\d{2}\/\d{2}\/\d{4}(?:\s*,\s*\d{2}:\d{2}:\d{2})?)/i);
  if (brt) {
    data = brt[1].trim();
  } else {
    const ass = cleanText.match(/Assinado\s+(?:em|Eletronicamente)?[^:]*:?\s*(\d{2}\/\d{2}\/\d{4}[^,\n]*)/i);
    if (ass) data = ass[1].trim().slice(0, 60);
  }
  if (data) out.dataAssinatura = data;

  return out;
}
