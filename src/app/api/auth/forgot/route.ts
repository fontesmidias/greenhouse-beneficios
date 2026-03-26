import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendEmailMessage } from "@/lib/email";
import crypto from "crypto";

export async function POST(req: Request) {
  try {
    const { email } = await req.json();

    if (!email) {
      return NextResponse.json({ error: "E-mail não fornecido." }, { status: 400 });
    }

    const emailLower = email.toLowerCase().trim();

    const user = await prisma.user.findUnique({
      where: { email: emailLower }
    });

    // To prevent email enumeration attacks, always return success even if user doesn't exist.
    if (!user) {
      return NextResponse.json({ success: true });
    }

    if (user.status !== "ATIVO") {
       return NextResponse.json({ error: "Sua conta ainda não está ativa. Contate o Administrador." }, { status: 403 });
    }

    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetTokenExpiry = new Date(Date.now() + 3600000); // 1 hour

    await prisma.user.update({
      where: { id: user.id },
      data: {
        resetToken,
        resetTokenExpiry
      }
    });

    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";
    const resetLink = `${baseUrl}/reset?token=${resetToken}`;
    
    const htmlMsg = `
      <div style="font-family: Arial, sans-serif; color: #333; max-width: 600px; padding: 20px; border: 1px solid #ddd; border-top: 4px solid #0EA5E9; border-radius: 8px;">
        <h2>Recuperação de Acesso - GreenHouse DP</h2>
        <p>Olá <b>${user.nome}</b>,</p>
        <p>Recebemos uma solicitação para redefinir a senha da sua conta.</p>
        <p>Clique no botão abaixo para escolher uma nova senha. Este link é válido por apenas 1 hora.</p>
        <br/>
        <a href="${resetLink}" style="display: inline-block; background-color: #0EA5E9; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">Redefinir Minha Senha</a>
        <br/><br/>
        <p style="font-size: 12px; color: #777;">Se você não solicitou essa redefinição, ignore este e-mail. A sua senha atual permanecerá segura.</p>
      </div>
    `;

    try {
      await sendEmailMessage(user.email, "Recuperação de Senha Segura", htmlMsg);
    } catch (e) {
      console.error("Falha ao enviar email de reset", e);
    }

    return NextResponse.json({ success: true });

  } catch (error: any) {
    console.error("Forgot Password Error:", error);
    return NextResponse.json({ error: "Falha interna no servidor." }, { status: 500 });
  }
}
