import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { sendEmailMessage } from "@/lib/email";
import crypto from "crypto";

async function requireAdmin() {
  const session = await getServerSession(authOptions);
  const role = (session?.user as any)?.role;
  if (!session || role !== "ADMIN") {
    return NextResponse.json({ error: "Acesso negado." }, { status: 403 });
  }
  return null;
}

function buildResendEmailHtml(nome: string, resetLink: string) {
  return `
    <div style="font-family: Arial, sans-serif; color: #333; max-width: 600px; padding: 20px; border: 1px solid #ddd; border-top: 4px solid #10B981; border-radius: 8px;">
      <h2>Link para definir sua senha — GreenHouse DP</h2>
      <p>Olá <b>${nome}</b>,</p>
      <p>O administrador reenviou seu link para definir/redefinir a senha de acesso ao painel.</p>
      <a href="${resetLink}" style="display: inline-block; background-color: #10B981; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; margin-top: 10px;">Definir Minha Senha</a>
      <p style="font-size: 12px; color: #777; margin-top: 24px;">Este link permanece válido até você definir sua senha.</p>
    </div>
  `;
}

export async function POST(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const denied = await requireAdmin();
  if (denied) return denied;

  try {
    const { id } = await ctx.params;
    const user = await prisma.user.findUnique({ where: { id } });
    if (!user) {
      return NextResponse.json({ error: "Usuário não encontrado." }, { status: 404 });
    }

    const resetToken = crypto.randomBytes(32).toString("hex");
    await prisma.user.update({
      where: { id },
      data: { resetToken, resetTokenExpiry: null },
    });

    console.log("[admin/users/resend-reset] Token regerado:", { id, email: user.email });

    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";
    const resetLink = `${baseUrl}/reset?token=${resetToken}`;

    try {
      await sendEmailMessage(
        user.email,
        "Reenvio: defina sua senha — GreenHouse DP",
        buildResendEmailHtml(user.nome, resetLink)
      );
    } catch (e) {
      console.error("[admin/users/resend-reset] Falha ao enviar email:", e);
      return NextResponse.json({ success: true, warning: "Token gerado, mas falha ao enviar email." });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Admin Users resend-reset error:", error);
    return NextResponse.json({ error: "Falha ao reenviar link." }, { status: 500 });
  }
}
