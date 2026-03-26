"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense } from 'react';

function ResetForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token');

  const [senha, setSenha] = useState("");
  const [confirmSenha, setConfirmSenha] = useState("");
  
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState<{type: 'success' | 'error', text: string} | null>(null);

  useEffect(() => {
    if (!token) {
      setFeedback({ type: 'error', text: 'Token de recuperação inválido ou ausente.' });
    }
  }, [token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (senha !== confirmSenha) {
      return setFeedback({ type: 'error', text: 'As senhas não conferem.' });
    }
    if (!token) return;

    setLoading(true);
    setFeedback(null);

    try {
      const res = await fetch('/api/auth/reset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, novaSenha: senha })
      });
      const data = await res.json();
      
      if (!res.ok) {
        setFeedback({ type: 'error', text: data.error || 'Erro ao redefinir credencial.' });
      } else {
        setFeedback({ type: 'success', text: 'Sua senha corporativa foi atualizada. Redirecionando para o cofre...' });
        setTimeout(() => router.push('/login'), 4000);
      }
    } catch (err: any) {
      setFeedback({ type: 'error', text: 'Servidor indisponível no momento.' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-sm bg-[#111113]/80 backdrop-blur-xl p-8 rounded-[2rem] ring-1 ring-white/5 shadow-2xl z-10 relative overflow-hidden">
      <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-transparent via-cyan-500 to-transparent opacity-50"></div>
      
      <div className="mb-8 text-center">
        <div className="w-12 h-12 bg-gradient-to-br from-[#121214] to-[#1C1C1F] mx-auto rounded-xl ring-1 ring-white/10 flex items-center justify-center mb-4 shadow-[0_0_15px_rgba(6,182,212,0.15)] relative overflow-hidden">
           <div className="absolute bottom-0 inset-x-0 h-px bg-cyan-500/50"></div>
           <svg className="w-6 h-6 text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z"></path></svg>
        </div>
        <h1 className="text-2xl font-bold text-white tracking-tight">Nova Senha</h1>
        <p className="text-sm text-zinc-500 font-medium mt-2">Escolha uma nova credencial robusta para a conta do DP.</p>
      </div>

      {feedback && (
        <div className={`mb-6 p-4 rounded-xl text-sm text-center font-medium border ${feedback.type === 'error' ? 'bg-rose-500/10 border-rose-500/20 text-rose-400' : 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'}`}>
          {feedback.text}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-xs font-bold text-zinc-400 uppercase tracking-widest mb-2">Credencial Nova</label>
          <input 
            type="password" 
            value={senha}
            onChange={e => setSenha(e.target.value)}
            disabled={!token}
            className="w-full bg-[#0A0A0B] border border-white/10 rounded-xl px-4 py-3 text-white placeholder-zinc-600 focus:outline-none focus:ring-1 focus:ring-cyan-500 focus:border-cyan-500 transition-all font-medium text-sm tracking-widest"
            placeholder="••••••••"
            required 
            minLength={6}
          />
        </div>
        <div>
          <label className="block text-xs font-bold text-zinc-400 uppercase tracking-widest mb-2">Confirmação</label>
          <input 
            type="password" 
            value={confirmSenha}
            onChange={e => setConfirmSenha(e.target.value)}
            disabled={!token}
            className="w-full bg-[#0A0A0B] border border-white/10 rounded-xl px-4 py-3 text-white placeholder-zinc-600 focus:outline-none focus:ring-1 focus:ring-cyan-500 focus:border-cyan-500 transition-all font-medium text-sm tracking-widest"
            placeholder="••••••••"
            required 
            minLength={6}
          />
        </div>

        <button 
          type="submit" 
          disabled={loading || !token || feedback?.type === 'success'}
          className="w-full bg-cyan-500 hover:bg-cyan-400 text-[#070708] font-bold py-3.5 px-4 rounded-xl shadow-[0_0_20px_rgba(6,182,212,0.2)] transition-all active:scale-[0.98] disabled:opacity-50 mt-4"
        >
          {loading ? 'Criptografando...' : 'Aplicar Criptografia Absoluta'}
        </button>
      </form>
    </div>
  );
}

export default function Page() {
  return (
    <div className="min-h-screen bg-[#070708] flex items-center justify-center p-4 selection:bg-emerald-500/30">
      <div className="fixed inset-0 pointer-events-none flex justify-center z-0">
        <div className="absolute top-[20%] w-[600px] h-[300px] bg-cyan-500/10 blur-[100px] rounded-full mix-blend-screen opacity-30"></div>
      </div>
      <Suspense fallback={<div className="text-zinc-500">Aguarde...</div>}>
         <ResetForm />
      </Suspense>
    </div>
  );
}
