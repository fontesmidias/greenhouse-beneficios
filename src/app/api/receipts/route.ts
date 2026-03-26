import { NextResponse } from 'next/server';
import { db } from '../../../lib/db';

export async function GET() {
  try {
    const receipts = db.getReceipts();
    
    // Group receipts by 'competencia' (Lot)
    const lotsMap: Record<string, any> = {};
    
    for (const r of receipts) {
      if (!lotsMap[r.competencia]) {
        lotsMap[r.competencia] = {
          competencia: r.competencia,
          total: 0,
          assinados: 0,
          pendentes: 0,
          receipts: []
        };
      }
      
      lotsMap[r.competencia].total++;
      if (r.status === 'ASSINADO') {
        lotsMap[r.competencia].assinados++;
      } else {
        lotsMap[r.competencia].pendentes++;
      }
      
      lotsMap[r.competencia].receipts.push(r);
    }

    const lotsArray = Object.values(lotsMap).sort((a: any, b: any) => b.competencia.localeCompare(a.competencia));

    return NextResponse.json({ success: true, lots: lotsArray }, { status: 200 });
  } catch (error: any) {
    console.error("Error fetching receipts:", error);
    return NextResponse.json({ error: 'Falha ao buscar os lotes no banco de dados.' }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const lotId = searchParams.get('competencia');
    const receiptId = searchParams.get('id');

    if (receiptId) {
      db.deleteReceipt(receiptId);
      return NextResponse.json({ success: true });
    }

    if (lotId) {
      db.deleteLot(lotId);
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: 'Parâmetro inválido' }, { status: 400 });
  } catch(e) {
    return NextResponse.json({ error: 'Falha na Exclusão' }, { status: 500 });
  }
}
