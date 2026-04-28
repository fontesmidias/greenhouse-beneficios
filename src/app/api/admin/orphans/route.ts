import { NextResponse } from "next/server";
import fs from "fs";
import { requireAdmin } from "@/lib/authz";
import { listOrphans, safeOrphanPath, UPLOADS_DIR } from "@/lib/orphans";

// Força runtime Node.js (não Edge). pdf-parse precisa de APIs Node.
export const runtime = "nodejs";
// Sem cache: a listagem reflete estado do filesystem em tempo real.
export const dynamic = "force-dynamic";

const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 200;

export async function GET(req: Request) {
  const denied = await requireAdmin();
  if (denied) return denied;

  try {
    const { searchParams } = new URL(req.url);
    const shouldParse = searchParams.get("parse") === "true";
    const offset = Math.max(0, parseInt(searchParams.get("offset") || "0", 10) || 0);
    const limit = Math.min(MAX_LIMIT, Math.max(1, parseInt(searchParams.get("limit") || String(DEFAULT_LIMIT), 10) || DEFAULT_LIMIT));
    const statusFilter = (searchParams.get("status") || "ALL").toUpperCase();

    let all = listOrphans();
    if (statusFilter === "ASSINADO" || statusFilter === "SEM_ASSINATURA") {
      all = all.filter((o) => o.status === statusFilter);
    }

    const total = all.length;
    const page = all.slice(offset, offset + limit);

    let enriched: any[] = page;
    if (shouldParse && page.length > 0) {
      // Dynamic import: só carrega pdf-parse quando realmente precisa parsear.
      // Evita que side effects do pdfjs-dist quebrem o startup do route handler.
      try {
        const { parseMany } = await import("@/lib/pdfParse");
        const parsedMap = await parseMany(page, UPLOADS_DIR, 5);
        enriched = page.map((o) => ({
          ...o,
          parsed: parsedMap.get(o.filename) || undefined,
        }));
      } catch (parseErr: any) {
        console.error("[admin/orphans] parse falhou, retornando lista crua", parseErr);
        // Não derruba a chamada — retorna sem parsed
      }
    }

    return NextResponse.json({
      total,
      offset,
      limit,
      hasMore: offset + limit < total,
      nextOffset: offset + limit < total ? offset + limit : null,
      orphans: enriched,
      parsed: shouldParse,
    });
  } catch (error: any) {
    console.error("[admin/orphans] erro ao listar", error);
    return NextResponse.json(
      { error: "Falha ao listar arquivos órfãos.", details: String(error?.message || error) },
      { status: 500 }
    );
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
