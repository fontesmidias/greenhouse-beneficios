import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendEmailMessage } from "@/lib/email";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
      return new NextResponse("ID Inválido.", { status: 400 });
    }

    const user = await prisma.user.findUnique({
      where: { id }
    });

    if (!user) {
      return new NextResponse("Membro não encontrado ou a solicitação já foi apagada.", { status: 404 });
    }

    if (user.status === "ATIVO") {
      return new NextResponse("O usuário já estava ativo.", { status: 200 });
    }

    await prisma.user.update({
      where: { id },
      data: { status: "ATIVO" }
    });

    // Notify User
    try {
      const loginUrl = `${process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000"}/login`;
      const htmlMsg = `
        <div style="font-family: Arial, sans-serif; color: #333; max-width: 600px; padding: 20px; border: 1px solid #ddd; border-top: 4px solid #10B981; border-radius: 8px;">
          <h2>Conta Aprovada - GreenHouse DP</h2>
          <p>Olá <b>${user.nome}</b>, seu acesso ao painel departamental foi aprovado pelo Administrador.</p>
          <p>Você já pode acessar o sistema utilizando seu e-mail e a senha que cadastrou.</p>
          <a href="${loginUrl}" style="display: inline-block; background-color: #10B981; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; margin-top: 10px;">Acessar Dashboard</a>
        </div>
      `;
      await sendEmailMessage(user.email, "Seu Acesso foi Aprovado! 🎉", htmlMsg);
    } catch (e) {
      console.error("Falha ao enviar email confirmando aprovacao", e);
    }

    return new NextResponse(`
      <html>
        <head>
          <title>Aprovação Concluída</title>
          <style>
            body { font-family: sans-serif; background: #070708; color: white; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; }
            .card { background: #111113; padding: 40px; border-radius: 12px; border: 1px solid #222; text-align: center; }
            h1 { color: #10B981; margin-bottom: 10px; }
          </style>
        </head>
        <body>
          <div class="card">
            <h1>Acesso Autorizado ✅</h1>
            <p>O membro <b>${user.nome}</b> (${user.email}) agora possui permissão para logar no Dashboard.</p>
          </div>
        </body>
      </html>
    `, {
      headers: { "Content-Type": "text/html; charset=utf-8" }
    });

  } catch (error: any) {
    console.error("Admin Approve Error:", error);
    return new NextResponse("Falha interna ao processar aprovação.", { status: 500 });
  }
}
