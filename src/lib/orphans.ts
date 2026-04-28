import fs from "fs";
import path from "path";
import { db } from "./db";

export const UPLOADS_DIR = path.join(process.cwd(), "uploads");

export type OrphanStatus = "ASSINADO" | "SEM_ASSINATURA";

export type OrphanFileMeta = {
  filename: string;
  uuid: string;
  size: number;
  modifiedAt: string;
  status: OrphanStatus;
};

const UUID_REGEX = /^([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})/i;

export function parseOrphanFilename(filename: string): { uuid: string | null; status: OrphanStatus } {
  const match = filename.match(UUID_REGEX);
  const uuid = match ? match[1] : null;
  const status: OrphanStatus = filename.endsWith("-signed.pdf") ? "ASSINADO" : "SEM_ASSINATURA";
  return { uuid, status };
}

/**
 * Sanitiza um nome de arquivo recebido por query string para garantir
 * que ele é apenas um basename .pdf existente em UPLOADS_DIR.
 * Retorna o caminho absoluto seguro, ou null se inválido/inexistente.
 */
export function safeOrphanPath(file: string): string | null {
  if (!file || typeof file !== "string") return null;
  if (file.includes("..") || file.includes("/") || file.includes("\\")) return null;
  if (!file.toLowerCase().endsWith(".pdf")) return null;
  const fullPath = path.join(UPLOADS_DIR, file);
  if (!fs.existsSync(fullPath)) return null;
  return fullPath;
}

/**
 * Lista todos os arquivos órfãos do volume `uploads/`.
 * Considera órfão: arquivo .pdf cujo UUID base NÃO bate com nenhum
 * `id` registrado em `data/receipts.json`.
 */
export function listOrphans(): OrphanFileMeta[] {
  if (!fs.existsSync(UPLOADS_DIR)) return [];

  const knownIds = new Set<string>(
    db.getReceipts().map((r: any) => String(r.id))
  );

  const entries = fs.readdirSync(UPLOADS_DIR);
  const orphans: OrphanFileMeta[] = [];

  for (const filename of entries) {
    if (!filename.toLowerCase().endsWith(".pdf")) continue;
    const { uuid, status } = parseOrphanFilename(filename);
    if (!uuid) continue;
    if (knownIds.has(uuid)) continue;

    const fullPath = path.join(UPLOADS_DIR, filename);
    try {
      const st = fs.statSync(fullPath);
      orphans.push({
        filename,
        uuid,
        size: st.size,
        modifiedAt: st.mtime.toISOString(),
        status,
      });
    } catch {
      // ignora arquivo que sumiu entre readdir e stat
    }
  }

  // Ordena por data de modificação descendente (mais recente primeiro)
  orphans.sort((a, b) => (a.modifiedAt > b.modifiedAt ? -1 : 1));
  return orphans;
}

/**
 * Sanitiza string pra ser usada como nome de arquivo em qualquer SO.
 * Remove barras, dois-pontos, asteriscos, acentos preservados.
 */
export function sanitizeFilenamePart(input: string): string {
  return input
    .replace(/[/\\:*?"<>|]/g, "-")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 80);
}

/**
 * Gera nome de download legível: "Joao Silva - 05-2026 - ASSINADO.pdf"
 * Cai em fallback (filename original) se faltar nome ou competência.
 */
export function buildDownloadFilename(
  filename: string,
  status: OrphanStatus,
  parsed?: { nome?: string; competencia?: string }
): string {
  if (parsed?.nome) {
    const nome = sanitizeFilenamePart(parsed.nome);
    const comp = parsed.competencia ? sanitizeFilenamePart(parsed.competencia.replace("/", "-")) : "sem-competencia";
    const statusLabel = status === "ASSINADO" ? "ASSINADO" : "SEM_ASSINATURA";
    return `${nome} - ${comp} - ${statusLabel}.pdf`;
  }
  return filename;
}
