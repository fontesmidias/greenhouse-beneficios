"use client";

import Image from "next/image";
import { useState } from "react";

export default function Home() {
  const [uploading, setUploading] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error' | 'warning', text: string } | null>(null);
  const [parsedRecords, setParsedRecords] = useState<any[]>([]);

  const [dragging, setDragging] = useState(false);

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
        setFeedback({ type: 'success', text: `Planilha validada! ${data.count} colaboradores prontos para envio.` });
        setParsedRecords(data.rows);
      }
    } catch (err) {
      setFeedback({ type: 'error', text: 'Falha na conexão com o servidor.' });
    } finally {
      setUploading(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      await processFile(file);
    }
    e.target.value = ''; // reset input
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(true);
  };
  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
  };
  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0];
      await processFile(file);
    }
  };

  const processAndDispatch = async () => {
    if (parsedRecords.length === 0) return;
    setProcessing(true);
    setFeedback({ type: 'warning', text: 'Gerando arquivos PDF corporativos e disparando. Por favor, aguarde...' });

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
        setFeedback({ type: 'success', text: `Concluído! ${data.count} PDFs gerados, salvos no sistema e lote criado.` });
        setParsedRecords([]); // Clear memory
      }
    } catch (err) {
      setFeedback({ type: 'error', text: 'Falha ao processar os arquivos.' });
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 font-sans selection:bg-emerald-200 pb-10">
      <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-slate-200 px-4 md:px-8 py-4 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-3">
          <div className="bg-emerald-600 text-white p-2 rounded-xl shadow-inner">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
            </svg>
          </div>
          <h1 className="text-xl md:text-2xl font-bold tracking-tight text-slate-900">
            GreenHouse <span className="text-emerald-600 font-light">Benefícios</span>
          </h1>
        </div>
      </header>

      <main className="max-w-6xl w-full mx-auto p-4 md:p-8 space-y-6 md:space-y-8">
        
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 bg-white p-6 md:p-8 rounded-3xl shadow-[0_2px_20px_-10px_rgba(0,0,0,0.05)] border border-slate-100">
          <div>
            <h2 className="text-2xl md:text-3xl font-extrabold text-slate-900 tracking-tight">Gestão de Recibos</h2>
            <p className="text-slate-500 mt-2 text-sm md:text-base max-w-xl leading-relaxed">
              Faça o upload da planilha do mês para gerar, enviar e automatizar a coleta das assinaturas de VA e VT. Acompanhe em tempo real o status pelo celular ou desktop.
            </p>
          </div>
          <a href="/api/template" download="Template_Beneficios_GreenHouse.xlsx" className="w-full md:w-auto bg-slate-900 hover:bg-emerald-600 text-white font-medium py-3.5 px-6 rounded-2xl transition-all shadow-md hover:shadow-lg active:scale-95 flex items-center justify-center gap-2 group">
            <svg className="w-5 h-5 group-hover:-translate-y-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"></path>
            </svg>
            Baixar Modelo Excel
          </a>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 md:gap-8">
          
          <div className="lg:col-span-5 flex flex-col h-full bg-gradient-to-br from-emerald-50 to-teal-100/40 p-1 md:p-2 rounded-[2rem] border border-emerald-100/50 shadow-sm relative overflow-hidden group">
            <div className="bg-white/70 backdrop-blur-xl rounded-[1.5rem] p-6 md:p-8 h-full flex flex-col relative z-10 border border-white/60 shadow-[inset_0_0_15px_rgba(255,255,255,0.5)]">
              <div className="mb-6">
                <h3 className="text-xl font-bold text-slate-800 flex items-center gap-3">
                  <span className="bg-emerald-100 shadow-sm text-emerald-700 p-2 rounded-xl">
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"></path>
                    </svg>
                  </span>
                  Gerar Novo Lote
                </h3>
              </div>

              {feedback && (
                <div className={`mb-4 p-4 rounded-xl text-sm font-medium flex items-center gap-2 ${feedback.type === 'success' ? 'bg-emerald-100 text-emerald-800' : feedback.type === 'error' ? 'bg-red-100 text-red-800' : 'bg-amber-100 text-amber-800 animate-pulse'}`}>
                  {feedback.type === 'success' ? (
                     <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path></svg>
                  ) : feedback.type === 'error' ? (
                     <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path></svg>
                  ) : (
                     <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                  )}
                  {feedback.text}
                </div>
              )}

              {parsedRecords.length > 0 ? (
                <div className="flex-1 flex flex-col items-center justify-center bg-emerald-50 border border-emerald-200 rounded-2xl p-6 text-center animate-in fade-in zoom-in duration-300">
                  <span className="text-4xl drop-shadow-sm mb-2">🎉</span>
                  <h4 className="text-emerald-800 font-bold text-lg">Pronto para Geração!</h4>
                  <p className="text-emerald-600 text-sm mt-1 mb-6">{parsedRecords.length} Colaboradores validados.</p>
                  <button 
                    onClick={processAndDispatch} 
                    disabled={processing}
                    className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3 px-6 rounded-xl shadow-md transition-all active:scale-95 disabled:opacity-75 flex justify-center items-center gap-2">
                    {processing ? (
                      <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span> Processando...</>
                    ) : (
                      <>
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path></svg> 
                        Gerar Lote de PDFs
                      </>
                    )}
                  </button>
                  <button onClick={() => setParsedRecords([])} disabled={processing} className="mt-4 text-sm text-slate-400 font-medium hover:text-slate-600 underline">Cancelar Lote</button>
                </div>
              ) : (
                <label 
                  onDragOver={handleDragOver} 
                  onDragLeave={handleDragLeave} 
                  onDrop={handleDrop}
                  className={`flex-1 flex flex-col items-center justify-center w-full min-h-[220px] bg-white border-2 border-dashed rounded-2xl cursor-pointer transition-all ${uploading ? 'border-emerald-400 bg-emerald-50/50 opacity-70 cursor-wait' : dragging ? 'border-emerald-500 bg-emerald-100 scale-105 shadow-xl' : 'border-emerald-200 hover:bg-emerald-50/50 hover:border-emerald-400 group-hover:shadow-[0_10px_40px_-10px_rgba(16,185,129,0.2)]'}`}>
                  <div className="flex flex-col items-center justify-center pt-5 pb-6 text-center px-4">
                    <div className={`w-16 h-16 mb-4 rounded-full flex items-center justify-center shadow-sm transition-all duration-300 ${dragging ? 'bg-emerald-500 text-white scale-125' : 'bg-emerald-50 text-emerald-500 group-hover:bg-emerald-100 group-hover:scale-110'}`}>
                      {uploading ? (
                         <svg className="w-8 h-8 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                      ) : (
                        <svg className="w-8 h-8 transform group-hover:-translate-y-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 13h6m-3-3v6m5 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
                        </svg>
                      )}
                    </div>
                    <p className="mb-2 text-lg text-slate-700 font-semibold transition-all">
                      {uploading ? <span className="text-emerald-600">Lendo Arquivo...</span> : dragging ? <span className="text-emerald-700 font-blod">Solte o arquivo agora!</span> : <><span className="text-emerald-600">Clique</span> ou arraste o Excel</>}
                    </p>
                  </div>
                  <input type="file" className="hidden" accept=".xlsx, .csv" onChange={handleFileUpload} disabled={uploading} />
                </label>
              )}
            </div>
          </div>
          
          {/* Tracking */}
          <div className="lg:col-span-7 bg-white p-6 md:p-8 rounded-[2rem] shadow-[0_2px_20px_-10px_rgba(0,0,0,0.05)] border border-slate-100 flex flex-col h-full">
            <h3 className="text-xl font-bold text-slate-800 mb-6">Status dos Envios</h3>
            <div className="flex flex-col gap-4">
               {/* Simulação Placeholder */}
               <div className="p-4 rounded-xl border border-slate-100 bg-slate-50 flex justify-between items-center">
                  <span className="font-semibold text-slate-700">Competência MAIO/2026</span>
                  <span className="px-3 py-1 bg-amber-100 text-amber-800 text-xs font-bold rounded-lg border border-amber-200">Aguardando novo roteamento</span>
               </div>
            </div>
          </div>
          
        </div>
      </main>
    </div>
  );
}
