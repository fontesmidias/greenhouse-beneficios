import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/authz";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Limpa o cache de parse de PDFs. Útil quando ajustamos as regex
 * de extração e queremos forçar reidentificação dos arquivos.
 */
export async function POST() {
  const denied = await requireAdmin();
  if (denied) return denied;

  try {
    const { clearParseCache } = await import("@/lib/pdfParse");
    clearParseCache();
    return NextResponse.json({ success: true, message: "Cache de parse limpo." });
  } catch (e: any) {
    return NextResponse.json({ success: false, error: String(e?.message || e) }, { status: 500 });
  }
}
