import { NextRequest, NextResponse } from 'next/server';
import { db } from '../../../lib/db';
import fs from 'fs';

export async function GET(req: NextRequest) {
  try {
    const id = req.nextUrl.searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'É necessário informar o ID do Recibo.' }, { status: 400 });

    const receipts = db.getReceipts();
    const receipt = receipts.find((r: any) => r.id === id);
    
    if (!receipt || !receipt.pdfOriginalPath) {
      return NextResponse.json({ error: 'Recibo não encontrado no banco de dados.' }, { status: 404 });
    }

    const filePath = receipt.pdfOriginalPath;
    if (!fs.existsSync(filePath)) {
      return NextResponse.json({ error: 'O Arquivo físico PDF não foi localizado ou foi apagado.' }, { status: 404 });
    }

    const fileBuffer = fs.readFileSync(filePath);
    
    // Normalize filename
    const safeName = receipt.nome.replace(/[^a-zA-Z0-9]/g, '_');

    return new NextResponse(fileBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="Recibo_Beneficios_${safeName}_${receipt.competencia.replace('/', '')}.pdf"`
      }
    });

  } catch (error: any) {
    console.error("Error serving download:", error);
    return NextResponse.json({ error: 'Falha interna ao realizar o download.' }, { status: 500 });
  }
}
