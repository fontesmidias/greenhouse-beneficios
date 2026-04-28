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

  // Debug modal
  const [debugOpen, setDebugOpen] = useState(false);
  const [debugLoading, setDebugLoading] = useState(false);
  const [debugData, setDebugData] = useState<any>(null);

  // Inspect modal (mostra texto bruto extraído de UM PDF)
  const [inspectOpen, setInspectOpen] = useState(false);
  const [inspectLoading, setInspectLoading] = useState(false);
  const [inspectData, setInspectData] = useState<any>(null);

  // Identificacao via parse (lazy, sob demanda — parse pesado, default off)
  const [identifying, setIdentifying] = useState(false);
  const [identified, setIdentified] = useState(false);

  // Paginacao server-side (50 por pagina, evita timeout)
  const [total, setTotal] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const PAGE_SIZE = 50;

  // Send-email modal
  const [emailModalFor, setEmailModalFor] = useState<Orphan | null>(null);
  const [emailTo, setEmailTo] = useState("");
  const [emailMessage, setEmailMessage] = useState("");
  const [emailSending, setEmailSending] = useState(false);
  const [emailResult, setEmailResult] = useState<{ success: boolean; message: string } | null>(null);

  const showToast = (t: NonNullable<Toast>) => {
    setToast(t);
    setTimeout(() => setToast(null), 5000);
  };

  const fetchPage = async (offset: number, parse: boolean): Promise<{ orphans: Orphan[]; total: number; hasMore: boolean } | null> => {
    const url = `/api/admin/orphans?offset=${offset}&limit=${PAGE_SIZE}&parse=${parse}&status=${filter}`;
    const res = await fetch(url);
    const json = await res.json();
    if (!res.ok) {
      throw new Error(json.error || `HTTP ${res.status}`);
    }
    return {
      orphans: Array.isArray(json.orphans) ? json.orphans : [],
      total: typeof json.total === "number" ? json.total : 0,
      hasMore: !!json.hasMore,
    };
  };

  const loadOrphans = async () => {
    setLoading(true);
    setIdentified(false);
    setOrphans([]);
    try {
      const r = await fetchPage(0, false);
      if (!r) return;
      setOrphans(r.orphans);
      setTotal(r.total);
      setHasMore(r.hasMore);
      if (r.total === 0) {
        showToast({ type: "info", text: "Nenhum arquivo órfão. Se você esperava arquivos aqui, abra Debug pra investigar." });
      }
    } catch (e: any) {
      showToast({ type: "error", text: `Falha ao carregar: ${e?.message || e}` });
    }
    setLoading(false);
  };

  const loadMore = async () => {
    if (!hasMore || loadingMore) return;
    setLoadingMore(true);
    try {
      const r = await fetchPage(orphans.length, identified);
      if (!r) return;
      setOrphans((prev) => [...prev, ...r.orphans]);
      setTotal(r.total);
      setHasMore(r.hasMore);
    } catch (e: any) {
      showToast({ type: "error", text: `Falha ao carregar mais: ${e?.message || e}` });
    }
    setLoadingMore(false);
  };

  /**
   * Identifica todos os arquivos em chunks de 50 (página por página).
   * Cada chunk tem ~10s de parse, NUNCA estoura timeout do proxy.
   * Atualiza a tabela conforme cada chunk chega — feedback progressivo.
   */
  const identifyAll = async () => {
    if (total === 0) return;
    setIdentifying(true);
    try {
      const updated: Orphan[] = [];
      let offset = 0;
      let continueLoop = true;
      while (continueLoop) {
        const r = await fetchPage(offset, true);
        if (!r) break;
        updated.push(...r.orphans);
        // Atualiza tabela em tempo real
        setOrphans([...updated]);
        setTotal(r.total);
        setHasMore(r.hasMore);
        offset += PAGE_SIZE;
        continueLoop = r.hasMore;
      }
      setIdentified(true);
      showToast({ type: "success", text: `Identificação concluída: ${updated.length} arquivos.` });
    } catch (e: any) {
      showToast({ type: "error", text: `Identificação interrompida: ${e?.message || e}. Os já carregados permanecem na tabela.` });
    }
    setIdentifying(false);
  };

  useEffect(() => {
    if (status === "authenticated") loadOrphans();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, filter]);

  // Filtro agora é server-side (faz parte da query), entao filtered = orphans
  const filtered = orphans;

  // Contadores rápidos nos cards: usam o que está carregado em memória.
  // O total real (do servidor) está na variável `total`.
  const counts = useMemo(() => {
    const assinados = orphans.filter((o) => o.status === "ASSINADO").length;
    const sem = orphans.filter((o) => o.status === "SEM_ASSINATURA").length;
    return { assinados, sem };
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
    // Se já identificou nesta sessão, o cache do servidor está quente — vale parsear
    // pra ZIP sair com nomes amigáveis. Senão pula parse pra evitar timeout.
    const parseQs = identified ? "&parse=true" : "";
    window.location.href = `/api/admin/orphans/download-all?status=${filter}${parseQs}`;
  };

  const inspectFile = async (filename: string) => {
    setInspectOpen(true);
    setInspectLoading(true);
    setInspectData(null);
    try {
      const res = await fetch(`/api/admin/orphans/inspect?file=${encodeURIComponent(filename)}`);
      const json = await res.json();
      setInspectData(json);
    } catch (e: any) {
      setInspectData({ error: e?.message || "Falha ao inspecionar" });
    }
    setInspectLoading(false);
  };

  const clearParseCacheAndReload = async () => {
    if (!confirm("Limpar cache de parse e recarregar? Próxima identificação vai reprocessar tudo.")) return;
    try {
      await fetch("/api/admin/orphans/clear-cache", { method: "POST" });
      showToast({ type: "info", text: "Cache limpo. Clique em 'Identificar arquivos' novamente." });
      setIdentified(false);
      loadOrphans();
    } catch (e: any) {
      showToast({ type: "error", text: `Falha ao limpar cache: ${e?.message || e}` });
    }
  };

  const openDebug = async () => {
    setDebugOpen(true);
    setDebugLoading(true);
    setDebugData(null);
    try {
      const res = await fetch("/api/admin/orphans/debug");
      const json = await res.json();
      setDebugData(json);
    } catch (e: any) {
      setDebugData({ error: e?.message || "Falha ao carregar debug" });
    }
    setDebugLoading(false);
  };

  const openEmailModal = (o: Orphan) => {
    setEmailModalFor(o);
    setEmailTo("");
    setEmailMessage("");
    setEmailResult(null);
  };

  const closeEmailModal = () => {
    if (emailSending) return;
    setEmailModalFor(null);
    setEmailResult(null);
  };

  const submitEmail = async () => {
    if (!emailModalFor) return;
    if (!emailTo.trim()) {
      setEmailResult({ success: false, message: "Informe o e-mail destinatário." });
      return;
    }
    setEmailSending(true);
    setEmailResult(null);
    try {
      const res = await fetch("/api/admin/orphans/send-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          file: emailModalFor.filename,
          to: emailTo.trim(),
          message: emailMessage.trim() || undefined,
        }),
      });
      const json = await res.json();
      if (json.success) {
        setEmailResult({ success: true, message: `Enviado para ${json.sentTo} como "${json.filename}".` });
        showToast({ type: "success", text: `Recibo enviado para ${json.sentTo}.` });
      } else {
        setEmailResult({ success: false, message: json.error || "Falha desconhecida no envio." });
      }
    } catch (e: any) {
      setEmailResult({ success: false, message: e?.message || "Servidor indisponível." });
    }
    setEmailSending(false);
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
            <button onClick={openDebug} className="bg-amber-500/10 hover:bg-amber-500/20 px-4 py-2.5 rounded-xl text-xs font-bold transition-all ring-1 ring-amber-500/30 uppercase tracking-widest text-amber-400" title="Inspecionar estado do servidor (paths, contagens)">🔧 Debug</button>
            <button onClick={clearParseCacheAndReload} className="bg-rose-500/10 hover:bg-rose-500/20 px-4 py-2.5 rounded-xl text-xs font-bold transition-all ring-1 ring-rose-500/30 uppercase tracking-widest text-rose-400" title="Limpa cache de parse para forçar reidentificação com regex novo">♻ Limpar cache</button>
            <a href="/admin/users" className="bg-white/5 hover:bg-white/10 px-4 py-2.5 rounded-xl text-xs font-bold transition-all ring-1 ring-white/10 uppercase tracking-widest text-zinc-300">Gerenciar Usuários</a>
            <a href="/admin/settings" className="bg-white/5 hover:bg-white/10 px-4 py-2.5 rounded-xl text-xs font-bold transition-all ring-1 ring-white/10 uppercase tracking-widest text-zinc-300">Engrenagens</a>
            <a href="/" className="bg-white/5 hover:bg-white/10 px-4 py-2.5 rounded-xl text-xs font-bold transition-all ring-1 ring-white/10 uppercase tracking-widest text-zinc-300">Painel Operacional</a>
          </div>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-[#111113]/80 border border-white/5 rounded-2xl p-5">
            <div className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-2">Total no volume {filter !== "ALL" && `(filtro: ${filter})`}</div>
            <div className="text-3xl font-bold text-white">{total}</div>
            <div className="text-[10px] text-zinc-600 mt-1">{orphans.length} carregados na tela</div>
          </div>
          <div className="bg-[#111113]/80 border border-emerald-500/20 rounded-2xl p-5">
            <div className="text-[10px] font-bold text-emerald-500 uppercase tracking-widest mb-2">Assinados (carregados)</div>
            <div className="text-3xl font-bold text-emerald-400">{counts.assinados}</div>
          </div>
          <div className="bg-[#111113]/80 border border-amber-500/20 rounded-2xl p-5">
            <div className="text-[10px] font-bold text-amber-500 uppercase tracking-widest mb-2">Sem Assinatura (carregados)</div>
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
            <div className="flex gap-3 flex-wrap">
              <button
                onClick={identifyAll}
                disabled={identifying || total === 0 || identified}
                className="bg-blue-500/10 hover:bg-blue-500 hover:text-white text-blue-400 font-bold py-2.5 px-5 rounded-xl ring-1 ring-blue-500/30 transition-all text-xs uppercase tracking-wide disabled:opacity-40 disabled:cursor-not-allowed"
                title={identified ? "Já identificados nesta sessão" : "Lê cada PDF em chunks de 50 para extrair nome, CPF e competência. Atualiza a tela conforme processa."}
              >
                {identifying ? `Identificando... (${orphans.length}/${total})` : identified ? "✓ Identificados" : `🔍 Identificar arquivos (${total})`}
              </button>
              <button
                onClick={downloadAllZip}
                disabled={filtered.length === 0}
                className="bg-emerald-500 hover:bg-emerald-400 text-[#070708] font-bold py-2.5 px-5 rounded-xl shadow-[0_0_20px_rgba(16,185,129,0.2)] transition-all active:scale-[0.98] text-xs uppercase tracking-wide disabled:opacity-40 disabled:cursor-not-allowed"
                title={filtered.length === 0 ? "Nada pra baixar" : "Baixar todos como ZIP organizado por pastas"}
              >
                ⬇ Baixar todos ({filtered.length}) como ZIP
              </button>
            </div>
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
                        <div className="flex justify-end gap-2 flex-wrap">
                          <a
                            href={`/api/admin/orphans/download?file=${encodeURIComponent(o.filename)}`}
                            className="bg-sky-500/10 hover:bg-sky-500 hover:text-white text-sky-400 px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wide ring-1 ring-sky-500/30 transition-all"
                          >
                            Baixar
                          </a>
                          <button
                            onClick={() => openEmailModal(o)}
                            className="bg-blue-500/10 hover:bg-blue-500 hover:text-white text-blue-400 px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wide ring-1 ring-blue-500/30 transition-all"
                          >
                            Enviar por e-mail
                          </button>
                          <button
                            onClick={() => inspectFile(o.filename)}
                            className="bg-amber-500/10 hover:bg-amber-500 hover:text-[#070708] text-amber-400 px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wide ring-1 ring-amber-500/30 transition-all"
                            title="Ver texto bruto extraído deste PDF (calibrar regex)"
                          >
                            🔬
                          </button>
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

              {hasMore && (
                <div className="flex justify-center mt-6">
                  <button
                    onClick={loadMore}
                    disabled={loadingMore || identifying}
                    className="bg-white/5 hover:bg-white/10 text-zinc-300 font-bold py-2.5 px-6 rounded-xl ring-1 ring-white/10 transition-all text-xs uppercase tracking-wide disabled:opacity-40"
                  >
                    {loadingMore ? "Carregando..." : `Carregar mais (faltam ${total - orphans.length})`}
                  </button>
                </div>
              )}

              {!hasMore && orphans.length > PAGE_SIZE && (
                <div className="text-center text-[10px] text-zinc-600 mt-4 italic">Todos os {total} arquivos carregados.</div>
              )}
            </div>
          )}
        </div>
      </div>

      {toast && (
        <div className={`fixed bottom-6 right-6 max-w-sm px-5 py-4 rounded-2xl shadow-2xl ring-1 backdrop-blur-md z-50 ${toast.type === "success" ? "bg-emerald-500/90 ring-emerald-400 text-[#070708]" : toast.type === "error" ? "bg-rose-600/90 ring-rose-500 text-white" : "bg-blue-500/90 ring-blue-400 text-white"}`}>
          <div className="text-sm font-bold">{toast.text}</div>
        </div>
      )}

      {debugOpen && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => setDebugOpen(false)}>
          <div className="bg-[#111113] border border-white/10 rounded-[2rem] p-8 max-w-3xl w-full max-h-[85vh] overflow-auto shadow-2xl relative" onClick={(e) => e.stopPropagation()}>
            <div className="absolute top-0 inset-x-0 h-[2px] bg-gradient-to-r from-transparent via-amber-500 to-transparent opacity-50"></div>
            <div className="flex justify-between items-start mb-4">
              <div>
                <h2 className="text-xl font-bold text-amber-400 mb-1">🔧 Diagnóstico do servidor</h2>
                <p className="text-xs text-zinc-500">Estado real visto pelo backend. Útil pra investigar quando a tela mostra 0 mas o volume tem arquivos.</p>
              </div>
              <button onClick={() => setDebugOpen(false)} className="text-zinc-500 hover:text-white text-2xl leading-none">×</button>
            </div>
            {debugLoading ? (
              <div className="text-zinc-400 animate-pulse py-8 text-center">Carregando diagnóstico...</div>
            ) : (
              <pre className="bg-[#0A0A0B] border border-white/5 rounded-xl p-4 text-[11px] font-mono text-zinc-300 overflow-x-auto whitespace-pre-wrap break-all">{JSON.stringify(debugData, null, 2)}</pre>
            )}
          </div>
        </div>
      )}

      {inspectOpen && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => setInspectOpen(false)}>
          <div className="bg-[#111113] border border-white/10 rounded-[2rem] p-8 max-w-3xl w-full max-h-[85vh] overflow-auto shadow-2xl relative" onClick={(e) => e.stopPropagation()}>
            <div className="absolute top-0 inset-x-0 h-[2px] bg-gradient-to-r from-transparent via-amber-500 to-transparent opacity-50"></div>
            <div className="flex justify-between items-start mb-4">
              <div>
                <h2 className="text-xl font-bold text-amber-400 mb-1">🔬 Inspeção de PDF</h2>
                <p className="text-xs text-zinc-500">Texto bruto extraído pelo pdf-parse + resultado das regex de extração. Útil pra calibrar quando o nome não bate.</p>
              </div>
              <button onClick={() => setInspectOpen(false)} className="text-zinc-500 hover:text-white text-2xl leading-none">×</button>
            </div>
            {inspectLoading ? (
              <div className="text-zinc-400 animate-pulse py-8 text-center">Inspecionando...</div>
            ) : inspectData ? (
              <div className="space-y-4">
                <div>
                  <div className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-1.5">Arquivo</div>
                  <div className="text-xs font-mono text-zinc-300 break-all">{inspectData.file}</div>
                </div>
                <div>
                  <div className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-1.5">Resultado do parse (extractFields)</div>
                  <pre className="bg-[#0A0A0B] border border-emerald-500/20 rounded-xl p-3 text-[11px] font-mono text-emerald-200 overflow-x-auto">{JSON.stringify(inspectData.parsed, null, 2)}</pre>
                </div>
                <div>
                  <div className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-1.5">
                    Texto bruto ({inspectData.rawTextLength} chars, mostrando primeiros 5000)
                  </div>
                  <pre className="bg-[#0A0A0B] border border-white/5 rounded-xl p-3 text-[11px] font-mono text-zinc-300 overflow-x-auto whitespace-pre-wrap break-all max-h-96 overflow-y-auto">{inspectData.rawText}</pre>
                </div>
                <div>
                  <div className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-1.5">Primeiras 30 linhas</div>
                  <pre className="bg-[#0A0A0B] border border-white/5 rounded-xl p-3 text-[11px] font-mono text-zinc-400 overflow-x-auto">{inspectData.rawTextSample?.join("\n")}</pre>
                </div>
                {inspectData.parseError && (
                  <div className="bg-rose-500/10 ring-1 ring-rose-500/30 text-rose-300 p-3 rounded-xl text-xs">
                    Erro durante extração de texto: {inspectData.parseError}
                  </div>
                )}
              </div>
            ) : null}
          </div>
        </div>
      )}

      {emailModalFor && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={closeEmailModal}>
          <div className="bg-[#111113] border border-white/10 rounded-[2rem] p-8 max-w-md w-full shadow-2xl relative" onClick={(e) => e.stopPropagation()}>
            <div className="absolute top-0 inset-x-0 h-[2px] bg-gradient-to-r from-transparent via-blue-500 to-transparent opacity-50"></div>
            <h2 className="text-xl font-bold mb-2 text-blue-400">Enviar arquivo por e-mail</h2>
            <p className="text-xs text-zinc-500 mb-2">
              Arquivo: <span className="font-mono text-zinc-400">{emailModalFor.parsed?.nome || emailModalFor.filename}</span>
            </p>
            {emailModalFor.parsed?.competencia && (
              <p className="text-[10px] text-zinc-600 mb-4">Competência detectada: {emailModalFor.parsed.competencia}</p>
            )}

            <div className="space-y-4">
              <div>
                <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-1.5">E-mail destinatário</label>
                <input
                  value={emailTo}
                  onChange={(e) => setEmailTo(e.target.value)}
                  type="email"
                  placeholder="colaborador@empresa.com"
                  disabled={emailSending}
                  className="w-full bg-[#161618] border border-transparent rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-blue-500 transition-all text-xs"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-1.5">Mensagem (opcional)</label>
                <textarea
                  value={emailMessage}
                  onChange={(e) => setEmailMessage(e.target.value)}
                  placeholder="Deixe em branco para usar a mensagem padrão."
                  disabled={emailSending}
                  rows={4}
                  className="w-full bg-[#161618] border border-transparent rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-blue-500 transition-all text-xs resize-y"
                />
              </div>

              {emailResult && (
                <div className={`p-3 rounded-xl text-xs font-medium ring-1 ${emailResult.success ? "bg-emerald-500/10 text-emerald-300 ring-emerald-500/30" : "bg-rose-500/10 text-rose-300 ring-rose-500/30"}`}>
                  <div className="font-bold mb-1">{emailResult.success ? "✓ Sucesso" : "✗ Falha"}</div>
                  <div className="break-words">{emailResult.message}</div>
                </div>
              )}

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={closeEmailModal}
                  disabled={emailSending}
                  className="flex-1 bg-white/5 hover:bg-white/10 text-zinc-300 font-bold py-2.5 px-4 rounded-xl text-xs uppercase tracking-wide transition-all"
                >
                  Fechar
                </button>
                <button
                  type="button"
                  onClick={submitEmail}
                  disabled={emailSending}
                  className="flex-1 bg-blue-600 hover:bg-blue-500 text-white font-bold py-2.5 px-4 rounded-xl shadow-[0_0_20px_rgba(37,99,235,0.2)] transition-all active:scale-[0.98] text-xs uppercase tracking-wide disabled:opacity-50"
                >
                  {emailSending ? "Enviando..." : "Enviar agora"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
