import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

async function requireAdmin() {
  const session = await getServerSession(authOptions);
  const role = (session?.user as any)?.role;
  if (!session || role !== "ADMIN") {
    return NextResponse.json({ error: "Acesso negado." }, { status: 403 });
  }
  return null;
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

    await prisma.user.update({
      where: { id },
      data: { status: "RECUSADO", resetToken: null, resetTokenExpiry: null },
    });

    console.log("[admin/users/reject] Usuário recusado:", { id, email: user.email });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Admin Users reject error:", error);
    return NextResponse.json({ error: "Falha ao recusar usuário." }, { status: 500 });
  }
}
