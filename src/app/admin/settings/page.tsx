import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";

export default async function AdminSettingsPage() {
  const session = await getServerSession();
  
  // Protect the route
  if (!session || (session.user as any)?.role !== 'ADMIN') {
    redirect('/');
  }

  return (
    <div className="min-h-screen bg-[#070708] p-8 text-white">
      <div className="max-w-6xl mx-auto space-y-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-white mb-2">Configurações Avançadas</h1>
          <p className="text-zinc-400">Gerencie servidores SMTP e Múltiplas instâncias de disparo do WhatsApp Evo.</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          
          {/* SMTP Config Section */}
          <div className="bg-[#111113] border border-white/5 rounded-[2rem] p-8 shadow-2xl relative overflow-hidden">
             <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-transparent via-emerald-500 to-transparent opacity-50"></div>
             <h2 className="text-xl font-bold mb-6 text-emerald-400 flex items-center gap-2">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"></path></svg>
                Servidores SMTP
             </h2>
             <form className="space-y-4">
               <div>
                  <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-1.5">Servidor Host</label>
                  <input type="text" placeholder="smtp.gmail.com" className="w-full bg-[#0A0A0B] border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-1 focus:ring-emerald-500 transition-all font-medium text-sm" />
               </div>
               <div className="grid grid-cols-2 gap-4">
                 <div>
                    <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-1.5">Porta</label>
                    <input type="number" placeholder="465" className="w-full bg-[#0A0A0B] border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-1 focus:ring-emerald-500 transition-all font-medium text-sm" />
                 </div>
                 <div>
                    <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-1.5">Usuário</label>
                    <input type="text" placeholder="email@gmail.com" className="w-full bg-[#0A0A0B] border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-1 focus:ring-emerald-500 transition-all font-medium text-sm" />
                 </div>
               </div>
               <div>
                  <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-1.5">Senha (App Password)</label>
                  <input type="password" placeholder="••••••••••••" className="w-full bg-[#0A0A0B] border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-1 focus:ring-emerald-500 transition-all font-medium border-emerald-500 text-sm tracking-widest" />
               </div>
               <button type="button" className="w-full bg-emerald-500 hover:bg-emerald-400 text-[#070708] font-bold py-3 px-4 rounded-xl shadow-[0_0_20px_rgba(16,185,129,0.2)] transition-all active:scale-[0.98] mt-4 flex items-center justify-center gap-2">
                 Salvar Servidor SMTP
               </button>
             </form>
          </div>

          {/* Evo Instance Section */}
          <div className="bg-[#111113] border border-white/5 rounded-[2rem] p-8 shadow-2xl relative overflow-hidden">
             <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-transparent via-blue-500 to-transparent opacity-50"></div>
             <h2 className="text-xl font-bold mb-6 text-blue-400 flex items-center gap-2">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z"></path></svg>
                Instâncias Evo (WhatsApp)
             </h2>
             <form className="space-y-4">
               <div>
                  <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-1.5">Nome da Instância</label>
                  <input type="text" placeholder="Disparo Marketing 01" className="w-full bg-[#0A0A0B] border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-1 focus:ring-blue-500 transition-all font-medium text-sm" />
               </div>
               <div>
                  <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-1.5">URL da API (Evo Base URL)</label>
                  <input type="url" placeholder="http://evo-api:8080" className="w-full bg-[#0A0A0B] border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-1 focus:ring-blue-500 transition-all font-medium text-sm" />
               </div>
               <div>
                  <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-1.5">Global API Key</label>
                  <input type="password" placeholder="••••••••••••" className="w-full bg-[#0A0A0B] border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-1 focus:ring-blue-500 transition-all font-medium text-sm tracking-widest" />
               </div>
               <button type="button" className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 px-4 rounded-xl shadow-[0_0_20px_rgba(37,99,235,0.2)] transition-all active:scale-[0.98] mt-4 flex items-center justify-center gap-2">
                 Conectar Instância
               </button>
             </form>
          </div>

        </div>
      </div>
    </div>
  );
}
