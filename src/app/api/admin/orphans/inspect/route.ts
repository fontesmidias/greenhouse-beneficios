import { NextResponse } from "next/server";
import fs from "fs";
import { requireAdmin } from "@/lib/authz";
import { safeOrphanPath } from "@/lib/orphans";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Retorna o texto bruto extraído de um PDF específico, junto com o
 * resultado das regex de extração. Permite calibrar os regex sem
 * precisar baixar e inspecionar manualmente os PDFs.
 */
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

    let rawText = "";
    let parsed: any = null;
    let error: string | null = null;

    try {
      const { PDFParse } = await import("pdf-parse");
      const buffer = fs.readFileSync(safePath);
      const parser = new PDFParse({ data: new Uint8Array(buffer) });
      const result = await parser.getText();
      rawText =
        typeof (result as any).text === "string"
          ? (result as any).text
          : Array.isArray((result as any).pages)
            ? (result as any).pages.map((p: any) => p.text || "").join("\n---PAGE---\n")
            : JSON.stringify(result).slice(0, 2000);
      try { await parser.destroy(); } catch {}
    } catch (e: any) {
      error = String(e?.message || e);
    }

    try {
      const { parsePdfMetadata } = await import("@/lib/pdfParse");
      parsed = await parsePdfMetadata(safePath);
    } catch (e: any) {
      // já temos rawText; só não vamos ter parsed
    }

    return NextResponse.json({
      file,
      bufferSize: fs.statSync(safePath).size,
      rawText: rawText.slice(0, 5000), // primeiros 5KB de texto
      rawTextLength: rawText.length,
      rawTextSample: rawText.split(/\r?\n/).slice(0, 30), // 30 primeiras linhas
      parsed,
      parseError: error,
    });
  } catch (error: any) {
    console.error("[admin/orphans/inspect] erro", error);
    return NextResponse.json({ error: String(error?.message || error) }, { status: 500 });
  }
}
