import nodemailer from 'nodemailer';

export async function sendEmailMessage(to: string, subject: string, html: string, attachments?: any[]) {
  const HOST = process.env.SMTP_HOST;
  const PORT = Number(process.env.SMTP_PORT);
  const USER = process.env.SMTP_USER;
  const PASS = process.env.SMTP_PASS;

  if (!HOST || !USER || !PASS) {
    throw new Error('SMTP Config is missing in environment variables.');
  }

  const transporter = nodemailer.createTransport({
    host: HOST,
    port: PORT,
    secure: PORT === 465,
    auth: {
      user: USER,
      pass: PASS
    },
    tls: {
      rejectUnauthorized: false
    }
  });

  const info = await transporter.sendMail({
    from: `"GreenHouse DP" <${USER}>`,
    to,
    subject,
    html,
    attachments
  });

  return info;
}
