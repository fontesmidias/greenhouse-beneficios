import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

let cachedInstances: any[] = [];
let cacheTimestamp: number = 0;
const CACHE_TTL = 60000; // 1 minute cache for bulk sending

async function getActiveInstances() {
  const now = Date.now();
  if (cachedInstances.length > 0 && (now - cacheTimestamp < CACHE_TTL)) {
    return cachedInstances;
  }
  try {
    const dbInstances = await prisma.evoInstance.findMany({ where: { status: 'ATIVO' } });
    if (dbInstances.length > 0) {
      cachedInstances = dbInstances;
      cacheTimestamp = now;
    }
  } catch (e) {
    console.error('Falha ao buscar instâncias no DB na camada de cache.', e);
  }
  return cachedInstances;
}

export async function sendWhatsAppMessage(phone: string, text: string) {
  let SERVER_URL = process.env.EVO_SERVER_URL;
  let GLOBAL_KEY = process.env.EVO_GLOBAL_KEY;
  let INSTANCE_NAME = process.env.EVO_INSTANCE_NAME;

  try {
     const dbInstances = await getActiveInstances();
     if (dbInstances.length > 0) {
        const rand = dbInstances[Math.floor(Math.random() * dbInstances.length)];
        SERVER_URL = rand.apiUrl;
        GLOBAL_KEY = rand.apiKey;
        INSTANCE_NAME = rand.name;
     }
  } catch (e) {
     console.error('Falha ao usar cache de instâncias, usando fallback de ENV.', e);
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

export async function sendWhatsAppMedia(phone: string, base64Uri: string, fileName: string, caption: string) {
  let SERVER_URL = process.env.EVO_SERVER_URL;
  let GLOBAL_KEY = process.env.EVO_GLOBAL_KEY;
  let INSTANCE_NAME = process.env.EVO_INSTANCE_NAME;

  try {
     const dbInstances = await getActiveInstances();
     if (dbInstances.length > 0) {
        const rand = dbInstances[Math.floor(Math.random() * dbInstances.length)];
        SERVER_URL = rand.apiUrl;
        GLOBAL_KEY = rand.apiKey;
        INSTANCE_NAME = rand.name;
     }
  } catch (e) {
     console.error('Falha ao usar cache de instâncias, usando fallback de ENV.', e);
  }

  if (!SERVER_URL || !GLOBAL_KEY || !INSTANCE_NAME) {
    throw new Error('Evolution API Credentials not fully configured in environment or DB.');
  }

  const numericPhone = phone.replace(/\D/g, '');
  if (!numericPhone || numericPhone.length < 10) return false;
  
  const payload = {
    number: numericPhone,
    options: {
      delay: 1500,
      presence: "composing"
    },
    mediaMessage: {
      mediatype: "document",
      fileName: fileName,
      caption: caption,
      media: base64Uri
    }
  };

  const response = await fetch(`${SERVER_URL}/message/sendMedia/${INSTANCE_NAME}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': GLOBAL_KEY
    },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    const errorBody = await response.text();
    console.error('Evolution API Media Error:', errorBody);
    throw new Error(`Evolution Media API failed with status ${response.status}`);
  }

  return await response.json();
}

