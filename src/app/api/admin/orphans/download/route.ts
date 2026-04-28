import { NextResponse } from "next/server";
import fs from "fs";
import { requireAdmin } from "@/lib/authz";
import {
  safeOrphanPath,
  parseOrphanFilename,
  buildDownloadFilename,
} from "@/lib/orphans";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

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
    // Tenta usar nome parseado (cache hit é instantâneo); cai no UUID se falhar
    let parsed: any = null;
    try {
      const { parsePdfMetadata } = await import("@/lib/pdfParse");
      parsed = await parsePdfMetadata(safePath);
    } catch (e) {
      console.error("[admin/orphans/download] parse falhou, baixando com nome UUID", e);
    }
    const downloadName = buildDownloadFilename(file, status, parsed || undefined);

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
