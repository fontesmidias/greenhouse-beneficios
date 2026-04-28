import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

export async function POST(req: Request) {
  try {
    const { token, novaSenha } = await req.json();

    if (!token || !novaSenha || novaSenha.length < 6) {
      return NextResponse.json({ error: "Token inválido ou senha muito curta." }, { status: 400 });
    }

    const user = await prisma.user.findUnique({
      where: { resetToken: token }
    });

    if (!user) {
      return NextResponse.json({ error: "Token inválido ou já utilizado." }, { status: 400 });
    }

    // resetTokenExpiry === null significa "não expira" (criado pelo admin via /api/admin/users).
    // Para tokens com expiry definido (fluxo /forgot), valida o prazo normalmente.
    if (user.resetTokenExpiry && new Date() > user.resetTokenExpiry) {
      return NextResponse.json({ error: "O link de recuperação expirou. Solicite novamente." }, { status: 400 });
    }

    const hashedSenha = await bcrypt.hash(novaSenha, 12);

    await prisma.user.update({
      where: { id: user.id },
      data: {
        senha: hashedSenha,
        resetToken: null,
        resetTokenExpiry: null
      }
    });

    return NextResponse.json({ success: true });

  } catch (error: any) {
    console.error("Reset Password Error:", error);
    return NextResponse.json({ error: "Falha interna no servidor." }, { status: 500 });
  }
}
