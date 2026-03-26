"use client";

import { useState, useEffect } from "react";

export default function Home() {
  const [uploading, setUploading] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error' | 'warning', text: string } | null>(null);
  const [parsedRecords, setParsedRecords] = useState<any[]>([]);
  const [lots, setLots] = useState<any[]>([]);
  const [dragging, setDragging] = useState(false);

  // Sorting state for the Tracker Table
  const [sortKey, setSortKey] = useState<string>('createdAt');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  const fetchLots = async () => {
    try {
      const res = await fetch('/api/receipts');
      const data = await res.json();
      if (data.success && data.lots) {
        setLots(data.lots);
      }
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    fetchLots();
  }, []);

  const deleteLot = async (comp: string) => {
    if(!confirm(`Excluir permanentemente o lote ${comp} e todos os seus PDFs?`)) return;
    try {
      await fetch(`/api/receipts?competencia=${encodeURIComponent(comp)}`, { method: 'DELETE' });
      fetchLots();
    } catch(e) {}
  };

  const deleteReceipt = async (id: string, name: string) => {
    if(!confirm(`Excluir permanentemente o recibo de ${name}?`)) return;
    try {
      await fetch(`/api/receipts?id=${encodeURIComponent(id)}`, { method: 'DELETE' });
      fetchLots();
    } catch(e) {}
  };

  const processFile = async (file: File) => {
    setUploading(true);
    setFeedback(null);
    setParsedRecords([]);

    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await fetch('/api/upload', {
        method: 'POST',
        body: formData
      });
      const data = await res.json();

      if (!res.ok) {
        setFeedback({ type: 'error', text: data.error || 'Erro desconhecido' });
      } else {
        setFeedback({ type: 'success', text: `Planilha validada! ${data.count} colaboradores carregados.` });
        const recordsRaw = data.rows || data.data || data;
        const validRecords = Array.isArray(recordsRaw) ? recordsRaw : [recordsRaw];
        setParsedRecords(validRecords);
      }
    } catch (err) {
      setFeedback({ type: 'error', text: 'Falha na conexão com o servidor.' });
    } finally {
      setUploading(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) await processFile(file);
    e.target.value = '';
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      await processFile(e.dataTransfer.files[0]);
    }
  };

  const processAndDispatch = async () => {
    if (!parsedRecords || parsedRecords.length === 0) return;
    setProcessing(true);
    setFeedback({ type: 'warning', text: 'Sintetizando Documentos Oficiais...' });

    try {
      const res = await fetch('/api/process', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ records: parsedRecords })
      });
      const data = await res.json();

      if (!res.ok) {
        setFeedback({ type: 'error', text: data.error || 'Erro na geração dos PDFs.' });
      } else {
        setFeedback({ type: 'success', text: `Concluído! Motor PDF processou o lote.` });
        setParsedRecords([]); 
        fetchLots();
      }
    } catch (err: any) {
      setFeedback({ type: 'error', text: `Falha técnica: ${err.message}` });
    } finally {
      setProcessing(false);
    }
  };

  const sortReceipts = (receipts: any[]) => {
    return [...receipts].sort((a, b) => {
      let valA = a[sortKey] || '';
      let valB = b[sortKey] || '';
      if (sortOrder === 'asc') return valA > valB ? 1 : -1;
      return valA < valB ? 1 : -1;
    });
  };

  const handleSort = (key: string) => {
    if (sortKey === key) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(key);
      setSortOrder('desc');
    }
  };

  return (
    <div className="min-h-screen bg-[#070708] text-zinc-100 font-sans selection:bg-emerald-500/30 selection:text-emerald-200 pb-10">
      
      {/* GLOWING BACKGROUND MESH */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden flex justify-center z-[-1]">
        <div className="absolute top-[-20%] left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-emerald-500/10 blur-[120px] rounded-full mix-blend-screen opacity-50"></div>
      </div>

      <header className="sticky top-0 z-50 bg-[#0A0A0B]/80 backdrop-blur-2xl border-b border-white/5 px-8 flex justify-between h-20 shadow-2xl items-center">
        <div className="flex items-center gap-4">
          <div className="relative flex items-center justify-center bg-gradient-to-br from-[#121214] to-[#1C1C1F] p-2.5 rounded-2xl ring-1 ring-white/10 shadow-[0_0_20px_rgba(16,185,129,0.15)] overflow-hidden">
             <div className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-emerald-500 to-transparent opacity-50"></div>
             <svg className="w-5 h-5 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M13 10V3L4 14h7v7l9-11h-7z"></path></svg>
          </div>
          <div className="flex flex-col">
            <h1 className="text-xl font-bold tracking-tight text-white leading-none">GreenHouse</h1>
            <span className="text-zinc-500 font-medium text-[10px] uppercase tracking-widest mt-1">Plataforma Operacional</span>
          </div>
        </div>
      </header>

      <main className="max-w-[1400px] w-full mx-auto p-4 md:p-8 space-y-8 mt-4">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          {/* LEFTSIDE: UPLOAD AREA */}
          <div className="lg:col-span-4 flex flex-col gap-6">
            <div className="bg-[#111113]/60 backdrop-blur-xl p-8 rounded-[2rem] ring-1 ring-white/5 shadow-2xl relative overflow-hidden group">
              <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent"></div>
              
              <div className="flex justify-between items-center mb-2 relative z-10">
                <h2 className="text-xl font-bold text-white tracking-tight">Ingestão de Base</h2>
                <a href="/api/template" download="Template_Beneficios_Oficial.xlsx" className="flex items-center gap-1.5 text-[10px] font-bold text-[#0A0A0B] bg-emerald-400 hover:bg-emerald-300 py-1.5 px-3 rounded-lg transition-all shadow-[0_0_15px_rgba(16,185,129,0.3)] uppercase tracking-wide">
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"></path></svg>
                  Modelo Excel
                </a>
              </div>
              <p className="text-zinc-500 text-xs mb-8 font-medium leading-relaxed">Arraste a planilha do Departamento Pessoal (XLSX). O motor processará regras e criará os contratos digitais.</p>
              
              {feedback && (
                <div className={`mb-6 p-4 rounded-2xl text-xs font-bold flex items-center gap-3 backdrop-blur-md border ${feedback.type === 'success' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-rose-500/10 text-rose-400 border-rose-500/20'}`}>
                  {feedback.type === 'success' ? '✨ ' : '⚠️ '}
                  {feedback.text}
                </div>
              )}

              {parsedRecords && parsedRecords.length > 0 ? (
                <div className="flex flex-col items-center bg-[#0C0C0E] border border-white/10 rounded-3xl p-6 text-center shadow-inner relative overflow-hidden">
                  <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-transparent via-emerald-500 to-transparent opacity-30"></div>
                  
                  <div className="w-14 h-14 bg-emerald-500/10 text-emerald-400 rounded-full flex items-center justify-center mb-4 ring-1 ring-emerald-500/20">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7"></path></svg>
                  </div>
                  <h4 className="text-white font-bold text-lg mb-1">{parsedRecords.length} Colaboradores</h4>
                  <p className="text-emerald-400/80 text-[10px] font-bold uppercase tracking-widest mb-6 border border-emerald-400/20 px-2 py-1 rounded-md bg-emerald-400/5">Pronto para Geração</p>
                  
                  <div className="w-full max-h-48 overflow-y-auto mb-6 bg-[#161618] p-2 rounded-2xl border border-white/5 text-xs text-left custom-scrollbar">
                    <ul className="divide-y divide-white/5 border-t border-b border-transparent">
                      {parsedRecords.slice(0, 50).map((r, i) => (
                        <li key={i} className="py-2.5 px-3 flex justify-between items-center hover:bg-white/5 rounded-xl transition-colors">
                          <span className="font-semibold text-zinc-300 truncate">{r.NOME}</span>
                          <span className="font-mono text-zinc-500">{r.CPF}</span>
                        </li>
                      ))}
                      {parsedRecords.length > 50 && <li className="py-3 text-center italic text-zinc-600 font-medium">...mais {parsedRecords.length - 50} ocultos</li>}
                    </ul>
                  </div>

                  <button onClick={processAndDispatch} disabled={processing} className="w-full bg-emerald-500 hover:bg-emerald-400 text-[#070708] font-bold py-3.5 px-6 rounded-xl shadow-[0_0_20px_rgba(16,185,129,0.2)] hover:shadow-[0_0_30px_rgba(16,185,129,0.4)] transition-all active:scale-95 disabled:opacity-50">
                    {processing ? 'Sintetizando...' : 'Compilar Documentos (PDF)'}
                  </button>
                  <button onClick={() => setParsedRecords([])} disabled={processing} className="mt-5 text-xs text-zinc-600 font-bold hover:text-white transition-colors uppercase tracking-widest">Descartar Lote</button>
                </div>
              ) : (
                <label 
                  onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
                  onDragLeave={(e) => { e.preventDefault(); setDragging(false); }}
                  onDrop={handleDrop}
                  className={`flex flex-col items-center justify-center w-full h-[280px] rounded-3xl cursor-pointer transition-all duration-300 border-2 ${uploading ? 'bg-white/5 border-white/10 cursor-wait opacity-50' : dragging ? 'bg-emerald-500/10 border-emerald-500/50 scale-[1.02] shadow-[0_0_30px_rgba(16,185,129,0.15)]' : 'bg-[#0C0C0E] border-dashed border-white/10 hover:border-emerald-500/30 hover:bg-white/5'}`}>
                  <div className="flex flex-col items-center justify-center px-4 text-center">
                    <div className={`w-14 h-14 mb-6 rounded-2xl flex items-center justify-center border transition-all duration-500 ${dragging ? 'bg-emerald-500 text-[#0A0A0B] rotate-12 border-emerald-400' : 'bg-[#18181A] text-zinc-500 border-white/10'}`}>
                      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"></path></svg>
                    </div>
                    <p className="text-sm font-bold text-zinc-300">Drop Zone (XLSX, CSV)</p>
                    <p className="text-xs font-medium text-zinc-600 mt-2">Arraste a base para a nuvem</p>
                  </div>
                  <input type="file" className="hidden" accept=".xlsx, .csv" onChange={handleFileUpload} disabled={uploading} />
                </label>
              )}
            </div>
          </div>
          
          {/* RIGHTSIDE: DATAGRID */}
          <div className="lg:col-span-8 flex flex-col gap-6">
            <div className="bg-[#111113]/60 backdrop-blur-xl p-8 rounded-[2rem] ring-1 ring-white/5 shadow-2xl h-full flex flex-col relative overflow-hidden">
              <div className="flex justify-between items-end mb-8 relative z-10">
                <div>
                  <h2 className="text-xl font-bold text-white tracking-tight">Monitor de Operações</h2>
                  <p className="text-zinc-500 text-xs font-medium mt-1">Acervo de Documentos e Envio via Evolution API.</p>
                </div>
                <div className="flex gap-2">
                  <button onClick={fetchLots} className="p-2.5 bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-white rounded-xl transition-all border border-white/5" title="Recarregar">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path></svg>
                  </button>
                </div>
              </div>

              <div className="flex-1 overflow-hidden flex flex-col rounded-3xl bg-[#09090B] ring-1 ring-white/5 z-10">
                {lots.length === 0 ? (
                   <div className="flex-1 flex flex-col items-center justify-center text-zinc-600 p-12">
                     <div className="w-16 h-16 bg-[#161618] rounded-2xl flex items-center justify-center mb-4 ring-1 ring-white/5">
                        <svg className="w-8 h-8 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"></path></svg>
                     </div>
                     <p className="font-bold text-sm text-zinc-400">Database Vazia</p>
                     <p className="text-xs mt-1">Suba um lote para criar contratos</p>
                  </div>
                ) : (
                  <div className="flex-1 overflow-y-auto custom-scrollbar p-3 space-y-4">
                    {lots.map((lot, idx) => (
                      <div key={idx} className="bg-[#141416] ring-1 ring-white/5 rounded-[1.25rem] overflow-hidden group">
                        
                        {/* LOT HEADER */}
                        <div className="px-6 py-4 flex justify-between items-center bg-gradient-to-r from-white/[0.03] to-transparent border-b border-white/5">
                          <div>
                            <div className="flex items-center gap-3 mb-1">
                               <div className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_10px_#10b981]"></div>
                               <h3 className="text-xs font-bold text-white uppercase tracking-widest leading-none">CMPT {lot.competencia}</h3>
                            </div>
                            <span className="text-[10px] font-medium text-zinc-500 pl-5">{lot.total} assinaturas pendentes</span>
                          </div>
                          <div className="flex items-center gap-2">
                             <button onClick={() => deleteLot(lot.competencia)} className="text-[10px] bg-rose-500/10 text-rose-500 hover:text-rose-400 ring-1 ring-rose-500/20 font-bold px-3 py-1.5 rounded-lg hover:bg-rose-500/20 transition-all uppercase tracking-wide" title="Purgar Lixo">
                                Excluir Lote
                             </button>
                            <button className="text-[10px] bg-white text-black font-bold px-4 py-1.5 rounded-lg hover:bg-zinc-200 transition-colors uppercase tracking-wide shadow-[0_0_15px_rgba(255,255,255,0.1)]">
                              Executar Disparo
                            </button>
                          </div>
                        </div>
                        
                        {/* TABLE */}
                        <div className="overflow-x-auto">
                          <table className="w-full text-left border-collapse">
                            <thead>
                              <tr className="bg-[#0A0A0B] text-[10px] font-bold text-zinc-500 uppercase tracking-widest border-b border-white/5">
                                <th className="px-6 py-3 cursor-pointer hover:text-white transition-colors group/th" onClick={() => handleSort('nome')}>
                                  Colaborador <span className="opacity-0 group-hover/th:opacity-100 transition-opacity">{sortKey === 'nome' ? (sortOrder === 'asc' ? '↑' : '↓') : '↕'}</span>
                                </th>
                                <th className="px-6 py-3 cursor-pointer hover:text-white transition-colors group/th" onClick={() => handleSort('cpf')}>
                                  Identificação <span className="opacity-0 group-hover/th:opacity-100 transition-opacity">{sortKey === 'cpf' ? (sortOrder === 'asc' ? '↑' : '↓') : '↕'}</span>
                                </th>
                                <th className="px-6 py-3">Timestamp / Ingestão</th>
                                <th className="px-6 py-3">Status</th>
                                <th className="px-6 py-3 text-right">Ações</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-white/5">
                              {sortReceipts(lot.receipts).map((rec: any, rIdx: number) => (
                                <tr key={rIdx} className="hover:bg-white/[0.02] transition-colors group/row">
                                  <td className="px-6 py-3.5 font-bold text-zinc-200 text-xs whitespace-nowrap">{rec.nome}</td>
                                  <td className="px-6 py-3.5 font-mono text-zinc-500 text-[11px]">{rec.cpf}</td>
                                  <td className="px-6 py-3.5 text-zinc-500 text-[10px] font-medium font-mono">
                                    {new Date(rec.createdAt).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })}
                                  </td>
                                  <td className="px-6 py-3.5">
                                    <div className="flex items-center">
                                      <span className={`px-2 py-0.5 text-[9px] font-bold uppercase tracking-widest rounded-md ring-1 ${rec.status === 'ASSINADO' ? 'bg-emerald-500/10 text-emerald-400 ring-emerald-500/20' : 'bg-amber-500/10 text-amber-400 ring-amber-500/20'}`}>
                                        {rec.status}
                                      </span>
                                    </div>
                                  </td>
                                  <td className="px-6 py-3.5 flex gap-1.5 justify-end opacity-20 group-hover/row:opacity-100 transition-opacity">
                                    <a href={`/api/download?id=${rec.id}`} target="_blank" className="p-1.5 bg-[#1C1C1F] ring-1 ring-white/10 hover:ring-white/30 text-zinc-400 hover:text-white rounded-lg transition-all" title="Baixar Contrato Secundário">
                                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"></path></svg>
                                    </a>
                                    <button className="p-1.5 bg-[#1C1C1F] ring-1 ring-white/10 hover:ring-white/30 text-zinc-400 hover:text-white rounded-lg transition-all" title="Ping via Email">
                                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"></path></svg>
                                    </button>
                                    <button className="p-1.5 bg-[#1C1C1F] ring-1 ring-emerald-500/40 hover:bg-emerald-500/10 text-emerald-400 hover:text-emerald-300 rounded-lg transition-all" title="Disparar Protocolo Whatsapp">
                                      <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24"><path d="M12.031 6.172c-3.181 0-5.767 2.586-5.768 5.766 0 1.01.272 1.996.827 2.842l-1.077 3.931 4.027-1.056c.801.5 1.706.772 2.656.772 3.181 0 5.768-2.586 5.768-5.766 0-3.181-2.586-5.767-5.768-5.767zm3.392 8.28c-.142-.401-.844-.954-1.583-1.258-.093-.038-.16-.057-.229.043-.068.1-.229.3-.393.447-.164.148-.328.163-.483.056-.913-.631-1.614-1.127-2.318-2.18-.111-.166.024-.265.175-.487.051-.074.1-.166.151-.25.051-.082.025-.152-.001-.25-.025-.1-.328-.79-.448-1.082-.119-.283-.241-.245-.331-.25-.088-.004-.189-.004-.29-.004s-.266.038-.405.188c-.139.15-5.32 5.097-5.32 8.814 0 3.717 3.238 6.556 5.688 8.355 2.45 1.799 4.398 2.052 5.965 1.703 1.567-.348 2.373-.974 2.665-1.921.291-.947.291-1.761.205-1.933-.087-.171-.32-.275-.623-.427z"/></svg>
                                    </button>
                                    <button onClick={() => deleteReceipt(rec.id, rec.nome)} className="p-1.5 ml-2 bg-[#1C1C1F] ring-1 ring-rose-500/20 hover:bg-rose-500/10 text-rose-500 hover:text-rose-400 rounded-lg transition-all" title="Expurgar do Sistema">
                                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                                    </button>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
