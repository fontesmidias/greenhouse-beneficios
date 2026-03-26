"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function RegisterPage() {
  const router = useRouter();
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [cargo, setCargo] = useState("");
  
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState<{type: 'success' | 'error', text: string} | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setFeedback(null);

    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nome, email, senha, cargo })
      });
      
      const data = await res.json();
      
      if (!res.ok) {
        setFeedback({ type: 'error', text: data.error || 'Erro ao realizar solicitação.' });
      } else {
        setFeedback({ type: 'success', text: 'Solicitação de acesso enviada! O Administrador avaliará seu pedido em breve.' });
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
        <div className="absolute top-[20%] w-[600px] h-[300px] bg-emerald-500/10 blur-[100px] rounded-full mix-blend-screen opacity-40"></div>
      </div>
      
      <div className="w-full max-w-md bg-[#111113]/80 backdrop-blur-xl p-8 rounded-[2rem] ring-1 ring-white/5 shadow-2xl z-10 relative overflow-hidden">
        <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-transparent via-emerald-500 to-transparent opacity-50"></div>
        
        <div className="mb-8">
          <a href="/login" className="text-[10px] text-zinc-500 hover:text-white font-bold uppercase tracking-widest transition-colors inline-flex items-center gap-1 mb-6">&larr; Voltar ao Login</a>
          <h1 className="text-2xl font-bold text-white tracking-tight">Solicitar Acesso</h1>
          <p className="text-sm text-zinc-500 font-medium mt-2 leading-relaxed">Preencha seus dados corporativos. Sua conta será analisada pela equipe de Administração N8N antes da liberação.</p>
        </div>

        {feedback && (
          <div className={`mb-6 p-4 rounded-xl text-sm text-center font-medium border ${feedback.type === 'error' ? 'bg-rose-500/10 border-rose-500/20 text-rose-400' : 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'}`}>
            {feedback.text}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-1.5">Nome Completo</label>
              <input 
                type="text" 
                value={nome}
                onChange={e => setNome(e.target.value)}
                className="w-full bg-[#0A0A0B] border border-white/10 rounded-xl px-4 py-3 text-white placeholder-zinc-600 focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500 transition-all font-medium text-sm"
                placeholder="João Silva"
                required 
              />
            </div>
            
            <div className="col-span-2">
              <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-1.5">E-mail Corporativo</label>
              <input 
                type="email" 
                value={email}
                onChange={e => setEmail(e.target.value)}
                className="w-full bg-[#0A0A0B] border border-white/10 rounded-xl px-4 py-3 text-white placeholder-zinc-600 focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500 transition-all font-medium text-sm"
                placeholder="dp@greenhouse.com"
                required 
              />
            </div>

            <div className="col-span-2 sm:col-span-1">
              <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-1.5">Cargo / Setor</label>
              <input 
                type="text" 
                value={cargo}
                onChange={e => setCargo(e.target.value)}
                className="w-full bg-[#0A0A0B] border border-white/10 rounded-xl px-4 py-3 text-white placeholder-zinc-600 focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500 transition-all font-medium text-sm"
                placeholder="Analista de RH"
                required 
              />
            </div>
            
            <div className="col-span-2 sm:col-span-1">
              <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-1.5">Criar Senha</label>
              <input 
                type="password" 
                value={senha}
                onChange={e => setSenha(e.target.value)}
                className="w-full bg-[#0A0A0B] border border-white/10 rounded-xl px-4 py-3 text-white placeholder-zinc-600 focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500 transition-all font-medium text-sm tracking-widest"
                placeholder="••••••••"
                required 
              />
            </div>
          </div>

          <button 
            type="submit" 
            disabled={loading || feedback?.type === 'success'}
            className="w-full bg-emerald-500 hover:bg-emerald-400 text-[#070708] font-bold py-3.5 px-4 rounded-xl shadow-[0_0_20px_rgba(16,185,129,0.2)] transition-all active:scale-[0.98] disabled:opacity-50 mt-6"
          >
            {loading ? 'Submetendo Perfil...' : 'Submeter Solicitação de Acesso'}
          </button>
        </form>
      </div>
    </div>
  );
}
