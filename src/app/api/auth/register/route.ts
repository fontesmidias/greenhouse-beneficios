import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { sendEmailMessage } from "@/lib/email";

export async function POST(req: Request) {
  try {
    const { nome, email, senha, cargo } = await req.json();

    if (!nome || !email || !senha) {
      return NextResponse.json({ error: "Preencha todos os campos obrigatórios." }, { status: 400 });
    }

    const emailLower = email.toLowerCase().trim();

    // Check if user already exists
    const existing = await prisma.user.findUnique({
      where: { email: emailLower }
    });

    if (existing) {
      return NextResponse.json({ error: "Este email já possui solicitação de cadastro." }, { status: 400 });
    }

    const hashedSenha = await bcrypt.hash(senha, 12);

    const newUser = await prisma.user.create({
      data: {
        nome,
        email: emailLower,
        senha: hashedSenha,
        cargo,
        status: "PENDENTE",
        role: "USER"
      }
    });

    // Notify Admin
    const adminEmail = process.env.SMTP_USER || "fontesmidias.online@gmail.com";
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";
    
    // We should create a signature or simply a secure secret to approve. 
    // To keep it simple, we'll use a fast base64 token of the email for MVP, or better, an explicit Admin endpoint.
    const approveLink = `${baseUrl}/api/admin/approve?id=${newUser.id}`;
    
    const htmlMsg = `
      <div style="font-family: Arial, sans-serif; color: #333; max-width: 600px; padding: 20px; border: 1px solid #ddd; border-top: 4px solid #10B981; border-radius: 8px;">
        <h2>Nova Solicitação de Acesso - GreenHouse DP</h2>
        <p>Um novo colaborador solicitou acesso ao painel departamental.</p>
        <div style="background: #f9f9f9; padding: 15px; border-radius: 8px; margin: 20px 0;">
          <p><strong>Nome:</strong> ${nome}</p>
          <p><strong>E-mail:</strong> ${emailLower}</p>
          <p><strong>Cargo/Setor:</strong> ${cargo || 'Não informado'}</p>
        </div>
        <p>Para autorizar o acesso deste usuário imediatamente, clique no botão abaixo:</p>
        <a href="${approveLink}" style="display: inline-block; background-color: #10B981; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; margin-top: 10px;">Aprovar Acesso</a>
      </div>
    `;

    try {
      await sendEmailMessage(adminEmail, `Solicitação de Acesso: ${nome}`, htmlMsg);
    } catch (e) {
      console.error("Falha ao enviar email para Admin", e);
    }

    return NextResponse.json({ success: true, message: "Solicitação recebida com sucesso. Aguarde aprovação." });

  } catch (error: any) {
    console.error("Register Error:", error);
    return NextResponse.json({ error: "Falha interna no registro.", details: String(error) }, { status: 500 });
  }
}
