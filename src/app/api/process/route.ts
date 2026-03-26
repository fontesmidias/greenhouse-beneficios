import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { logger } from '../../../lib/logger';
import { db } from '../../../lib/db';
import { v4 as uuidv4 } from 'uuid';
import { generateReceiptPDF } from '../../../lib/pdf';

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

    for (const record of records) {
      if (!record.NOME || !record.CPF) continue;

      const receiptId = uuidv4();
      const magicToken = uuidv4();
      
      const competenciaVal = record['Competência'] || record['Periodo VA-VT início']?.substring(3) || 'Atual';
      const dataAtualStr = record['DATA ASSINATURA DO RECIBO'] || new Date().toLocaleDateString('pt-BR');

      const receipt = {
        id: receiptId,
        nome: record.NOME,
        cpf: String(record.CPF),
        telefone: String(record.TELEFONE || ''),
        email: record.EMAIL || null,
        competencia: competenciaVal,
        status: 'PENDENTE',
        magicLinkToken: magicToken,
        createdAt: new Date().toISOString()
      };
      
      db.addReceipt(receipt);

      const formatMoney = (val: any) => {
        if (typeof val === 'number') {
          return val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
        }
        return val ? String(val) : 'R$ 0,00';
      };

      const pdfData = {
        nome: String(record.NOME || ''),
        cpf: String(record.CPF || ''),
        ini: String(record['Periodo VA-VT início'] || ''),
        fim: String(record['Periodo VA-VT  fim'] || record['Periodo VA-VT fim'] || ''),
        competencia: String(competenciaVal),
        dias_uteis: String(record['DIAS ÚTEIS'] || '0'),
        valor_unitario_va: formatMoney(record['VALOR UNITÁRIO ALIMENTAÇÃO']),
        valor_unitario_vt: formatMoney(record['VALOR UNITÁRIO VALE TRANSPORTE']),
        va_receita: formatMoney(record['VALOR PAGO VA'] || record['VALE ALIMENTAÇÃO']),
        vt_receita: formatMoney(record['VALOR PAGO VT'] || record['VALE TRANSPORTE']),
        dias_descontados: String(record['DIAS DESCONTADO'] || '0'),
        va_despesa: formatMoney(record['VALOR DESCONTADO VA'] || record['VALE ALIMENTAÇÃO (DESCONTO POR FALTA E ATESTADO)']),
        vt_despesa: formatMoney(record['VALOR DESCONTADO VT'] || record['VALE TRANSPORTE (DESCONTO POR FALTA E ATESTADO)']),
        valor_liquido_depositado_va: formatMoney(record['VALOR LÍQUIDO DEPOSITADO VA']),
        valor_liquido_depositado_vt: formatMoney(record['VALOR LÍQUIDO DEPOSITADO VT']),
        obs: String(record['Observação'] || record['OBSERVACAO'] || ''),
        data_atual: String(dataAtualStr)
      };

      const pdfBytes = await generateReceiptPDF(pdfData);

      const pdfPath = path.join(uploadsDir, `${receiptId}.pdf`);
      fs.writeFileSync(pdfPath, pdfBytes);

      db.updateReceipt(receiptId, { pdfOriginalPath: pdfPath });

      logger.info(`PDF Oficial gerado para CPF: ${receipt.cpf}`, { id: receipt.id });

      successCount++;
    }

    logger.info(`Lote processado com sucesso. Registros: ${successCount}`);
    return NextResponse.json({ success: true, count: successCount }, { status: 200 });
  } catch (error: any) {
    logger.error('Erro catastrofico ao processar e gerar PDFs', { error: String(error) });
    console.error('Erro ao processar e gerar Pdfs:', error);
    return NextResponse.json({ error: 'Falha processando base do Excel.', details: String(error), hint: error.stack }, { status: 500 });
  }
}
