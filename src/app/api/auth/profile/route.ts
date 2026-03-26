import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user) {
      return NextResponse.json({ error: "Sem autorização." }, { status: 401 });
    }

    const { senhaAntiga, novaSenha } = await req.json();

    if (!senhaAntiga || !novaSenha || novaSenha.length < 6) {
      return NextResponse.json({ error: "Preencha corretamente as senhas." }, { status: 400 });
    }

    const user = await prisma.user.findUnique({
      where: { id: (session.user as any).id }
    });

    if (!user) {
      return NextResponse.json({ error: "Usuário não encontrado." }, { status: 404 });
    }

    const isValid = await bcrypt.compare(senhaAntiga, user.senha);
    if (!isValid) {
      return NextResponse.json({ error: "Sua senha atual está incorreta." }, { status: 403 });
    }

    const hashedSenha = await bcrypt.hash(novaSenha, 12);

    await prisma.user.update({
      where: { id: user.id },
      data: { senha: hashedSenha }
    });

    return NextResponse.json({ success: true });

  } catch (error: any) {
    console.error("Profile Protocol Error:", error);
    return NextResponse.json({ error: "Falha interna no servidor." }, { status: 500 });
  }
}
