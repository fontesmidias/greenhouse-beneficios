"use client";

import { signIn } from "next-auth/react";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const res = await signIn("credentials", {
      email,
      senha,
      redirect: false,
    });

    setLoading(false);

    if (res?.error) {
      setError(res.error);
    } else {
      router.push("/");
    }
  };

  return (
    <div className="min-h-screen bg-[#070708] flex items-center justify-center p-4 selection:bg-emerald-500/30">
      <div className="fixed inset-0 pointer-events-none flex justify-center z-0">
        <div className="absolute top-[20%] w-[600px] h-[300px] bg-emerald-500/10 blur-[100px] rounded-full mix-blend-screen opacity-40"></div>
      </div>
      
      <div className="w-full max-w-sm bg-[#111113]/80 backdrop-blur-xl p-8 rounded-[2rem] ring-1 ring-white/5 shadow-2xl z-10 relative overflow-hidden">
        <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-transparent via-emerald-500 to-transparent opacity-50"></div>
        
        <div className="text-center mb-8">
          <div className="w-12 h-12 bg-gradient-to-br from-[#121214] to-[#1C1C1F] mx-auto rounded-xl ring-1 ring-white/10 flex items-center justify-center mb-4 shadow-[0_0_15px_rgba(16,185,129,0.15)] relative overflow-hidden">
             <div className="absolute bottom-0 inset-x-0 h-px bg-emerald-500/50"></div>
             <svg className="w-6 h-6 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M13 10V3L4 14h7v7l9-11h-7z"></path></svg>
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Entrar</h1>
          <p className="text-sm text-zinc-500 font-medium mt-1">Acesso exclusivo do Depto. Pessoal</p>
        </div>

        {error && (
          <div className="mb-6 p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-sm text-center font-medium">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-xs font-bold text-zinc-400 uppercase tracking-widest mb-2">E-mail</label>
            <input 
              type="email" 
              value={email}
              onChange={e => setEmail(e.target.value)}
              className="w-full bg-[#0A0A0B] border border-white/10 rounded-xl px-4 py-3 text-white placeholder-zinc-600 focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500 transition-all font-medium text-sm"
              placeholder="dp@greenhouse.com"
              required 
            />
          </div>
          <div>
            <div className="flex justify-between items-center mb-2">
              <label className="block text-xs font-bold text-zinc-400 uppercase tracking-widest">Senha Segura</label>
            </div>
            <input 
              type="password" 
              value={senha}
              onChange={e => setSenha(e.target.value)}
              className="w-full bg-[#0A0A0B] border border-white/10 rounded-xl px-4 py-3 text-white placeholder-zinc-600 focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500 transition-all font-medium text-sm tracking-widest"
              placeholder="••••••••"
              required 
            />
             <div className="text-right mt-2">
                <a href="/forgot" className="text-[10px] text-emerald-400 hover:text-emerald-300 font-bold uppercase tracking-widest transition-colors">Esqueceu sua credencial?</a>
              </div>
          </div>
          <button 
            type="submit" 
            disabled={loading}
            className="w-full bg-emerald-500 hover:bg-emerald-400 text-[#070708] font-bold py-3.5 px-4 rounded-xl shadow-[0_0_20px_rgba(16,185,129,0.2)] transition-all active:scale-[0.98] disabled:opacity-50 mt-2"
          >
            {loading ? 'Acessando Cofre...' : 'Acessar Workspace'}
          </button>
        </form>

        <div className="mt-8 text-center border-t border-white/5 pt-6">
          <p className="text-xs text-zinc-500 font-medium">Não possui acesso ao Portal?</p>
          <a href="/register" className="inline-block mt-2 text-sm text-white font-bold hover:text-emerald-400 transition-colors">Solicitar Acesso &rarr;</a>
        </div>
      </div>
    </div>
  );
}
