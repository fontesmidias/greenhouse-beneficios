import { NextResponse } from "next/server";
import fs from "fs";
import { requireAdmin } from "@/lib/authz";
import {
  safeOrphanPath,
  parseOrphanFilename,
  buildDownloadFilename,
} from "@/lib/orphans";
import { parsePdfMetadata } from "@/lib/pdfParse";
import { sendEmailMessage } from "@/lib/email";

function buildHtml(message: string | undefined) {
  const corpo =
    (message && message.trim().length > 0
      ? message
      : "Olá! Segue em anexo o seu recibo de benefícios. Em caso de dúvidas, entre em contato com o RH.")
      .replace(/\n/g, "<br/>");

  return `
    <div style="font-family: Arial, sans-serif; color: #333; max-width: 600px; padding: 20px; border: 1px solid #ddd; border-top: 4px solid #10B981; border-radius: 8px;">
      <h2>GreenHouse DP — Recibo de benefícios</h2>
      <p>${corpo}</p>
      <p style="font-size: 12px; color: #777; margin-top: 24px;">Mensagem enviada pela equipe administrativa do GreenHouse.</p>
    </div>
  `;
}

export async function POST(req: Request) {
  const denied = await requireAdmin();
  if (denied) return denied;

  try {
    const body = await req.json();
    const { file, to, message } = body as { file?: string; to?: string; message?: string };

    if (!file || !to) {
      return NextResponse.json(
        { success: false, error: "Parâmetros 'file' e 'to' são obrigatórios." },
        { status: 400 }
      );
    }

    const safePath = safeOrphanPath(file);
    if (!safePath) {
      return NextResponse.json(
        { success: false, error: "Arquivo inválido ou inexistente." },
        { status: 400 }
      );
    }

    const buffer = fs.readFileSync(safePath);
    const { status } = parseOrphanFilename(file);
    const parsed = await parsePdfMetadata(safePath);
    const friendlyName = buildDownloadFilename(file, status, parsed || undefined);

    await sendEmailMessage(
      to.trim(),
      "GreenHouse DP — Recibo de benefícios",
      buildHtml(message),
      [
        {
          filename: friendlyName,
          content: buffer,
          contentType: "application/pdf",
        },
      ]
    );

    console.log("[admin/orphans/send-email] enviado", { file, to, friendlyName });
    return NextResponse.json({ success: true, sentTo: to.trim(), filename: friendlyName });
  } catch (error: any) {
    const errorMsg = error?.response || error?.message || String(error);
    console.error("[admin/orphans/send-email] falha", errorMsg);
    return NextResponse.json({ success: false, error: errorMsg });
  }
}
