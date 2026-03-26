import { NextResponse } from 'next/server';
import { db } from '../../../lib/db';
import { sendWhatsAppMessage } from '../../../lib/whatsapp';
import { sendEmailMessage } from '../../../lib/email';

export async function POST(req: Request) {
  try {
    const { receiptIds, channels } = await req.json();

    if (!receiptIds || !Array.isArray(receiptIds) || receiptIds.length === 0) {
      return NextResponse.json({ error: 'Nenhum recibo selecionado para disparo.' }, { status: 400 });
    }

    const receipts = db.getReceipts();
    let successCount = 0;
    let failures = [];

    for (const id of receiptIds) {
      const rx = receipts.find((r: any) => r.id === id);
      if (!rx) continue;

      // The Magic Link pointing to the future Colaborador signature page
      const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
      const magicLink = `${baseUrl}/sign?token=${rx.magicLinkToken}`;

      const textMsg = `Olá *${rx.nome}*,\nSeu recibo de benefícios da competência *${rx.competencia}* já está disponível.\n\nPor favor, acesse o link seguro abaixo para realizar sua Assinatura Eletrônica:\n${magicLink}\n\n_GreenHouse Operações_`;
      
      const htmlMsg = `
        <div style="font-family: Arial, sans-serif; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #ccc; border-radius: 10px;">
          <h2 style="color: #10b981;">GreenHouse Benefícios</h2>
          <p>Olá <b>${rx.nome}</b>,</p>
          <p>O seu recibo eletrônico referente à competência <b>${rx.competencia}</b> já está processado e aguardando sua assinatura.</p>
          <br/>
          <a href="${magicLink}" style="display: inline-block; padding: 12px 24px; background-color: #10b981; color: #fff; text-decoration: none; border-radius: 8px; font-weight: bold;">Acessar e Assinar Documento</a>
          <br/><br/>
          <p style="font-size: 12px; color: #777;">Este é um link mágico e intransferível. Não o compartilhe com terceiros.</p>
        </div>
      `;

      try {
        let sent = false;
        if (channels.includes('whatsapp') && rx.telefone) {
          try {
            await sendWhatsAppMessage(rx.telefone, textMsg);
            db.addDisparo(id, { canal: 'whatsapp', data: new Date().toISOString(), status: 'sucesso' });
            sent = true;
          } catch (e: any) {
            db.addDisparo(id, { canal: 'whatsapp', data: new Date().toISOString(), status: 'erro', detalhes: String(e) });
            failures.push({ id, error: `WhatsApp Error: ${String(e)}` });
          }
        }
        if (channels.includes('email') && rx.email) {
          try {
             await sendEmailMessage(rx.email, `Assinatura de Recibo - ${rx.competencia}`, htmlMsg);
             db.addDisparo(id, { canal: 'email', data: new Date().toISOString(), status: 'sucesso' });
             sent = true;
          } catch(e: any) {
             db.addDisparo(id, { canal: 'email', data: new Date().toISOString(), status: 'erro', detalhes: String(e) });
             failures.push({ id, error: `Email Error: ${String(e)}` });
          }
        }

        if (sent) {
          successCount++;
        } else if (!channels.includes('whatsapp') && !channels.includes('email')) {
           failures.push({ id, error: 'Nenhum canal selecionado' });
        } else if (!sent && failures.length === 0) {
           failures.push({ id, error: 'Contato não possui os dados telefônicos ou email cadastrados na planilha' });
           db.addDisparo(id, { canal: 'email', data: new Date().toISOString(), status: 'erro', detalhes: 'Destinatário sem contatos' });
        }
      } catch(e: any) {
        failures.push({ id, error: e.message || String(e) });
      }
    }

    return NextResponse.json({ success: true, count: successCount, failures });
  } catch(e: any) {
    console.error('Dispatch API Crash:', e);
    return NextResponse.json({ error: 'Falha letal no motor de mensageria', details: String(e) }, { status: 500 });
  }
}
