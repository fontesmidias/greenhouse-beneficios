export async function sendWhatsAppMessage(phone: string, text: string) {
  const SERVER_URL = process.env.EVO_SERVER_URL;
  const GLOBAL_KEY = process.env.EVO_GLOBAL_KEY;
  const INSTANCE_NAME = process.env.EVO_INSTANCE_NAME;

  if (!SERVER_URL || !GLOBAL_KEY || !INSTANCE_NAME) {
    throw new Error('Evolution API Credentials not fully configured in environment.');
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
