import { NextResponse } from "next/server";
import fs from "fs";
import { requireAdmin } from "@/lib/authz";
import { listOrphans, safeOrphanPath } from "@/lib/orphans";

export async function GET() {
  const denied = await requireAdmin();
  if (denied) return denied;

  try {
    const orphans = listOrphans();
    return NextResponse.json({ count: orphans.length, orphans });
  } catch (error: any) {
    console.error("[admin/orphans] erro ao listar", error);
    return NextResponse.json({ error: "Falha ao listar arquivos órfãos." }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  const denied = await requireAdmin();
  if (denied) return denied;

  try {
    const { searchParams } = new URL(req.url);
    const file = searchParams.get("file");
    if (!file) {
      return NextResponse.json({ error: "Parâmetro 'file' obrigatório." }, { status: 400 });
    }

    const safePath = safeOrphanPath(file);
    if (!safePath) {
      return NextResponse.json({ error: "Arquivo inválido ou inexistente." }, { status: 400 });
    }

    fs.unlinkSync(safePath);
    console.log("[admin/orphans] arquivo apagado", { file });
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("[admin/orphans] erro ao apagar", error);
    return NextResponse.json({ error: "Falha ao apagar o arquivo." }, { status: 500 });
  }
}
