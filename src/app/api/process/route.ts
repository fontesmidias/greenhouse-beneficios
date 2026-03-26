import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { PDFDocument, rgb } from 'pdf-lib';
import fs from 'fs';
import path from 'path';

// Instantiate Prisma
const prisma = new PrismaClient();

export async function POST(req: NextRequest) {
  try {
    const { records } = await req.json();
    if (!records || !Array.isArray(records)) {
      return NextResponse.json({ error: 'Nenhum dado enviado.' }, { status: 400 });
    }

    const uploadsDir = path.join(process.cwd(), 'uploads');
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }

    let successCount = 0;

    for (const record of records) {
      if (!record.NOME || !record.CPF) continue;

      // 1. Store the Receipt in the Database to generate the magic link and strict tracking
      const receipt = await prisma.receipt.create({
        data: {
          nome: record.NOME,
          cpf: String(record.CPF),
          telefone: String(record.TELEFONE || ''),
          email: record.EMAIL || null,
          va_valor: Number(record.VA_VALOR_DIARIO || 0),
          vt_valor: Number(record.VT_VALOR_DIARIO || 0),
          dias_uteis: Number(record.DIAS_UTEIS || 0),
          dias_desconto: Number(record.DIAS_DESCONTO || 0),
          observacao: record.OBSERVACAO || '',
          competencia: 'MAIO/2026', // ToDo: Send via frontend input
        }
      });

      // 2. Dynamically Generate the Official PDF File 
      const pdfDoc = await PDFDocument.create();
      const page = pdfDoc.addPage([600, 800]);

      // Draw the design (This is a generic placeholder design for the ticket)
      page.drawText('RECIBO DE BENEFÍCIOS - GREEN HOUSE', { x: 50, y: 750, size: 20, color: rgb(0, 0.5, 0) });
      page.drawText(`Colaborador: ${receipt.nome} | CPF: ${receipt.cpf}`, { x: 50, y: 700, size: 12 });
      
      const calcVA = receipt.va_valor * (receipt.dias_uteis - receipt.dias_desconto);
      const calcVT = receipt.vt_valor * (receipt.dias_uteis - receipt.dias_desconto);

      page.drawText(`Competência: ${receipt.competencia}`, { x: 50, y: 650, size: 14 });
      page.drawText(`Vale Alimentação Total: R$ ${calcVA.toFixed(2)}`, { x: 50, y: 620, size: 14 });
      page.drawText(`Vale Transporte Total: R$ ${calcVT.toFixed(2)}`, { x: 50, y: 590, size: 14 });
      
      if (receipt.observacao) {
        page.drawText(`Observação de Desconto: ${receipt.observacao}`, { x: 50, y: 540, size: 12, color: rgb(0.8, 0, 0) });
      }

      page.drawText('Status da Assinatura: AGUARDANDO ASSINATURA ELETRÔNICA', { x: 50, y: 400, size: 12 });
      page.drawText(`Autenticação Link Único: ${receipt.magicLinkToken}`, { x: 50, y: 380, size: 8, color: rgb(0.5, 0.5, 0.5) });

      // Save PDF to volume
      const pdfBytes = await pdfDoc.save();
      const pdfPath = path.join(uploadsDir, `${receipt.id}.pdf`);
      fs.writeFileSync(pdfPath, pdfBytes);

      // Update the DB record with path
      await prisma.receipt.update({
        where: { id: receipt.id },
        data: { pdfOriginalPath: pdfPath }
      });

      successCount++;
    }

    return NextResponse.json({ success: true, count: successCount }, { status: 200 });
  } catch (error: any) {
    console.error('Erro ao processar e gerar Pdfs:', error);
    return NextResponse.json({ error: 'Falha processando base do Excel.', details: String(error) }, { status: 500 });
  }
}
