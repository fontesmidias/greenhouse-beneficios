import { NextResponse } from 'next/server';
import { processDispatchQueue } from '../../../lib/dispatchQueue';

export async function POST(req: Request) {
  try {
    const { receiptIds, channels, intervalMin = 3, intervalMax = 10, scheduledTime } = await req.json();

    if (!receiptIds || !Array.isArray(receiptIds) || receiptIds.length === 0) {
      return NextResponse.json({ error: 'Nenhum recibo selecionado.' }, { status: 400 });
    }

    if ((global as any).dispatchStatus?.active) {
       return NextResponse.json({ error: 'Já existe um lote em processamento. Aguarde o término.' }, { status: 429 });
    }

    // Fire and forget (Background Queue)
    processDispatchQueue(receiptIds, channels, intervalMin, intervalMax, scheduledTime).catch(e => console.error("Fila quebrou:", e));

    return NextResponse.json({ 
      success: true, 
      message: scheduledTime ? 'Disparo agendado com sucesso!' : 'Iniciando lote assíncrono...' 
    });

  } catch(e: any) {
    console.error('Dispatch API Error:', e);
    return NextResponse.json({ error: 'Erro no motor de disparo', details: String(e) }, { status: 500 });
  }
}
