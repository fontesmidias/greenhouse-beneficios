import { NextResponse, NextRequest } from 'next/server';
import { db } from '../../../lib/db';
import fs from 'fs';
import path from 'path';

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const token = url.searchParams.get('token');

    if (!token) {
      return new NextResponse('Acesso Negado: Token não fornecido.', { status: 401 });
    }

    const receipts = db.getReceipts();
    const rx = receipts.find((r: any) => r.magicLinkToken === token);

    if (!rx) {
      return new NextResponse('Acesso Negado: Documento não localizado.', { status: 404 });
    }

    const pdfPath = rx.pdfOriginalPath || path.join(process.cwd(), 'uploads', `${rx.id}.pdf`);
    
    // Fallback if not absolute path (it should be if running exactly on the same environment, but let's safely locate it)
    let finalPath = pdfPath;
    if (!fs.existsSync(pdfPath)) {
       // if DB stored a container path, try to rebuild it
       finalPath = path.join(process.cwd(), 'uploads', `${rx.id}.pdf`);
       if (!fs.existsSync(finalPath)) {
         return new NextResponse('Documento físico indisponível no servidor.', { status: 404 });
       }
    }

    const pdfBuffer = fs.readFileSync(finalPath);

    return new NextResponse(pdfBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `inline; filename="Recibo_Beneficios_${rx.competencia.replace('/', '-')}.pdf"`
      }
    });

  } catch (err: any) {
    console.error('API PDF Preview Error:', err);
    return new NextResponse(`Erro interno: ${err.message}`, { status: 500 });
  }
}
