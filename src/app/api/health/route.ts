import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Healthcheck publico. Usado por Docker/monitor externo.
 * Status 200 = OK, 503 = degradado.
 */
export async function GET() {
  const startedAt = Date.now();
  const checks: Record<string, { ok: boolean; latencyMs?: number; error?: string }> = {};

  try {
    const t0 = Date.now();
    await prisma.$queryRaw`SELECT 1`;
    checks.db = { ok: true, latencyMs: Date.now() - t0 };
  } catch (e: any) {
    checks.db = { ok: false, error: String(e?.message || e) };
  }

  const allOk = Object.values(checks).every((c) => c.ok);

  return NextResponse.json(
    {
      status: allOk ? "ok" : "degraded",
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
      checks,
      totalMs: Date.now() - startedAt,
    },
    { status: allOk ? 200 : 503 }
  );
}
