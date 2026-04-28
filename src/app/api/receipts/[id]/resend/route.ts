import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { sendEmailMessage } from "@/lib/email";
import { sendWhatsAppMessage } from "@/lib/whatsapp";
import { logger } from "@/lib/logger";

type Channel = "email" | "whatsapp" | "both";

function buildEmailHtml(nome: string, link: string) {
  return `
    <div style="font-family: Arial, sans-serif; color: #333; max-width: 600px; padding: 20px; border: 1px solid #ddd; border-top: 4px solid #10B981; border-radius: 8px;">
      <h2>Reenvio do seu recibo de benefícios</h2>
      <p>Olá <b>${nome}</b>,</p>
      <p>Segue novamente o seu recibo de benefícios para assinatura digital.</p>
      <a href="${link}" style="display: inline-block; background-color: #10B981; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; margin-top: 10px;">Acessar e Assinar</a>
      <p style="font-size: 12px; color: #777; margin-top: 24px;">Se você já assinou, pode desconsiderar este e-mail.</p>
    </div>
  `;
}

function buildWhatsAppText(nome: string, link: string) {
  return `Olá ${nome}! Segue novamente seu recibo de benefícios para assinatura digital:\n\n${link}\n\nSe você já assinou, pode desconsiderar esta mensagem.`;
}

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  // Autorização: qualquer usuário ATIVO logado pode reenviar (operação rotineira do DP).
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
  }

  try {
    const { id } = await ctx.params;
    const body = await req.json();
    const channel: Channel = body?.channel || "both";

    if (!["email", "whatsapp", "both"].includes(channel)) {
      return NextResponse.json({ error: "Canal inválido." }, { status: 400 });
    }

    const receipts = db.getReceipts();
    const receipt = receipts.find((r: any) => r.id === id);
    if (!receipt) {
      return NextResponse.json({ error: "Recibo não encontrado." }, { status: 404 });
    }
    if (!receipt.magicLinkToken) {
      return NextResponse.json(
        { error: "Recibo sem link de assinatura. Regenere primeiro." },
        { status: 400 }
      );
    }

    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || new URL(req.url).origin;
    const link = `${baseUrl}/sign?token=${receipt.magicLinkToken}`;
    const nome = receipt.nome || "colaborador";

    const sent: { email: boolean; whatsapp: boolean } = { email: false, whatsapp: false };
    const errors: { email?: string; whatsapp?: string } = {};

    const wantEmail = channel === "email" || channel === "both";
    const wantWhats = channel === "whatsapp" || channel === "both";

    if (wantEmail) {
      if (!receipt.email) {
        errors.email = "Sem e-mail cadastrado para este recibo.";
      } else {
        try {
          await sendEmailMessage(
            receipt.email,
            "Reenvio do seu recibo — GreenHouse DP",
            buildEmailHtml(nome, link)
          );
          sent.email = true;
        } catch (e: any) {
          errors.email = e?.message || String(e);
        }
      }
    }

    if (wantWhats) {
      if (!receipt.telefone) {
        errors.whatsapp = "Sem WhatsApp cadastrado para este recibo.";
      } else {
        try {
          const result = await sendWhatsAppMessage(receipt.telefone, buildWhatsAppText(nome, link));
          if (result === false) {
            errors.whatsapp = "Número de WhatsApp inválido.";
          } else {
            sent.whatsapp = true;
          }
        } catch (e: any) {
          errors.whatsapp = e?.message || String(e);
        }
      }
    }

    const success = sent.email || sent.whatsapp;

    logger.info(`Reenvio de recibo ${success ? "OK" : "FALHA"}`, {
      receiptId: id,
      channel,
      sent,
      errors,
      requestedBy: (session.user as any)?.email,
    });

    return NextResponse.json({ success, sent, errors });
  } catch (error: any) {
    logger.error("Erro ao reenviar recibo", { error: String(error) });
    return NextResponse.json({ error: "Falha interna ao reenviar." }, { status: 500 });
  }
}
