import { NextResponse } from "next/server";
import fs from "fs";
import { requireAdmin } from "@/lib/authz";
import {
  safeOrphanPath,
  parseOrphanFilename,
  buildDownloadFilename,
} from "@/lib/orphans";

export async function GET(req: Request) {
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

    const buffer = fs.readFileSync(safePath);
    const { status } = parseOrphanFilename(file);
    // Nome amigável só fica disponível após etapa 2 (parse). Por enquanto cai no filename original.
    const downloadName = buildDownloadFilename(file, status);

    return new NextResponse(buffer as any, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${downloadName}"`,
        "Content-Length": String(buffer.length),
      },
    });
  } catch (error: any) {
    console.error("[admin/orphans/download] erro", error);
    return NextResponse.json({ error: "Falha ao baixar." }, { status: 500 });
  }
}
