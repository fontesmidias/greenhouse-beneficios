import { NextResponse } from 'next/server';
import { db } from '../../../lib/db';
import fs from 'fs';
import path from 'path';
import { PDFDocument, rgb } from 'pdf-lib';
import { sendEmailMessage } from '../../../lib/email';
import { logger } from '../../../lib/logger';

export async function POST(req: Request) {
  try {
    const { token, signature } = await req.json();

    if (!token || !signature) {
      return NextResponse.json({ error: 'Token ou assinatura ausente.' }, { status: 400 });
    }

    const receipts = db.getReceipts();
    const rx = receipts.find((r: any) => r.magicLinkToken === token);

    if (!rx) {
      return NextResponse.json({ error: 'Token inválido ou expirado.' }, { status: 404 });
    }

    if (rx.status === 'ASSINADO') {
      return NextResponse.json({ error: 'Documento já foi assinado anteriormente.' }, { status: 403 });
    }

    // Load Original PDF
    const pdfPath = path.join(process.cwd(), 'uploads', `${rx.id}.pdf`);
    if (!fs.existsSync(pdfPath)) {
      return NextResponse.json({ error: 'Arquivo PDF original não encontrado.' }, { status: 500 });
    }

    const pdfBytes = fs.readFileSync(pdfPath);
    const pdfDoc = await PDFDocument.load(pdfBytes);
    const pages = pdfDoc.getPages();
    const page = pages[0]; // Assuming receipt is single page
    
    // Embed signature PNG
    // signature is a DataURL: data:image/png;base64,....
    const base64Data = signature.replace(/^data:image\/png;base64,/, "");
    const signatureImageBytes = Buffer.from(base64Data, 'base64');
    const signatureImage = await pdfDoc.embedPng(signatureImageBytes);
    
    // Stamp signature on the line 
    // From pdf.ts: drawText('___...', margin, true) at cursorY - 12 (around y=60 to 100 usually).
    // Let's stamp it near the bottom.
    const { width, height } = page.getSize();
    // Signature rectangle centered and anchored exactly between line and date
    const sigRect = { x: (width - 90) / 2, y: 52, width: 90, height: 36 };
    
    page.drawImage(signatureImage, {
      x: sigRect.x,
      y: sigRect.y,
      width: sigRect.width,
      height: sigRect.height,
    });

    // Add Timestamp & IP/Hash (simplistic)
    const ip = req.headers.get('x-forwarded-for') || 'Unknown IP';
    const timestamp = new Date().toISOString();
    const hash = Buffer.from(`${token}-${timestamp}`).toString('base64');
    
    page.drawText(`Assinado Eletronicamente por IP: ${ip}`, { x: 40, y: 30, size: 6, color: rgb(0, 0.5, 0) });
    page.drawText(`Data/Hora: ${new Date(timestamp).toLocaleString('pt-BR')}`, { x: 40, y: 22, size: 6, color: rgb(0, 0.5, 0) });
    page.drawText(`Hash de Autenticidade: ${hash}`, { x: 40, y: 14, size: 6, color: rgb(0, 0.5, 0) });

    const signedPdfBytes = await pdfDoc.save();
    
    // Save signed PDF over the old one or as new? Let's overwrite to keep it simple, or save as -signed.pdf
    const signedPdfPath = path.join(process.cwd(), 'uploads', `${rx.id}-signed.pdf`);
    fs.writeFileSync(signedPdfPath, signedPdfBytes);

    // Update DB
    db.updateReceipt(rx.id, { 
      status: 'ASSINADO',
      assinatura: {
        data: timestamp,
        ip: ip,
        hash: hash
      },
      pdfOriginalPath: signedPdfPath
    });

    // Optionally email them the signed copy
    if (rx.email) {
      try {
         const htmlMsg = `
           <div style="font-family: Arial, sans-serif; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #ccc; border-radius: 10px;">
             <h2 style="color: #10b981;">Cópia Autenticada - GreenHouse</h2>
             <p>Olá <b>${rx.nome}</b>,</p>
             <p>Sua assinatura foi registrada com sucesso.</p>
             <p>Em anexo, sua cópia criptografada e assinada do recibo da competência <b>${rx.competencia}</b>.</p>
           </div>
         `;
         
         // Anexando a cópia autenticada
         await sendEmailMessage(rx.email, `Cópia Autenticada de Recibo - ${rx.competencia}`, htmlMsg, [
           {
             filename: `Recibo_Assinado_${rx.nome.replace(/\s+/g, '_')}_${rx.competencia.replace('/', '-')}.pdf`,
             path: signedPdfPath
           }
         ]);
         // We log it
         logger.info(`Email de confirmação de assinatura enviado para ${rx.email}`);
      } catch (e) {
         logger.error(`Falha ao disparar email de confirmação para ${rx.email}`, { erro: String(e) });
      }
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error('Sign API Error:', err);
    return NextResponse.json({ error: 'Erro processando assinatura.', details: String(err) }, { status: 500 });
  }
}
