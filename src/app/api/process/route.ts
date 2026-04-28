import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { logger } from '../../../lib/logger';
import { db } from '../../../lib/db';
import { v4 as uuidv4 } from 'uuid';
import { generateReceiptPDF } from '../../../lib/pdf';
import {
  normalizeDate,
  formatCompetencia,
  normalizeAndFormatMoney,
  formatDateBR,
} from '../../../lib/spreadsheet';

export async function POST(req: NextRequest) {
  try {
    const { records } = await req.json();

    if (!records || !Array.isArray(records)) {
      return NextResponse.json({ error: 'Payload inválido.' }, { status: 400 });
    }

    const uploadsDir = path.join(process.cwd(), 'uploads');
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }

    // Auto-cleanup: remove PDFs older than 30 days automatically
    db.cleanup(30);

    let successCount = 0;
    const skipped: { row: number; reason: string }[] = [];

    for (let idx = 0; idx < records.length; idx++) {
      const record = records[idx];
      const rowNumber = idx + 2; // +1 zero-index, +1 cabeçalho da planilha

      if (!record.NOME || !record.CPF) {
        const reason = 'Linha ignorada: NOME ou CPF ausente.';
        logger.warn(reason, { row: rowNumber, nome: record.NOME, cpf: record.CPF });
        skipped.push({ row: rowNumber, reason });
        continue;
      }

      const receiptId = uuidv4();
      const magicToken = uuidv4();

      // Cálculo da competência tolerante a qualquer formato de data:
      // serial Excel, DD/MM/AAAA, ISO, "01 de maio de 2026", etc.
      const dataInicio = normalizeDate(record['Periodo VA-VT início']);
      const competenciaVal =
        record['Competência'] ||
        formatCompetencia(dataInicio) ||
        'Atual';

      if (!record['Competência'] && !dataInicio) {
        logger.warn('Competência não pôde ser deduzida — usando "Atual" como fallback', {
          row: rowNumber,
          nome: record.NOME,
          cpf: record.CPF,
          rawValue: record['Periodo VA-VT início'],
        });
      }

      // Data de assinatura: aceita string livre OU data normalizável
      let dataAtualStr: string;
      if (record['DATA ASSINATURA DO RECIBO']) {
        const parsed = normalizeDate(record['DATA ASSINATURA DO RECIBO']);
        dataAtualStr = parsed
          ? formatDateBR(parsed) || String(record['DATA ASSINATURA DO RECIBO'])
          : String(record['DATA ASSINATURA DO RECIBO']);
      } else {
        dataAtualStr = new Date().toLocaleDateString('pt-BR');
      }

      const receipt = {
        id: receiptId,
        nome: record.NOME,
        cpf: String(record.CPF),
        telefone: String(record['WHATSAPP FUNCIONARIO'] || ''),
        email: record['EMAIL FUNCIONARIO'] || null,
        competencia: competenciaVal,
        status: 'PENDENTE',
        magicLinkToken: magicToken,
        createdAt: new Date().toISOString()
      };

      db.addReceipt(receipt);

      // Datas formatadas para o PDF (DD/MM/AAAA), tolerantes a qualquer entrada
      const iniDate = normalizeDate(record['Periodo VA-VT início']);
      const fimDate = normalizeDate(
        record['Periodo VA-VT  fim'] || record['Periodo VA-VT fim']
      );

      const pdfData = {
        nome: String(record.NOME || ''),
        cpf: String(record.CPF || ''),
        ini: formatDateBR(iniDate) || String(record['Periodo VA-VT início'] || ''),
        fim:
          formatDateBR(fimDate) ||
          String(record['Periodo VA-VT  fim'] || record['Periodo VA-VT fim'] || ''),
        competencia: String(competenciaVal),
        dias_uteis: String(record['DIAS ÚTEIS'] || '0'),
        valor_unitario_va: normalizeAndFormatMoney(record['VALOR UNITÁRIO ALIMENTAÇÃO']),
        valor_unitario_vt: normalizeAndFormatMoney(record['VALOR UNITÁRIO VALE TRANSPORTE']),
        va_receita: normalizeAndFormatMoney(record['VALOR PAGO VA'] || record['VALE ALIMENTAÇÃO']),
        vt_receita: normalizeAndFormatMoney(record['VALOR PAGO VT'] || record['VALE TRANSPORTE']),
        dias_descontados: String(record['DIAS DESCONTADO'] || '0'),
        va_despesa: normalizeAndFormatMoney(
          record['VALOR DESCONTADO VA'] || record['VALE ALIMENTAÇÃO (DESCONTO POR FALTA E ATESTADO)']
        ),
        vt_despesa: normalizeAndFormatMoney(
          record['VALOR DESCONTADO VT'] || record['VALE TRANSPORTE (DESCONTO POR FALTA E ATESTADO)']
        ),
        valor_liquido_depositado_va: normalizeAndFormatMoney(record['VALOR LÍQUIDO DEPOSITADO VA']),
        valor_liquido_depositado_vt: normalizeAndFormatMoney(record['VALOR LÍQUIDO DEPOSITADO VT']),
        obs: String(record['Observação'] || record['OBSERVACAO'] || ''),
        data_atual: String(dataAtualStr)
      };

      const pdfBytes = await generateReceiptPDF(pdfData);

      const pdfPath = path.join(uploadsDir, `${receiptId}.pdf`);
      fs.writeFileSync(pdfPath, pdfBytes);

      db.updateReceipt(receiptId, { pdfOriginalPath: pdfPath });

      logger.info(`PDF Oficial gerado para CPF: ${receipt.cpf}`, {
        id: receipt.id,
        row: rowNumber,
        competencia: competenciaVal,
      });

      successCount++;
    }

    logger.info(`Lote processado. Sucesso: ${successCount}. Ignorados: ${skipped.length}.`, {
      skipped,
    });
    return NextResponse.json({ success: true, count: successCount, skipped }, { status: 200 });
  } catch (error: any) {
    logger.error('Erro catastrofico ao processar e gerar PDFs', { error: String(error) });
    console.error('Erro ao processar e gerar Pdfs:', error);
    return NextResponse.json({ error: 'Falha processando base do Excel.', details: String(error), hint: error.stack }, { status: 500 });
  }
}
