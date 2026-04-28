import { NextResponse } from "next/server";
import nodemailer from "nodemailer";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/authz";

type SmtpInline = {
  host: string;
  port: number | string;
  user: string;
  password: string;
  senderName?: string;
};

function buildTestEmailHtml(label: string) {
  return `
    <div style="font-family: Arial, sans-serif; color: #333; max-width: 600px; padding: 20px; border: 1px solid #ddd; border-top: 4px solid #10B981; border-radius: 8px;">
      <h2>Teste de SMTP — GreenHouse DP</h2>
      <p>Se você está lendo este e-mail, a credencial <b>${label}</b> está configurada corretamente.</p>
      <p style="font-size: 12px; color: #777;">Este é um envio de validação disparado pelo painel administrativo.</p>
    </div>
  `;
}

export async function POST(req: Request) {
  const denied = await requireAdmin();
  if (denied) return denied;

  try {
    const body = await req.json();
    const { smtpId, smtpInline, toEmail } = body as {
      smtpId?: string;
      smtpInline?: SmtpInline;
      toEmail: string;
    };

    if (!toEmail || typeof toEmail !== "string") {
      return NextResponse.json({ success: false, error: "Destinatário é obrigatório." }, { status: 400 });
    }

    let host: string;
    let port: number;
    let user: string;
    let pass: string;
    let senderName: string;
    let label: string;

    if (smtpId) {
      const cfg = await prisma.smtpConfig.findUnique({ where: { id: smtpId } });
      if (!cfg) {
        return NextResponse.json({ success: false, error: "Credencial SMTP não encontrada." }, { status: 404 });
      }
      host = cfg.host;
      port = cfg.port;
      user = cfg.user;
      pass = cfg.password;
      senderName = cfg.senderName || cfg.user;
      label = `${cfg.user} (${cfg.host}:${cfg.port})`;
    } else if (smtpInline) {
      if (!smtpInline.host || !smtpInline.port || !smtpInline.user || !smtpInline.password) {
        return NextResponse.json({ success: false, error: "Preencha host, porta, usuário e senha para testar." }, { status: 400 });
      }
      host = smtpInline.host;
      port = Number(smtpInline.port);
      user = smtpInline.user;
      pass = smtpInline.password;
      senderName = smtpInline.senderName || smtpInline.user;
      label = `${smtpInline.user} (${smtpInline.host}:${smtpInline.port})`;
    } else {
      return NextResponse.json({ success: false, error: "Informe smtpId ou smtpInline." }, { status: 400 });
    }

    const transporter = nodemailer.createTransport({
      host,
      port,
      secure: port === 465,
      auth: { user, pass },
      tls: { rejectUnauthorized: false },
    });

    const info = await transporter.sendMail({
      from: `"GreenHouse DP" <${user}>`,
      to: toEmail,
      subject: "Teste de SMTP — GreenHouse DP",
      html: buildTestEmailHtml(label),
    });

    console.log("[admin/settings/test-smtp] sucesso", { label, to: toEmail, messageId: info.messageId });

    return NextResponse.json({ success: true, messageId: info.messageId });
  } catch (error: any) {
    const errorMsg = error?.response || error?.message || String(error);
    console.error("[admin/settings/test-smtp] falha:", errorMsg);
    return NextResponse.json({ success: false, error: errorMsg }, { status: 200 });
    // 200 com success:false é proposital — a UI trata o erro pelo body, não pelo status
  }
}
