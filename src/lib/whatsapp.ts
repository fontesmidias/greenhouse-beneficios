import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function sendWhatsAppMessage(phone: string, text: string) {
  let SERVER_URL = process.env.EVO_SERVER_URL;
  let GLOBAL_KEY = process.env.EVO_GLOBAL_KEY;
  let INSTANCE_NAME = process.env.EVO_INSTANCE_NAME;

  try {
     const dbInstances = await prisma.evoInstance.findMany({ where: { status: 'ATIVO' } });
     if (dbInstances.length > 0) {
        const rand = dbInstances[Math.floor(Math.random() * dbInstances.length)];
        SERVER_URL = rand.apiUrl;
        GLOBAL_KEY = rand.apiKey;
        INSTANCE_NAME = rand.name;
     }
  } catch (e) {
     console.error('Falha ao buscar instâncias no DB, usando fallback de ENV.', e);
  }

  if (!SERVER_URL || !GLOBAL_KEY || !INSTANCE_NAME) {
    throw new Error('Evolution API Credentials not fully configured in environment or DB.');
  }

  // Sanitize the phone number
  const numericPhone = phone.replace(/\D/g, '');
  if (!numericPhone || numericPhone.length < 10) return false;
  
  const payload = {
    number: numericPhone,
    options: {
      delay: 1500, // human-like typing delay
      presence: "composing"
    },
    text: text
  };

  const response = await fetch(`${SERVER_URL}/message/sendText/${INSTANCE_NAME}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': GLOBAL_KEY
    },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    const errorBody = await response.text();
    console.error('Evolution API Error:', errorBody);
    throw new Error(`Evolution API failed with status ${response.status}`);
  }

  return await response.json();
}
