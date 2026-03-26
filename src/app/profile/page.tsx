"use client";

import { useState } from "react";
import { useSession, signOut } from "next-auth/react";

export default function ProfilePage() {
  const { data: session, status } = useSession();
  
  const [senhaAntiga, setSenhaAntiga] = useState("");
  const [novaSenha, setNovaSenha] = useState("");
  const [confirmSenha, setConfirmSenha] = useState("");
  
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState<{type: 'success' | 'error', text: string} | null>(null);

  if (status === "loading") return <div className="min-h-screen bg-[#070708] flex items-center justify-center text-zinc-500">Aguarde...</div>;
  if (!session) return <div className="min-h-screen bg-[#070708] flex items-center justify-center text-rose-500">Acesso Negado</div>;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (novaSenha !== confirmSenha) {
      return setFeedback({ type: 'error', text: 'As novas senhas não conferem.' });
    }

    setLoading(true);
    setFeedback(null);

    try {
      const res = await fetch('/api/auth/profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ senhaAntiga, novaSenha })
      });
      const data = await res.json();
      
      if (!res.ok) {
        setFeedback({ type: 'error', text: data.error || 'Erro ao atualizar credencial.' });
      } else {
        setFeedback({ type: 'success', text: 'Senha atualizada com sucesso!' });
        setSenhaAntiga("");
        setNovaSenha("");
        setConfirmSenha("");
      }
    } catch (err: any) {
      setFeedback({ type: 'error', text: 'Servidor indisponível no momento.' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#070708] text-zinc-100 p-4 lg:p-8">
      <div className="max-w-2xl mx-auto space-y-6">
        
        <div className="flex items-center justify-between mb-8 pb-4 border-b border-white/5">
          <div className="flex items-center gap-4">
            <a href="/" className="w-10 h-10 bg-[#161618] rounded-xl flex items-center justify-center hover:bg-white/10 ring-1 ring-white/5 transition-all text-zinc-400 hover:text-white">&larr;</a>
            <div>
              <h1 className="text-2xl font-bold tracking-tight">Meu Perfil DP</h1>
              <p className="text-xs text-zinc-500 font-medium">Gestão de Identidade e Segurança</p>
            </div>
          </div>
          <button onClick={() => signOut({ callbackUrl: '/login' })} className="px-4 py-2 bg-rose-500/10 text-rose-500 hover:bg-rose-500/20 ring-1 ring-rose-500/20 font-bold text-xs uppercase tracking-widest rounded-lg transition-all">Sair do Cofre</button>
        </div>

        <div className="bg-[#111113]/60 p-8 rounded-[2rem] ring-1 ring-white/5 shadow-2xl relative overflow-hidden">
           <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-emerald-500 to-transparent opacity-20"></div>
           <h2 className="text-lg font-bold text-white mb-1">Identidade Corporativa</h2>
           <p className="text-xs text-zinc-500 mb-6">Os detalhes de sua autenticação no Gateway.</p>
           
           <div className="space-y-4">
             <div>
               <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-1">Colaborador</label>
               <div className="px-4 py-2.5 bg-white/5 rounded-xl border border-white/5 text-zinc-300 font-medium text-sm">{session?.user?.name}</div>
             </div>
             <div>
               <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-1">E-mail Vinculado</label>
               <div className="px-4 py-2.5 bg-white/5 rounded-xl border border-white/5 text-zinc-300 font-medium text-sm">{session?.user?.email}</div>
             </div>
             <div>
               <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-1">Permissão</label>
               <div className="px-4 py-2.5 bg-emerald-500/10 rounded-xl border border-emerald-500/20 text-emerald-400 font-bold uppercase tracking-widest text-[10px] w-max">{(session?.user as any)?.role}</div>
             </div>
           </div>
        </div>

        <div className="bg-[#111113]/60 p-8 rounded-[2rem] ring-1 ring-white/5 shadow-2xl relative overflow-hidden mt-6">
           <h2 className="text-lg font-bold text-white mb-1">Atualizar Credencial</h2>
           <p className="text-xs text-zinc-500 mb-6">Modifique sua senha criptografada caso sinta que a atual foi comprometida.</p>

           {feedback && (
            <div className={`mb-6 p-4 rounded-xl text-sm font-medium border ${feedback.type === 'error' ? 'bg-rose-500/10 border-rose-500/20 text-rose-400' : 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'}`}>
              {feedback.text}
            </div>
           )}

           <form onSubmit={handleSubmit} className="space-y-4">
             <div>
               <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-1">Senha Atual</label>
               <input 
                  type="password" 
                  value={senhaAntiga}
                  onChange={e => setSenhaAntiga(e.target.value)}
                  className="w-full bg-[#0A0A0B] border border-white/10 rounded-xl px-4 py-3 text-white placeholder-zinc-600 focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500 transition-all font-medium text-sm tracking-widest"
                  placeholder="••••••••"
                  required 
                />
             </div>
             <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                   <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-1">Nova Senha</label>
                   <input 
                      type="password" 
                      value={novaSenha}
                      onChange={e => setNovaSenha(e.target.value)}
                      className="w-full bg-[#0A0A0B] border border-white/10 rounded-xl px-4 py-3 text-white placeholder-zinc-600 focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500 transition-all font-medium text-sm tracking-widest"
                      placeholder="Nova segura"
                      required 
                      minLength={6}
                    />
                </div>
                <div>
                   <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-1">Confirmar Nova Senha</label>
                   <input 
                      type="password" 
                      value={confirmSenha}
                      onChange={e => setConfirmSenha(e.target.value)}
                      className="w-full bg-[#0A0A0B] border border-white/10 rounded-xl px-4 py-3 text-white placeholder-zinc-600 focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500 transition-all font-medium text-sm tracking-widest"
                      placeholder="Repita"
                      required 
                      minLength={6}
                    />
                </div>
             </div>
             <button 
                type="submit" 
                disabled={loading}
                className="w-full sm:w-auto bg-[#1C1C1F] hover:bg-emerald-500 text-white hover:text-[#070708] ring-1 ring-white/10 hover:ring-emerald-400 font-bold py-3 px-6 rounded-xl shadow-lg transition-all mt-4 disabled:opacity-50"
              >
                {loading ? 'Salvando...' : 'Atualizar Criptografia'}
              </button>
           </form>
        </div>

      </div>
    </div>
  );
}
