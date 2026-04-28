"use client";

import { useState, useEffect, useMemo } from "react";
import { useSession } from "next-auth/react";

type Orphan = {
  filename: string;
  uuid: string;
  size: number;
  modifiedAt: string;
  status: "ASSINADO" | "SEM_ASSINATURA";
  parsed?: { nome?: string; cpf?: string; competencia?: string; dataAssinatura?: string };
};

type StatusFilter = "ALL" | "ASSINADO" | "SEM_ASSINATURA";
type Toast = { type: "success" | "error" | "info"; text: string } | null;

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });
}

export default function AdminOrphansPage() {
  const { data: session, status } = useSession();
  const [orphans, setOrphans] = useState<Orphan[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<StatusFilter>("ALL");
  const [toast, setToast] = useState<Toast>(null);

  const showToast = (t: NonNullable<Toast>) => {
    setToast(t);
    setTimeout(() => setToast(null), 5000);
  };

  const loadOrphans = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/orphans");
      const json = await res.json();
      if (res.ok) setOrphans(json.orphans || []);
      else showToast({ type: "error", text: json.error || "Falha ao carregar órfãos." });
    } catch {
      showToast({ type: "error", text: "Servidor indisponível." });
    }
    setLoading(false);
  };

  useEffect(() => {
    if (status === "authenticated") loadOrphans();
  }, [status]);

  const filtered = useMemo(() => {
    if (filter === "ALL") return orphans;
    return orphans.filter((o) => o.status === filter);
  }, [orphans, filter]);

  const counts = useMemo(() => {
    const assinados = orphans.filter((o) => o.status === "ASSINADO").length;
    const sem = orphans.filter((o) => o.status === "SEM_ASSINATURA").length;
    return { total: orphans.length, assinados, sem };
  }, [orphans]);

  if (status === "loading" || loading) {
    return <div className="p-10 text-white font-bold animate-pulse">Carregando arquivos órfãos do volume...</div>;
  }
  if ((session?.user as any)?.role !== "ADMIN") {
    return <div className="p-10 text-rose-500 font-bold">Acesso Negado. Reservado para Administradores.</div>;
  }

  const deleteOrphan = async (file: string) => {
    if (!confirm(`Apagar definitivamente "${file}"? Esta ação NÃO pode ser desfeita.`)) return;
    try {
      const res = await fetch(`/api/admin/orphans?file=${encodeURIComponent(file)}`, { method: "DELETE" });
      const json = await res.json();
      if (res.ok) {
        showToast({ type: "success", text: `Arquivo "${file}" apagado.` });
        loadOrphans();
      } else {
        showToast({ type: "error", text: json.error || "Falha ao apagar." });
      }
    } catch {
      showToast({ type: "error", text: "Servidor indisponível." });
    }
  };

  const downloadAllZip = () => {
    window.location.href = `/api/admin/orphans/download-all?status=${filter}`;
  };

  return (
    <div className="min-h-screen bg-[#070708] p-8 text-white font-sans selection:bg-emerald-500/30">
      <div className="max-w-7xl mx-auto space-y-8">
        <header className="flex flex-wrap gap-4 justify-between items-center border-b border-white/5 pb-6">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-white mb-2 flex items-center gap-3">
              Arquivos Órfãos no Volume
              <span className="px-2 py-1 text-[10px] font-bold bg-amber-500/10 text-amber-400 ring-1 ring-amber-500/30 rounded-md uppercase tracking-wide">
                Recuperação
              </span>
            </h1>
            <p className="text-zinc-400 text-sm">PDFs no volume Docker que perderam o registro no banco. Baixe ou apague conforme necessário.</p>
          </div>
          <div className="flex gap-3 flex-wrap">
            <a href="/admin/users" className="bg-white/5 hover:bg-white/10 px-4 py-2.5 rounded-xl text-xs font-bold transition-all ring-1 ring-white/10 uppercase tracking-widest text-zinc-300">Gerenciar Usuários</a>
            <a href="/admin/settings" className="bg-white/5 hover:bg-white/10 px-4 py-2.5 rounded-xl text-xs font-bold transition-all ring-1 ring-white/10 uppercase tracking-widest text-zinc-300">Engrenagens</a>
            <a href="/" className="bg-white/5 hover:bg-white/10 px-4 py-2.5 rounded-xl text-xs font-bold transition-all ring-1 ring-white/10 uppercase tracking-widest text-zinc-300">Painel Operacional</a>
          </div>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-[#111113]/80 border border-white/5 rounded-2xl p-5">
            <div className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-2">Total no volume</div>
            <div className="text-3xl font-bold text-white">{counts.total}</div>
          </div>
          <div className="bg-[#111113]/80 border border-emerald-500/20 rounded-2xl p-5">
            <div className="text-[10px] font-bold text-emerald-500 uppercase tracking-widest mb-2">Assinados</div>
            <div className="text-3xl font-bold text-emerald-400">{counts.assinados}</div>
          </div>
          <div className="bg-[#111113]/80 border border-amber-500/20 rounded-2xl p-5">
            <div className="text-[10px] font-bold text-amber-500 uppercase tracking-widest mb-2">Sem Assinatura</div>
            <div className="text-3xl font-bold text-amber-400">{counts.sem}</div>
          </div>
        </div>

        <div className="bg-[#111113]/80 border border-white/5 rounded-[2rem] p-8 shadow-2xl">
          <div className="flex flex-wrap gap-4 items-end justify-between mb-6">
            <div>
              <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-1.5">Filtrar por status</label>
              <select
                value={filter}
                onChange={(e) => setFilter(e.target.value as StatusFilter)}
                className="bg-[#161618] border border-transparent rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-emerald-500 transition-all text-xs"
              >
                <option value="ALL">Todos</option>
                <option value="ASSINADO">Só assinados</option>
                <option value="SEM_ASSINATURA">Só sem assinatura</option>
              </select>
            </div>
            <button
              onClick={downloadAllZip}
              disabled={filtered.length === 0}
              className="bg-emerald-500 hover:bg-emerald-400 text-[#070708] font-bold py-2.5 px-5 rounded-xl shadow-[0_0_20px_rgba(16,185,129,0.2)] transition-all active:scale-[0.98] text-xs uppercase tracking-wide disabled:opacity-40 disabled:cursor-not-allowed"
              title={filtered.length === 0 ? "Nada pra baixar" : "Baixar todos como ZIP organizado por pastas"}
            >
              ⬇ Baixar todos ({filtered.length}) como ZIP
            </button>
          </div>

          {filtered.length === 0 ? (
            <div className="py-16 text-center">
              <div className="text-emerald-400 text-4xl mb-3">✓</div>
              <div className="text-zinc-300 font-bold mb-1">Nenhum arquivo órfão</div>
              <div className="text-zinc-600 text-xs">O sistema está saudável — todos os PDFs do volume têm registro no banco.</div>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest border-b border-white/5">
                    <th className="text-left py-3 pr-4">Identificação</th>
                    <th className="text-left py-3 pr-4 hidden md:table-cell">CPF</th>
                    <th className="text-left py-3 pr-4 hidden md:table-cell">Competência</th>
                    <th className="text-left py-3 pr-4">Status</th>
                    <th className="text-left py-3 pr-4 hidden lg:table-cell">Tamanho</th>
                    <th className="text-left py-3 pr-4 hidden lg:table-cell">Modificado</th>
                    <th className="text-right py-3">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((o) => (
                    <tr key={o.filename} className="border-b border-white/5 hover:bg-white/[0.02]">
                      <td className="py-3 pr-4">
                        {o.parsed?.nome ? (
                          <>
                            <div className="font-bold text-zinc-200">{o.parsed.nome}</div>
                            <div className="text-[10px] text-zinc-600 font-mono mt-0.5 truncate max-w-[280px]">{o.filename}</div>
                          </>
                        ) : (
                          <div className="font-mono text-zinc-400 text-xs truncate max-w-[280px]" title={o.filename}>{o.filename}</div>
                        )}
                      </td>
                      <td className="py-3 pr-4 text-zinc-500 font-mono text-xs hidden md:table-cell">{o.parsed?.cpf || "—"}</td>
                      <td className="py-3 pr-4 text-zinc-500 font-mono text-xs hidden md:table-cell">{o.parsed?.competencia || "—"}</td>
                      <td className="py-3 pr-4">
                        <span className={`px-2 py-1 text-[10px] font-bold rounded-md uppercase tracking-wide ring-1 ${o.status === "ASSINADO" ? "bg-emerald-500/10 text-emerald-400 ring-emerald-500/30" : "bg-amber-500/10 text-amber-400 ring-amber-500/30"}`}>
                          {o.status === "ASSINADO" ? "Assinado" : "Sem assinatura"}
                        </span>
                      </td>
                      <td className="py-3 pr-4 text-zinc-500 text-xs hidden lg:table-cell">{formatBytes(o.size)}</td>
                      <td className="py-3 pr-4 text-zinc-500 text-xs font-mono hidden lg:table-cell">{formatDate(o.modifiedAt)}</td>
                      <td className="py-3 text-right">
                        <div className="flex justify-end gap-2">
                          <a
                            href={`/api/admin/orphans/download?file=${encodeURIComponent(o.filename)}`}
                            className="bg-sky-500/10 hover:bg-sky-500 hover:text-white text-sky-400 px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wide ring-1 ring-sky-500/30 transition-all"
                          >
                            Baixar
                          </a>
                          <button
                            onClick={() => deleteOrphan(o.filename)}
                            className="bg-rose-500/10 hover:bg-rose-500 hover:text-white text-rose-400 px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wide ring-1 ring-rose-500/30 transition-all"
                          >
                            Apagar
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {toast && (
        <div className={`fixed bottom-6 right-6 max-w-sm px-5 py-4 rounded-2xl shadow-2xl ring-1 backdrop-blur-md z-50 ${toast.type === "success" ? "bg-emerald-500/90 ring-emerald-400 text-[#070708]" : toast.type === "error" ? "bg-rose-600/90 ring-rose-500 text-white" : "bg-blue-500/90 ring-blue-400 text-white"}`}>
          <div className="text-sm font-bold">{toast.text}</div>
        </div>
      )}
    </div>
  );
}
