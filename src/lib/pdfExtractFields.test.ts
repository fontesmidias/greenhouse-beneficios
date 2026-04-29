import { extractFields } from "./pdfExtractFields";

const PDF_ASSINADO = `GREEN HOUSE SERVICOS DE LOCACAO DE MAO DE OBRA LTDA
RECIBO DE PAGAMENTO DE BENEFÍCIO
Competência: 01/2026
Colaborador: JANE PEREIRA FERRAZ CPF: 584.414.681-68
Período: 01/01/2026 até 31/01/2026 Dias Úteis: 21
Diária Alimentação: R$ 2,30 Diária Transporte: R$ 0,00
DESCRIÇÃO VENCIMENTOS DESCONTOS
Vale Alimentação R$ 48,30 R$ 0,00
Vale Transporte R$ 0,00 R$ 0,00
Dias Descontados (Faltas/Atestados) - 0 dias
LÍQUIDO A DEPOSITAR (VA): R$ 48,30
LÍQUIDO A DEPOSITAR (VT): R$ 0,00
Eu, JANE PEREIRA FERRAZ, recebi a quantia discriminada acima, da Empresa GREEN HOUSE SERVIÇOS DE LOCAÇÃO DE
MÃO DE OBRA LTDA, para minha utilização no período indicado.
Observação: PAGAMENTO DE VA RETROATIVO, EM ATENDIMENTO À CCT DO SISDF, APLICADA À ANATAL, REF. AO PERÍODO 01/01/2026
A 31/01/2026, NO VALOR DE R$ 2,30 POR DIA.
Brasília - DF, 01 de fevereiro de 2026.
__________________________________________________________
JANE PEREIRA FERRAZ
CPF: 584.414.681-68
Assinado Eletronicamente por IP: 200.0.81.125
Localização do Dispositivo: Geolocalização não autorizada pelo dispositivo
Data/Hora (BRT): 30/03/2026, 13:06:13
Hash de Autenticidade: MDY2ZjYwZWMtZjgwNS00ZTQ1LTk5YWItMmVhM2MyNmM3ZDBjLTIwMjYtMDMtMzBUMTY6MDY6MTMuNzk1Wg==`;

const PDF_SEM_ASSINATURA = `GREEN HOUSE SERVICOS DE LOCACAO DE MAO DE OBRA LTDA
RECIBO DE PAGAMENTO DE BENEFÍCIO
Competência: 23
Colaborador: LEILA RODRIGUES BARBOSA BRITO CPF: 856.014.111-15
Período: 46023 até 46053 Dias Úteis: 21
Diária Alimentação: R$ 2,30 Diária Transporte: R$ 0,00
DESCRIÇÃO VENCIMENTOS DESCONTOS
Vale Alimentação R$ 48,30 R$ 0,00
Vale Transporte R$ 0,00 R$ 0,00
Dias Descontados (Faltas/Atestados) - 0 dias
LÍQUIDO A DEPOSITAR (VA): R$ 48,30
LÍQUIDO A DEPOSITAR (VT): R$ 0,00
Eu, LEILA RODRIGUES BARBOSA BRITO, recebi a quantia discriminada acima, da Empresa GREEN HOUSE SERVIÇOS DE
LOCAÇÃO DE MÃO DE OBRA LTDA, para minha utilização no período indicado.
Observação: PAGAMENTO DE VA RETROATIVO, EM ATENDIMENTO À CCT DO SISDF, APLICADA À ANATAL, REF. AO PERÍODO 01/01/2026 A 31/01/
Brasília - DF, 01 de fevereiro de 2026.
__________________________________________________________
LEILA RODRIGUES BARBOSA BRITO
CPF: 856.014.111-15`;

describe("extractFields - PDFs reais do template GreenHouse", () => {
  describe("PDF assinado (Jane)", () => {
    const r = extractFields(PDF_ASSINADO);

    it("extrai o nome correto", () => {
      expect(r.nome).toBe("JANE PEREIRA FERRAZ");
    });

    it("extrai CPF", () => {
      expect(r.cpf).toBe("584.414.681-68");
    });

    it("extrai competência", () => {
      expect(r.competencia).toBe("01/2026");
    });

    it("extrai data de assinatura", () => {
      expect(r.dataAssinatura).toContain("30/03/2026");
    });
  });

  describe("PDF não assinado (Leila)", () => {
    const r = extractFields(PDF_SEM_ASSINATURA);

    it("extrai o nome correto", () => {
      expect(r.nome).toBe("LEILA RODRIGUES BARBOSA BRITO");
    });

    it("extrai CPF", () => {
      expect(r.cpf).toBe("856.014.111-15");
    });

    it("competência fica vazia ou cai pra qualquer MM/AAAA visível", () => {
      // O PDF tem "Competência: 23" (lixo do bug do db push antigo).
      // O regex deve ou ignorar ou pegar "01/2026" do Período.
      // Aceitamos qualquer um dos dois.
      if (r.competencia) {
        expect(r.competencia).toMatch(/^\d{2}\/\d{4}$/);
      }
    });

    it("não tem data de assinatura (recibo não foi assinado)", () => {
      expect(r.dataAssinatura).toBeUndefined();
    });
  });

  it("texto vazio retorna objeto vazio", () => {
    expect(extractFields("")).toEqual({});
  });

  it("texto só com lixo retorna objeto vazio", () => {
    expect(extractFields("aaaa bbbb cccc")).toEqual({});
  });
});
