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
  "Olá *{nome}*, seu recibo de *{competencia}* já está disponível para assinatura. Acesse {link}. Equipe GreenHouse.",
  "Oi *{nome}*! O recibo da compt. *{competencia}* foi liberado. Por favor, assine-o em {link}. Abraços, GreenHouse.",
  "Atenção *{nome}*, o documento de *{competencia}* aguarda sua rubrica digital no portal: {link} - GreenHouse Depto Pessoal.",
  "Saudações *{nome}*, passamos para avisar que o recibo (*{competencia}*) precisa da sua assinatura. Link direto: {link}. Obrigado!",
  "*{nome}*, tudo bem? Seu comprovante *{competencia}* está gerado. Acesse a área restrita para assinar: {link}. GreenHouse DP.",
  "Notificação GreenHouse: *{nome}*, solicitamos a assinatura eletrônica do mês *{competencia}*. É rápido: {link}.",
  "Olá! O departamento pessoal disponibilizou o novo recibo *{competencia}* para *{nome}*. Confirme assinando aqui: {link}.",
  "Bom dia/tarde *{nome}*. O seu holerite/recibo de *{competencia}* já foi subido ao cofre. Avalize o termo acessando {link}.",
  "Aviso: *{nome}*, não esqueça de conferir e assinar os benefícios referentes a *{competencia}* no endereço seguro: {link}.",
  "GreenHouse Informa: *{nome}*, o processo *{competencia}* já se encontra apto para via digital. Assine em {link}."
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
