import { db } from './db';
import { sendWhatsAppMessage } from './whatsapp';
import { sendEmailMessage } from './email';

// Global state for polling
declare global {
  var dispatchStatus: any;
}

if (!global.dispatchStatus) {
  global.dispatchStatus = {
    active: false,
    total: 0,
    sent: 0,
    failures: 0,
    etaSeconds: 0,
  };
}

const spintaxVariations = [
  "Olá *{nome}*,\n\nSeu *Recibo de Benefícios* de *{competencia}* já está disponível para assinatura.\n\nSolicitamos que assine ainda hoje em: {link}\n\nEquipe GreenHouse Benefícios",
  
  "Oi *{nome}*,\n\nO *Recibo de Benefícios* referente a *{competencia}* foi liberado.\n\nRequeremos assinatura hoje mesmo: {link}\n\nAbraços,\nGreenHouse",
  
  "Atenção *{nome}*,\n\nSeu *Recibo de Benefícios* de *{competencia}* aguarda sua rubrica digital no portal.\n\nÉ necessário assinar hoje: {link}\n\nGreenHouse Depto Pessoal",
  
  "Saudações *{nome}*,\n\nO *Recibo de Benefícios* (*{competencia}*) precisa da sua assinatura digital com urgência.\n\nLink direto: {link}\n\nObrigado!\nGreenHouse Benefícios",
  
  "*{nome}*,\n\nSeu *Recibo de Benefícios* de *{competencia}* está gerado e aguarda assinatura.\n\nSolicitamos que regularize ainda hoje acessando:\n{link}\n\nGreenHouse DP",
  
  "Notificação GreenHouse\n\n*{nome}*, solicitamos a assinatura eletrônica do seu *Recibo de Benefícios* de *{competencia}* impreterivelmente hoje.\n\nAcesse: {link}",
  
  "Olá *{nome}*,\n\nO departamento pessoal disponibilizou seu *Recibo de Benefícios* de *{competencia}*.\n\nConfirme assinando ainda hoje aqui:\n{link}\n\nGreenHouse",
  
  "Bom dia/tarde *{nome}*,\n\nSeu *Recibo de Benefícios* de *{competencia}* já foi processado e requer assinatura hoje.\n\nAvalize o termo acessando:\n{link}\n\nGreenHouse Benefícios",
  
  "Aviso: *{nome}*,\n\nNão esqueça de conferir e assinar seu *Recibo de Benefícios* de *{competencia}* ainda hoje no portal seguro:\n\n{link}\n\nGreenHouse",
  
  "GreenHouse Informa\n\n*{nome}*, seu *Recibo de Benefícios* de *{competencia}* está apto para assinatura digital. Assine impreterivelmente hoje:\n\n{link}"
];

function getRandomDelay(minSec: number, maxSec: number) {
  return Math.floor(Math.random() * (maxSec - minSec + 1) + minSec) * 1000;
}

export async function processDispatchQueue(
  receiptIds: string[], 
  channels: string[], 
  intervalMin: number, 
  intervalMax: number,
  scheduledTime?: string
) {
  // If scheduled, wait until then
  if (scheduledTime) {
      const targetTime = new Date(scheduledTime).getTime();
      const now = Date.now();
      const difference = targetTime - now;
      if (difference > 0) {
        setTimeout(() => runDispatchLoop(receiptIds, channels, intervalMin, intervalMax), difference);
        return; // Returns immediately, runs later
      }
  }

  // Otherwise run immediately
  runDispatchLoop(receiptIds, channels, intervalMin, intervalMax);
}

async function runDispatchLoop(receiptIds: string[], channels: string[], intervalMin: number, intervalMax: number) {
  global.dispatchStatus.active = true;
  global.dispatchStatus.total = receiptIds.length;
  global.dispatchStatus.sent = 0;
  global.dispatchStatus.failures = 0;

  const receipts = db.getReceipts();
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';

  for (let i = 0; i < receiptIds.length; i++) {
    const id = receiptIds[i];
    const rx = receipts.find((r: any) => r.id === id);
    if (!rx) {
        global.dispatchStatus.failures++;
        continue;
    }

    const magicLink = `${baseUrl}/sign?token=${rx.magicLinkToken}`;
    
    // Pick random spintax
    const randomIndex = Math.floor(Math.random() * spintaxVariations.length);
    let textMsg = spintaxVariations[randomIndex];
    textMsg = textMsg.replace('{nome}', rx.nome).replace('{competencia}', rx.competencia).replace('{link}', magicLink);

    // E-mail HTML
    const htmlMsg = `
      <div style="font-family: Arial, sans-serif; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #ccc; border-radius: 10px;">
        <h2 style="color: #10b981;">GreenHouse Benefícios</h2>
        <p>Olá <b>${rx.nome}</b>,</p>
        <p>O seu recibo eletrônico referente à competência <b>${rx.competencia}</b> já está processado e aguardando sua assinatura.</p>
        <br/>
        <a href="${magicLink}" style="display: inline-block; padding: 12px 24px; background-color: #10b981; color: #fff; text-decoration: none; border-radius: 8px; font-weight: bold;">Acessar e Assinar Documento</a>
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
        }
      }
      
      if (channels.includes('email') && rx.email) {
        try {
           await sendEmailMessage(rx.email, `Assinatura de Recibo - ${rx.competencia}`, htmlMsg);
           db.addDisparo(id, { canal: 'email', data: new Date().toISOString(), status: 'sucesso' });
           sent = true;
        } catch(e: any) {
           db.addDisparo(id, { canal: 'email', data: new Date().toISOString(), status: 'erro', detalhes: String(e) });
        }
      }

      if (sent) global.dispatchStatus.sent++;
      else global.dispatchStatus.failures++;
      
    } catch(e) {
      global.dispatchStatus.failures++;
    }

    // Delay between iterations if not the last item
    if (i < receiptIds.length - 1) {
       const delay = getRandomDelay(intervalMin, intervalMax);
       // Update ETA roughly
       global.dispatchStatus.etaSeconds = Math.round((delay / 1000) * (receiptIds.length - i - 1));
       await new Promise(r => setTimeout(r, delay));
    }
  }

  global.dispatchStatus.active = false;
}
