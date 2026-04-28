import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { sendEmailMessage } from "@/lib/email";
import bcrypt from "bcryptjs";
import crypto from "crypto";

async function requireAdmin() {
  const session = await getServerSession(authOptions);
  const role = (session?.user as any)?.role;
  if (!session || role !== "ADMIN") {
    return NextResponse.json({ error: "Acesso negado." }, { status: 403 });
  }
  return null;
}

function buildWelcomeEmailHtml(nome: string, resetLink: string) {
  return `
    <div style="font-family: Arial, sans-serif; color: #333; max-width: 600px; padding: 20px; border: 1px solid #ddd; border-top: 4px solid #10B981; border-radius: 8px;">
      <h2>Bem-vindo ao GreenHouse DP</h2>
      <p>Olá <b>${nome}</b>,</p>
      <p>Sua conta foi criada pelo administrador da GreenHouse. Para começar a usar, defina sua senha clicando no botão abaixo.</p>
      <a href="${resetLink}" style="display: inline-block; background-color: #10B981; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; margin-top: 10px;">Definir Minha Senha</a>
      <p style="font-size: 12px; color: #777; margin-top: 24px;">Este link permanece válido até você definir sua senha pela primeira vez.</p>
    </div>
  `;
}

export async function GET() {
  const denied = await requireAdmin();
  if (denied) return denied;

  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        nome: true,
        email: true,
        cargo: true,
        role: true,
        status: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json({ users });
  } catch (error: any) {
    console.error("Admin Users GET error:", error);
    return NextResponse.json({ error: "Falha ao listar usuários." }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const denied = await requireAdmin();
  if (denied) return denied;

  try {
    const { nome, email, cargo, role } = await req.json();

    if (!nome || !email) {
      return NextResponse.json({ error: "Nome e e-mail são obrigatórios." }, { status: 400 });
    }

    const emailLower = String(email).toLowerCase().trim();
    const finalRole = role === "ADMIN" ? "ADMIN" : "USER";

    const existing = await prisma.user.findUnique({ where: { email: emailLower } });
    if (existing) {
      return NextResponse.json({ error: "Já existe um usuário com este e-mail." }, { status: 409 });
    }

    const throwawayPassword = crypto.randomBytes(32).toString("hex");
    const hashedSenha = await bcrypt.hash(throwawayPassword, 12);

    const resetToken = crypto.randomBytes(32).toString("hex");

    const newUser = await prisma.user.create({
      data: {
        nome: String(nome).trim(),
        email: emailLower,
        senha: hashedSenha,
        cargo: cargo ? String(cargo).trim() : null,
        status: "ATIVO",
        role: finalRole,
        resetToken,
        resetTokenExpiry: null,
      },
      select: { id: true, nome: true, email: true, role: true, status: true },
    });

    console.log("[admin/users] Usuário criado:", { id: newUser.id, email: newUser.email, role: newUser.role });

    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";
    const resetLink = `${baseUrl}/reset?token=${resetToken}`;

    try {
      await sendEmailMessage(
        emailLower,
        "Bem-vindo ao GreenHouse DP — defina sua senha",
        buildWelcomeEmailHtml(newUser.nome, resetLink)
      );
    } catch (e) {
      console.error("[admin/users] Falha ao enviar email de boas-vindas:", e);
    }

    return NextResponse.json({ success: true, user: newUser });
  } catch (error: any) {
    console.error("Admin Users POST error:", error);
    return NextResponse.json({ error: "Falha interna ao criar usuário." }, { status: 500 });
  }
}
