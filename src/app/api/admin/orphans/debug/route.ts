import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { requireAdmin } from "@/lib/authz";
import { listOrphans, UPLOADS_DIR } from "@/lib/orphans";
import { db } from "@/lib/db";

export async function GET() {
  const denied = await requireAdmin();
  if (denied) return denied;

  const receiptsJsonPath = path.join(process.cwd(), "data", "receipts.json");
  const uploadsDirExists = fs.existsSync(UPLOADS_DIR);

  let uploadsDirContents: string[] = [];
  let uploadsTotalFiles = 0;
  if (uploadsDirExists) {
    try {
      const all = fs.readdirSync(UPLOADS_DIR);
      uploadsTotalFiles = all.length;
      uploadsDirContents = all.slice(0, 100);
    } catch (e) {
      uploadsDirContents = [`<erro ao listar: ${String(e)}>`];
    }
  }

  let receiptsJsonExists = false;
  let receiptsJsonCount = 0;
  let receiptIds: string[] = [];
  try {
    receiptsJsonExists = fs.existsSync(receiptsJsonPath);
    const receipts = db.getReceipts();
    receiptsJsonCount = receipts.length;
    receiptIds = receipts.slice(0, 50).map((r: any) => String(r.id));
  } catch (e) {
    // mantém defaults
  }

  let orphans: any[] = [];
  try {
    orphans = listOrphans();
  } catch (e) {
    return NextResponse.json({
      processCwd: process.cwd(),
      uploadsDir: UPLOADS_DIR,
      uploadsDirExists,
      uploadsDirContents,
      uploadsTotalFiles,
      receiptsJsonPath,
      receiptsJsonExists,
      receiptsJsonCount,
      receiptIds,
      orphanCount: 0,
      orphansSample: [],
      env: {
        NODE_ENV: process.env.NODE_ENV || "",
        NEXT_PUBLIC_BASE_URL: process.env.NEXT_PUBLIC_BASE_URL || "",
      },
      error: `listOrphans falhou: ${String(e)}`,
    });
  }

  return NextResponse.json({
    processCwd: process.cwd(),
    uploadsDir: UPLOADS_DIR,
    uploadsDirExists,
    uploadsDirContents,
    uploadsTotalFiles,
    receiptsJsonPath,
    receiptsJsonExists,
    receiptsJsonCount,
    receiptIds,
    orphanCount: orphans.length,
    orphansSample: orphans.slice(0, 10).map((o: any) => o.filename),
    env: {
      NODE_ENV: process.env.NODE_ENV || "",
      NEXT_PUBLIC_BASE_URL: process.env.NEXT_PUBLIC_BASE_URL || "",
    },
  });
}
