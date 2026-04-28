import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import JSZip from "jszip";
import { requireAdmin } from "@/lib/authz";
import { listOrphans, UPLOADS_DIR, buildDownloadFilename } from "@/lib/orphans";

export async function GET(req: Request) {
  const denied = await requireAdmin();
  if (denied) return denied;

  try {
    const { searchParams } = new URL(req.url);
    const statusFilter = (searchParams.get("status") || "ALL").toUpperCase();

    let orphans = listOrphans();
    if (statusFilter === "ASSINADO" || statusFilter === "SEM_ASSINATURA") {
      orphans = orphans.filter((o) => o.status === statusFilter);
    }

    if (orphans.length === 0) {
      return NextResponse.json({ error: "Nenhum arquivo órfão para o filtro selecionado." }, { status: 404 });
    }

    const zip = new JSZip();
    for (const o of orphans) {
      const folder = o.status === "ASSINADO" ? "ASSINADOS" : "SEM_ASSINATURA";
      const fullPath = path.join(UPLOADS_DIR, o.filename);
      try {
        const data = fs.readFileSync(fullPath);
        const friendlyName = buildDownloadFilename(o.filename, o.status);
        zip.file(`${folder}/${friendlyName}`, data);
      } catch (e) {
        console.warn("[admin/orphans/download-all] arquivo sumiu durante zip", o.filename);
      }
    }

    const buffer = await zip.generateAsync({ type: "nodebuffer", compression: "DEFLATE", compressionOptions: { level: 6 } });
    const today = new Date().toISOString().slice(0, 10);
    const zipName = `orfaos-greenhouse-${today}.zip`;

    return new NextResponse(buffer as any, {
      status: 200,
      headers: {
        "Content-Type": "application/zip",
        "Content-Disposition": `attachment; filename="${zipName}"`,
        "Content-Length": String(buffer.length),
      },
    });
  } catch (error: any) {
    console.error("[admin/orphans/download-all] erro", error);
    return NextResponse.json({ error: "Falha ao gerar ZIP." }, { status: 500 });
  }
}
