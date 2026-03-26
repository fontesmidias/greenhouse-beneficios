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

    if (!user || !user.resetTokenExpiry) {
      return NextResponse.json({ error: "Token inválido ou expirado." }, { status: 400 });
    }

    if (new Date() > user.resetTokenExpiry) {
      return NextResponse.json({ error: "O link de recuperação expirou (1 hora). Solicite novamente." }, { status: 400 });
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
