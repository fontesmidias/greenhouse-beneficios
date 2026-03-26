"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function ForgotPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState<{type: 'success' | 'error', text: string} | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setFeedback(null);

    try {
      const res = await fetch('/api/auth/forgot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      });
      const data = await res.json();
      
      if (!res.ok) {
        setFeedback({ type: 'error', text: data.error || 'Erro ao recuperar acesso.' });
      } else {
        setFeedback({ type: 'success', text: 'Se o email existir, um link seguro com duração de 1 hora foi enviado para recuperar sua senha.' });
        setTimeout(() => router.push('/login'), 5000);
      }
    } catch (err: any) {
      setFeedback({ type: 'error', text: 'Servidor indisponível no momento.' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#070708] flex items-center justify-center p-4 selection:bg-emerald-500/30">
      <div className="fixed inset-0 pointer-events-none flex justify-center z-0">
        <div className="absolute top-[20%] w-[600px] h-[300px] bg-sky-500/10 blur-[100px] rounded-full mix-blend-screen opacity-40"></div>
      </div>
      
      <div className="w-full max-w-sm bg-[#111113]/80 backdrop-blur-xl p-8 rounded-[2rem] ring-1 ring-white/5 shadow-2xl z-10 relative overflow-hidden">
        <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-transparent via-sky-500 to-transparent opacity-50"></div>
        
        <div className="mb-8">
          <a href="/login" className="text-[10px] text-zinc-500 hover:text-white font-bold uppercase tracking-widest transition-colors inline-flex items-center gap-1 mb-6">&larr; Voltar ao Login</a>
          <div className="w-12 h-12 bg-gradient-to-br from-[#121214] to-[#1C1C1F] mx-auto rounded-xl ring-1 ring-white/10 flex items-center justify-center mb-4 shadow-[0_0_15px_rgba(14,165,233,0.15)] relative overflow-hidden">
             <div className="absolute bottom-0 inset-x-0 h-px bg-sky-500/50"></div>
             <svg className="w-6 h-6 text-sky-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"></path></svg>
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight text-center">Recuperar Acesso</h1>
          <p className="text-sm text-zinc-500 font-medium mt-2 text-center">Vamos enviar um Magic Link para você resetar a sua senha.</p>
        </div>

        {feedback && (
          <div className={`mb-6 p-4 rounded-xl text-sm text-center font-medium border ${feedback.type === 'error' ? 'bg-rose-500/10 border-rose-500/20 text-rose-400' : 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'}`}>
            {feedback.text}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-zinc-400 uppercase tracking-widest mb-2">E-mail Corporativo</label>
            <input 
              type="email" 
              value={email}
              onChange={e => setEmail(e.target.value)}
              className="w-full bg-[#0A0A0B] border border-white/10 rounded-xl px-4 py-3 text-white placeholder-zinc-600 focus:outline-none focus:ring-1 focus:ring-sky-500 focus:border-sky-500 transition-all font-medium text-sm"
              placeholder="dp@greenhouse.com"
              required 
            />
          </div>

          <button 
            type="submit" 
            disabled={loading || feedback?.type === 'success'}
            className="w-full bg-sky-500 hover:bg-sky-400 text-[#070708] font-bold py-3.5 px-4 rounded-xl shadow-[0_0_20px_rgba(14,165,233,0.2)] transition-all active:scale-[0.98] disabled:opacity-50"
          >
            {loading ? 'Preparando Disparo...' : 'Disparar Link de Login'}
          </button>
        </form>
      </div>
    </div>
  );
}
