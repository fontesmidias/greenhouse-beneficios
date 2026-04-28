import { NextResponse } from "next/server";
import fs from "fs";
import { requireAdmin } from "@/lib/authz";
import { listOrphans, safeOrphanPath, UPLOADS_DIR } from "@/lib/orphans";
import { parseMany } from "@/lib/pdfParse";

export async function GET(req: Request) {
  const denied = await requireAdmin();
  if (denied) return denied;

  try {
    const { searchParams } = new URL(req.url);
    // Parse de PDF é opcional e desligado por padrão. Volumes grandes (300+ PDFs)
    // estouram o timeout do Traefik se parsearem tudo na chamada inicial.
    // UI carrega lista rápida primeiro, depois pede parse via ?parse=true.
    const shouldParse = searchParams.get("parse") === "true";

    const orphans = listOrphans();

    if (!shouldParse) {
      return NextResponse.json({ count: orphans.length, orphans, parsed: false });
    }

    const parsedMap = await parseMany(orphans, UPLOADS_DIR, 5);
    const enriched = orphans.map((o) => ({
      ...o,
      parsed: parsedMap.get(o.filename) || undefined,
    }));
    return NextResponse.json({ count: enriched.length, orphans: enriched, parsed: true });
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
