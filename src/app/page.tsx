"use client";

import { useState, useEffect } from "react";
import { useSession, signOut } from "next-auth/react";
export default function Home() {
  const { data: session } = useSession();
  const [uploading, setUploading] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [dispatching, setDispatching] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error' | 'warning', text: string } | null>(null);
  const [parsedRecords, setParsedRecords] = useState<any[]>([]);
  const [lots, setLots] = useState<any[]>([]);
  const [dragging, setDragging] = useState(false);

  const [sortKey, setSortKey] = useState<string>('createdAt');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [searchQuery, setSearchQuery] = useState<string>('');
  
  // Dispatch advanced settings & polling
  const [intervalMin, setIntervalMin] = useState<number>(3);
  const [intervalMax, setIntervalMax] = useState<number>(8);
  const [scheduledTime, setScheduledTime] = useState<string>('');
  const [dispatchStatus, setDispatchStatus] = useState<any>(null);

  useEffect(() => {
    let polling: any;
    if (dispatching) {
       polling = setInterval(async () => {
         try {
           const res = await fetch('/api/dispatch/status');
           const data = await res.json();
           setDispatchStatus(data);
           if (!data?.active && data?.total > 0 && dispatching) {
             setDispatching(false);
             fetchLots(); 
             setFeedback({ type: 'success', text: `✨ Operação concluída. ${data.sent} envios confirmados.` });
           }
         } catch(e) {}
       }, 2000);
    }
    return () => clearInterval(polling);
  }, [dispatching]);

  // Selection state for Row Checkboxes
  const [selectedReceipts, setSelectedReceipts] = useState<string[]>([]);

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
      setSelectedReceipts([]); // Clear selection just in case
    } catch(e) {}
  };

  const deleteReceipt = async (id: string, name: string) => {
    if(!confirm(`Excluir permanentemente o recibo de ${name}?`)) return;
    try {
      await fetch(`/api/receipts?id=${encodeURIComponent(id)}`, { method: 'DELETE' });
      fetchLots();
      setSelectedReceipts(prev => prev.filter(x => x !== id));
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

  const filterAndSortReceipts = (receipts: any[]) => {
    let filtered = receipts;
    if (searchQuery.trim().length > 0) {
       const q = searchQuery.toLowerCase();
       filtered = receipts.filter(r => (r.nome?.toLowerCase().includes(q) || r.cpf?.includes(q)));
    }
    return [...filtered].sort((a, b) => {
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

  // Checkbox Logistics
  const toggleSelection = (id: string) => {
    setSelectedReceipts(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };
  const toggleSelectAll = (lotIds: string[]) => {
    const allSelected = lotIds.every(id => selectedReceipts.includes(id));
    if (allSelected) {
      setSelectedReceipts(prev => prev.filter(id => !lotIds.includes(id)));
    } else {
      setSelectedReceipts(prev => Array.from(new Set([...prev, ...lotIds])));
    }
  };

  // Universal Dispatch Endpoint
  const executeDispatch = async (ids: string[], channels: string[]) => {
    if (ids.length === 0) { alert('Selecione pelo menos 1 recibo marcando a caixa.'); return; }
    
    setDispatching(true);
    setFeedback({ type: 'warning', text: `Iniciando job de disparo via ${channels.join('/')} para ${ids.length} destinos...` });
    
    try {
      const res = await fetch('/api/dispatch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ receiptIds: ids, channels, intervalMin, intervalMax, scheduledTime })
      });
      const data = await res.json();
      
      if (!res.ok) {
        setDispatching(false);
        throw new Error(data.error || 'Erro Crítico no Gateway de Mensageria');
      }
      
      setSelectedReceipts([]); 
    } catch (e: any) {
      setFeedback({ type: 'error', text: e.message });
      setDispatching(false);
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

        <div className="flex items-center gap-4">
          {session?.user ? (
            <div className="flex items-center gap-3">
              <div className="hidden sm:flex flex-col text-right">
                <span className="text-white text-xs font-bold">{session.user.name}</span>
                <span className="text-emerald-400 text-[9px] font-bold uppercase tracking-widest">{(session.user as any).role || 'STAFF'}</span>
              </div>
              <div className="flex gap-2">
                <a href="/profile" className="w-8 h-8 bg-[#161618] hover:bg-white/10 rounded-xl flex items-center justify-center text-zinc-400 hover:text-white transition-all ring-1 ring-white/10" title="Meu Perfil">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path></svg>
                </a>
                <button onClick={() => signOut()} className="w-8 h-8 bg-rose-500/10 hover:bg-rose-500/20 rounded-xl flex items-center justify-center text-rose-500 transition-all ring-1 ring-rose-500/20" title="Sair do Cofre">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"></path></svg>
                </button>
              </div>
            </div>
          ) : (
            <div className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 animate-pulse">Autenticando...</div>
          )}
        </div>
      </header>

      <main className="max-w-[1400px] w-full mx-auto p-4 md:p-8 space-y-8 mt-4">
        
        {/* GLOBAL FEEDBACK TOASTER */}
        {feedback && (
          <div className={`fixed bottom-10 right-10 z-50 p-6 rounded-2xl text-sm font-bold flex items-center gap-4 backdrop-blur-3xl border shadow-[0_0_40px_rgba(0,0,0,0.5)] transition-all animate-bounce-slow
            ${feedback.type === 'success' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30 shadow-emerald-500/10' : 
              feedback.type === 'warning' ? 'bg-amber-500/10 text-amber-400 border-amber-500/30 shadow-amber-500/10' : 
              'bg-rose-500/10 text-rose-400 border-rose-500/30 shadow-rose-500/10'}`}>
            {feedback.type === 'success' ? '✨ ' : feedback.type === 'warning' ? '⏳ ' : '⚠️ '}
            {feedback.text}
            <button onClick={() => setFeedback(null)} className="ml-4 p-1 hover:bg-white/10 rounded-full transition-colors opacity-50 hover:opacity-100">
               <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
            </button>
          </div>
        )}

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

                  <button onClick={processAndDispatch} disabled={processing || dispatching} className="w-full bg-emerald-500 hover:bg-emerald-400 text-[#070708] font-bold py-3.5 px-6 rounded-xl shadow-[0_0_20px_rgba(16,185,129,0.2)] hover:shadow-[0_0_30px_rgba(16,185,129,0.4)] transition-all active:scale-95 disabled:opacity-50">
                    {processing ? 'Sintetizando...' : 'Compilar Documentos (PDF)'}
                  </button>
                  <button onClick={() => setParsedRecords([])} disabled={processing || dispatching} className="mt-5 text-xs text-zinc-600 font-bold hover:text-white transition-colors uppercase tracking-widest">Descartar Lote</button>
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
                  <input type="file" className="hidden" accept=".xlsx, .csv" onChange={handleFileUpload} disabled={uploading || dispatching} />
                </label>
              )}
            </div>
          </div>
          
          {/* RIGHTSIDE: DATAGRID */}
          <div className="lg:col-span-8 flex flex-col gap-6">
            <div className="bg-[#111113]/60 backdrop-blur-xl p-8 rounded-[2rem] ring-1 ring-white/5 shadow-2xl h-full flex flex-col relative overflow-hidden">
              <div className="flex flex-col mb-8 relative z-10 gap-4">
                <div className="flex justify-between items-start">
                  <div>
                    <h2 className="text-xl font-bold text-white tracking-tight">Motor de Roteamento Pessoal</h2>
                    <p className="text-zinc-500 text-xs font-medium mt-1">Configure regras de intervalo randômico para contornar restrições de SPAM do WhatsApp.</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-[#0A0A0B] p-4 rounded-2xl ring-1 ring-white/5 border border-white/5">
                   <div>
                     <label className="block text-[9px] font-bold text-zinc-500 uppercase mb-1.5">Intervalo Min. (Segs)</label>
                     <input type="number" min={1} value={intervalMin} onChange={e => setIntervalMin(Number(e.target.value))} className="w-full bg-[#111113] border border-white/5 rounded-lg px-3 py-2 text-white text-xs focus:ring-1 focus:ring-emerald-500 outline-none" />
                   </div>
                   <div>
                     <label className="block text-[9px] font-bold text-zinc-500 uppercase mb-1.5">Intervalo Max. (Segs)</label>
                     <input type="number" min={2} value={intervalMax} onChange={e => setIntervalMax(Number(e.target.value))} className="w-full bg-[#111113] border border-white/5 rounded-lg px-3 py-2 text-white text-xs focus:ring-1 focus:ring-emerald-500 outline-none" />
                   </div>
                   <div>
                     <label className="block text-[9px] font-bold text-emerald-500/70 uppercase mb-1.5">Agendar Disparo Lote (Opcional)</label>
                     <input type="datetime-local" value={scheduledTime} onChange={e => setScheduledTime(e.target.value)} className="w-full bg-[#111113] border border-emerald-500/20 rounded-lg px-3 py-2 text-emerald-400 text-xs focus:ring-1 focus:ring-emerald-500 outline-none" />
                   </div>
                </div>

                {dispatching && dispatchStatus?.active && (
                   <div className="w-full bg-[#0A0A0B] p-5 rounded-2xl border border-emerald-500/30 shadow-[0_0_15px_rgba(16,185,129,0.1)] relative overflow-hidden">
                     <div className="absolute top-0 right-0 bottom-0 w-1/3 bg-gradient-to-l from-emerald-500/10 to-transparent"></div>
                     <div className="flex justify-between text-xs font-bold text-zinc-300 mb-2">
                       <span className="text-emerald-400">DISPARANDO LOTE... ({dispatchStatus.sent}/{dispatchStatus.total})</span>
                       <span>Aprox. ~{dispatchStatus.etaSeconds}s restantes</span>
                     </div>
                     <div className="h-1.5 w-full bg-white/10 rounded-full overflow-hidden">
                       <div className="h-full bg-emerald-500 transition-all duration-700 ease-out" style={{width: `${(dispatchStatus.sent / dispatchStatus.total) * 100}%`}}></div>
                     </div>
                   </div>
                )}
              </div>

              <div className="flex justify-between items-end mb-6 relative z-10">
                <div>
                  <h2 className="text-lg font-bold text-white tracking-tight">Acervo de Lotes</h2>
                </div>
                <div className="flex gap-4 items-center">
                  <input 
                     type="text" 
                     placeholder="Buscar por nome ou CPF..." 
                     value={searchQuery}
                     onChange={(e) => setSearchQuery(e.target.value)}
                     className="bg-[#0A0A0B] border border-white/10 rounded-xl px-4 py-2 text-xs text-white placeholder-zinc-600 focus:outline-none focus:ring-1 focus:ring-emerald-500 transition-all w-64"
                  />
                  <button onClick={fetchLots} className="p-2.5 bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-white rounded-xl transition-all border border-white/5" title="Recarregar">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path></svg>
                  </button>
                </div>
              </div>

              <div className="flex-1 overflow-hidden flex flex-col rounded-3xl bg-[#09090B] ring-1 ring-white/5 z-10 w-full">
                {lots.length === 0 ? (
                   <div className="flex-1 flex flex-col items-center justify-center text-zinc-600 p-12">
                     <div className="w-16 h-16 bg-[#161618] rounded-2xl flex items-center justify-center mb-4 ring-1 ring-white/5">
                        <svg className="w-8 h-8 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"></path></svg>
                     </div>
                     <p className="font-bold text-sm text-zinc-400">Database Vazia</p>
                     <p className="text-xs mt-1">Suba um lote para criar contratos</p>
                  </div>
                ) : (
                  <div className="flex-1 overflow-y-auto overflow-x-auto custom-scrollbar p-3 space-y-4 w-full">
                    {lots.map((lot, idx) => {
                       const lotRowIds = lot.receipts.map((r:any) => r.id);
                       const selectedInLot = lotRowIds.filter((id:any) => selectedReceipts.includes(id));
                       
                       return (
                      <div key={idx} className="bg-[#141416] ring-1 ring-white/5 rounded-[1.25rem] overflow-hidden group min-w-[600px] lg:min-w-0">
                        
                        {/* LOT HEADER */}
                        <div className="px-5 py-3.5 flex flex-col md:flex-row gap-4 justify-between items-center bg-gradient-to-r from-white/[0.03] to-transparent border-b border-white/5">
                          <div className="flex gap-4 items-center w-full md:w-auto">
                            <input 
                              type="checkbox" 
                              checked={lotRowIds.length > 0 && selectedInLot.length === lotRowIds.length} 
                              onChange={() => toggleSelectAll(lotRowIds)} 
                              className="accent-emerald-500 w-4 h-4 rounded ring-1 ring-white/20 bg-[#070708] border-none cursor-pointer" 
                              title="Selecionar Lote Inteiro"
                            />
                            <div>
                               <div className="flex items-center gap-3 mb-0.5">
                                 <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_10px_#10b981]"></div>
                                 <h3 className="text-[11px] font-bold text-white uppercase tracking-widest leading-none">CMPT {lot.competencia}</h3>
                               </div>
                               <span className="text-[9px] font-medium text-zinc-500">{selectedInLot.length} de {lot.total} selecionados</span>
                            </div>
                          </div>
                          
                          <div className="flex flex-wrap items-center gap-2">
                             <button onClick={() => deleteLot(lot.competencia)} disabled={dispatching} className="text-[9px] bg-rose-500/10 text-rose-500 hover:text-rose-400 ring-1 ring-rose-500/20 font-bold px-2.5 py-1.5 rounded-lg hover:bg-rose-500/20 transition-all uppercase tracking-wide disabled:opacity-50" title="Purgar Lixo">
                                Excluir Lote
                             </button>
                             <button onClick={() => executeDispatch(selectedInLot, ['email'])} disabled={selectedInLot.length === 0 || dispatching} className={`text-[9px] bg-[#1C1C1F] ring-1 ring-white/10 hover:bg-white/10 text-zinc-300 font-bold px-3 py-1.5 rounded-lg transition-all uppercase tracking-wide flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed`} title="Disparar Email para Selecionados">
                               <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"></path></svg>
                               Massa Email
                             </button>
                            <button onClick={() => executeDispatch(selectedInLot, ['whatsapp'])} disabled={selectedInLot.length === 0 || dispatching} className={`text-[9px] bg-[#1C1C1F] ring-1 ring-emerald-500/40 hover:bg-emerald-500/10 text-emerald-400 font-bold px-3 py-1.5 rounded-lg transition-all uppercase tracking-wide flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed`} title="Disparar WhatsApp para Selecionados">
                              <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
                              Massa WA
                            </button>
                          </div>
                        </div>
                        
                        {/* TABLE */}
                        <div className="overflow-x-auto w-full custom-scrollbar">
                          <table className="w-full text-left border-collapse table-auto">
                            <thead>
                              <tr className="bg-[#0A0A0B] text-[9px] font-bold text-zinc-500 uppercase tracking-widest border-b border-white/5">
                                <th className="px-4 py-2.5 w-8">SEL</th>
                                <th className="px-4 py-2.5 cursor-pointer hover:text-white transition-colors group/th min-w-[150px]" onClick={() => handleSort('nome')}>
                                  Colaborador <span className="opacity-0 group-hover/th:opacity-100 transition-opacity">{sortKey === 'nome' ? (sortOrder === 'asc' ? '↑' : '↓') : '↕'}</span>
                                </th>
                                <th className="px-4 py-2.5 cursor-pointer hover:text-white transition-colors group/th hidden sm:table-cell" onClick={() => handleSort('cpf')}>
                                  CPF <span className="opacity-0 group-hover/th:opacity-100 transition-opacity">{sortKey === 'cpf' ? (sortOrder === 'asc' ? '↑' : '↓') : '↕'}</span>
                                </th>
                                <th className="px-4 py-2.5 hidden md:table-cell">Ingestão</th>
                                <th className="px-4 py-2.5">Histórico</th>
                                <th className="px-4 py-2.5">Status</th>
                                <th className="px-4 py-2.5 text-right">Ações</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-white/5">
                              {filterAndSortReceipts(lot.receipts).map((rec: any, rIdx: number) => (
                                <tr key={rIdx} className="hover:bg-white/[0.04] transition-colors group/row">
                                  <td className="px-4 py-3">
                                    <input 
                                      type="checkbox" 
                                      checked={selectedReceipts.includes(rec.id)} 
                                      onChange={() => toggleSelection(rec.id)} 
                                      className="accent-emerald-500 w-3.5 h-3.5 rounded ring-1 ring-white/20 bg-[#070708] border-none cursor-pointer" 
                                    />
                                  </td>
                                  <td className="px-4 py-3 font-bold text-zinc-200 text-[11px] truncate max-w-[150px]">{rec.nome}</td>
                                  <td className="px-4 py-3 font-mono text-zinc-500 text-[10px] hidden sm:table-cell">{rec.cpf}</td>
                                  <td className="px-4 py-3 text-zinc-600 text-[9px] font-medium font-mono hidden md:table-cell">
                                    {new Date(rec.createdAt).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })}
                                  </td>
                                  <td className="px-4 py-3">
                                    <div className="flex gap-1 flex-wrap">
                                      {rec.disparos && rec.disparos.length > 0 ? rec.disparos.map((d: any, idx: number) => (
                                        <span key={idx} className={`px-1.5 py-0.5 text-[8px] rounded uppercase font-bold tracking-widest ${d.status === 'sucesso' ? 'bg-emerald-500/10 text-emerald-400 ring-1 ring-emerald-500/20' : 'bg-rose-500/10 text-rose-400 ring-1 ring-rose-500/20'}`} title={`${new Date(d.data).toLocaleString()} - ${d.detalhes || d.status}`}>
                                          {d.canal === 'whatsapp' ? 'WA' : 'MAIL'}
                                        </span>
                                      )) : <span className="text-[10px] text-zinc-800 italic">...</span>}
                                    </div>
                                  </td>
                                  <td className="px-4 py-3">
                                    <div className="flex items-center">
                                      <span className={`px-2 py-0.5 text-[8px] font-bold uppercase tracking-widest rounded-md ring-1 ${rec.status === 'ASSINADO' ? 'bg-emerald-500/10 text-emerald-400 ring-emerald-500/20' : 'bg-amber-500/10 text-amber-400 ring-amber-500/20'}`}>
                                        {rec.status}
                                      </span>
                                    </div>
                                  </td>
                                  <td className="px-4 py-3 flex gap-1 justify-end">
                                    <button onClick={() => executeDispatch([rec.id], ['email'])} disabled={dispatching} className="p-1 bg-[#1C1C1F] ring-1 ring-white/10 hover:ring-white/30 text-zinc-400 hover:text-white rounded-lg transition-all disabled:opacity-50" title="Email">
                                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"></path></svg>
                                    </button>
                                    <button onClick={() => executeDispatch([rec.id], ['whatsapp'])} disabled={dispatching} className="p-1 bg-[#1C1C1F] ring-1 ring-emerald-500/40 hover:bg-emerald-500/10 text-emerald-400 hover:text-emerald-300 rounded-lg transition-all disabled:opacity-50" title="WhatsApp">
                                      <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
                                    </button>
                                    <a href={`/api/download?id=${rec.id}`} download target="_blank" className="p-1 bg-[#1C1C1F] ring-1 ring-sky-500/20 hover:bg-sky-500/10 text-sky-400 hover:text-sky-300 rounded-lg transition-all" title="Baixar Arquivo PDF Físico">
                                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"></path></svg>
                                    </a>
                                    <button onClick={() => deleteReceipt(rec.id, rec.nome)} disabled={dispatching} className="p-1 bg-[#1C1C1F] ring-1 ring-rose-500/20 hover:bg-rose-500/10 text-rose-500 hover:text-rose-400 rounded-lg transition-all disabled:opacity-50" title="Apagar">
                                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                                    </button>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )})}
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
