"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";

type TestModalState =
  | { kind: "smtp"; smtpId?: string; smtpInline?: any; defaultTo: string }
  | { kind: "evo"; evoId?: string; evoInline?: any; defaultTo: string }
  | null;

type TestResult = { success: boolean; message: string } | null;

export default function AdminSettingsPage() {
  const { data: session, status } = useSession();
  const [data, setData] = useState<any>({ smtps: [], evos: [] });
  const [loading, setLoading] = useState(true);

  const [evoForm, setEvoForm] = useState({ name: '', apiUrl: '', apiKey: '' });
  const [smtpForm, setSmtpForm] = useState({ host: '', port: '', user: '', password: '', senderName: '' });

  const [testModal, setTestModal] = useState<TestModalState>(null);
  const [testTo, setTestTo] = useState("");
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<TestResult>(null);

  const loadSettings = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/settings');
      const json = await res.json();
      setData(json);
    } catch (e) {}
    setLoading(false);
  };

  useEffect(() => {
    if (status === 'authenticated') loadSettings();
  }, [status]);

  if (status === 'loading' || loading) return <div className="p-10 text-white font-bold animate-pulse">Carregando painel gerencial...</div>;
  if ((session?.user as any)?.role !== 'ADMIN') return <div className="p-10 text-rose-500 font-bold">Acesso Negado. Reservado para Administradores.</div>;

  const userEmail = (session?.user as any)?.email || "";

  const createEvo = async (e: React.FormEvent) => {
    e.preventDefault();
    if(!evoForm.name || !evoForm.apiUrl || !evoForm.apiKey) return alert("Preencha todos os campos do WhatsApp Evo!");
    await fetch('/api/admin/settings', {
      method: 'POST',
      body: JSON.stringify({ type: 'evo', action: 'create', data: { name: evoForm.name, apiUrl: evoForm.apiUrl, apiKey: evoForm.apiKey, status: 'ATIVO' } })
    });
    setEvoForm({ name: '', apiUrl: '', apiKey: '' });
    loadSettings();
  };

  const deleteEvo = async (id: string) => {
    if(!confirm("Certeza que deseja remover esta instância do Motor WahtsApp?")) return;
    await fetch('/api/admin/settings', { method: 'POST', body: JSON.stringify({ type: 'evo', action: 'delete', data: { id } }) });
    loadSettings();
  };

  const toggleStatus = async (id: string, currentStatus: string) => {
    const newStatus = currentStatus === 'ATIVO' ? 'DESCONECTADO' : 'ATIVO';
    await fetch('/api/admin/settings', { method: 'POST', body: JSON.stringify({ type: 'evo', action: 'status', data: { id, status: newStatus } }) });
    loadSettings();
  };

  const createSmtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if(!smtpForm.host || !smtpForm.port || !smtpForm.user || !smtpForm.password) return alert("Preencha todos os campos do SMTP!");
    await fetch('/api/admin/settings', {
      method: 'POST',
      body: JSON.stringify({
        type: 'smtp',
        action: 'create',
        data: {
          host: smtpForm.host,
          port: Number(smtpForm.port),
          user: smtpForm.user,
          password: smtpForm.password,
          senderName: smtpForm.senderName || smtpForm.user,
          isActive: true
        }
      })
    });
    setSmtpForm({ host: '', port: '', user: '', password: '', senderName: '' });
    loadSettings();
  };

  const deleteSmtp = async (id: string) => {
    if(!confirm("Deseja apagar esse servidor SMTP?")) return;
    await fetch('/api/admin/settings', { method: 'POST', body: JSON.stringify({ type: 'smtp', action: 'delete', data: { id } }) });
    loadSettings();
  };

  const openTestSmtpExisting = (smtp: any) => {
    setTestResult(null);
    setTestTo(userEmail);
    setTestModal({ kind: "smtp", smtpId: smtp.id, defaultTo: userEmail });
  };

  const openTestSmtpInline = () => {
    if (!smtpForm.host || !smtpForm.port || !smtpForm.user || !smtpForm.password) {
      alert("Preencha host, porta, usuário e senha antes de testar.");
      return;
    }
    setTestResult(null);
    setTestTo(userEmail);
    setTestModal({
      kind: "smtp",
      smtpInline: {
        host: smtpForm.host,
        port: Number(smtpForm.port),
        user: smtpForm.user,
        password: smtpForm.password,
        senderName: smtpForm.senderName || smtpForm.user,
      },
      defaultTo: userEmail,
    });
  };

  const openTestEvoExisting = (evo: any) => {
    setTestResult(null);
    setTestTo("");
    setTestModal({ kind: "evo", evoId: evo.id, defaultTo: "" });
  };

  const openTestEvoInline = () => {
    if (!evoForm.name || !evoForm.apiUrl || !evoForm.apiKey) {
      alert("Preencha nome, URL e chave antes de testar.");
      return;
    }
    setTestResult(null);
    setTestTo("");
    setTestModal({
      kind: "evo",
      evoInline: { name: evoForm.name, apiUrl: evoForm.apiUrl, apiKey: evoForm.apiKey },
      defaultTo: "",
    });
  };

  const submitTest = async () => {
    if (!testModal) return;
    if (!testTo.trim()) {
      setTestResult({ success: false, message: "Informe o destinatário." });
      return;
    }
    setTesting(true);
    setTestResult(null);
    try {
      const url = testModal.kind === "smtp" ? "/api/admin/settings/test-smtp" : "/api/admin/settings/test-evo";
      const body =
        testModal.kind === "smtp"
          ? { smtpId: testModal.smtpId, smtpInline: testModal.smtpInline, toEmail: testTo.trim() }
          : { evoId: testModal.evoId, evoInline: testModal.evoInline, toPhone: testTo.trim() };

      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const json = await res.json();
      if (json.success) {
        setTestResult({
          success: true,
          message:
            testModal.kind === "smtp"
              ? `E-mail enviado com sucesso para ${testTo}. Verifique a caixa de entrada.`
              : `Mensagem enviada com sucesso para ${testTo}. Verifique o WhatsApp.`,
        });
      } else {
        setTestResult({ success: false, message: json.error || "Falha desconhecida no envio." });
      }
    } catch (e: any) {
      setTestResult({ success: false, message: e?.message || "Servidor indisponível." });
    }
    setTesting(false);
  };

  const closeTestModal = () => {
    if (testing) return;
    setTestModal(null);
    setTestResult(null);
    setTestTo("");
  };

  return (
    <div className="min-h-screen bg-[#070708] p-8 text-white font-sans selection:bg-emerald-500/30">
      <div className="max-w-6xl mx-auto space-y-8">
        <header className="flex justify-between items-center border-b border-white/5 pb-6">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-white mb-2">Engrenagens da Plataforma</h1>
            <p className="text-zinc-400 text-sm">Gerencie múltiplos servidores SMTP e instâncias roteadoras do WhatsApp (Evo).</p>
          </div>
          <div className="flex gap-3">
            <a href="/admin/users" className="bg-emerald-500/10 hover:bg-emerald-500 hover:text-[#070708] text-emerald-400 px-4 py-2.5 rounded-xl text-xs font-bold transition-all ring-1 ring-emerald-500/30 uppercase tracking-widest">Gerenciar Usuários</a>
            <a href="/" className="bg-white/5 hover:bg-white/10 px-4 py-2.5 rounded-xl text-xs font-bold transition-all ring-1 ring-white/10 uppercase tracking-widest text-zinc-300">Retornar ao Painel Operacional</a>
          </div>
        </header>

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">

          {/* SMTP Config Section */}
          <div className="bg-[#111113]/80 border border-white/5 rounded-[2rem] p-8 shadow-2xl relative overflow-hidden flex flex-col">
             <div className="absolute top-0 inset-x-0 h-[2px] bg-gradient-to-r from-transparent via-emerald-500 to-transparent opacity-50"></div>
             <h2 className="text-xl font-bold mb-6 text-emerald-400 flex items-center gap-3">
                <div className="p-2 bg-emerald-500/10 rounded-lg"><svg className="w-5 h-5 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"></path></svg></div>
                Servidores SMTP
             </h2>

             <form onSubmit={createSmtp} className="space-y-4 mb-8 bg-[#0C0C0E] border border-white/5 rounded-2xl p-5">
               <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-widest mb-4">Adicionar Novo SMTP</h3>
               <div>
                  <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-1.5">Host & Porta</label>
                  <div className="flex gap-2">
                    <input value={smtpForm.host} onChange={e=>setSmtpForm({...smtpForm, host: e.target.value})} type="text" placeholder="smtp.gmail.com" className="w-2/3 bg-[#161618] border border-transparent rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-emerald-500 transition-all text-xs" />
                    <input value={smtpForm.port} onChange={e=>setSmtpForm({...smtpForm, port: e.target.value})} type="number" placeholder="465" className="w-1/3 bg-[#161618] border border-transparent rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-emerald-500 transition-all text-xs" />
                  </div>
               </div>
               <div>
                  <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-1.5">Usuário (E-mail)</label>
                  <input value={smtpForm.user} onChange={e=>setSmtpForm({...smtpForm, user: e.target.value})} type="email" placeholder="email@provedor.com" className="w-full bg-[#161618] border border-transparent rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-emerald-500 transition-all text-xs" />
               </div>
               <div>
                  <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-1.5">Senha ou Token</label>
                  <input value={smtpForm.password} onChange={e=>setSmtpForm({...smtpForm, password: e.target.value})} type="password" placeholder="••••••••••••" className="w-full bg-[#161618] border border-transparent rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-emerald-500 transition-all tracking-widest text-xs" />
               </div>
               <div className="flex gap-2">
                 <button type="button" onClick={openTestSmtpInline} className="flex-1 bg-sky-500/10 hover:bg-sky-500 hover:text-white text-sky-400 font-bold py-2.5 px-4 rounded-xl ring-1 ring-sky-500/30 transition-all text-xs uppercase tracking-wide">
                   Testar antes de salvar
                 </button>
                 <button type="submit" className="flex-1 bg-emerald-500 hover:bg-emerald-400 text-[#070708] font-bold py-2.5 px-4 rounded-xl shadow-[0_0_20px_rgba(16,185,129,0.2)] transition-all active:scale-[0.98] text-xs uppercase tracking-wide">
                   + Salvar SMTP
                 </button>
               </div>
             </form>

             <div className="flex-1 overflow-y-auto">
                <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-widest mb-4">SMTPs Configurados</h3>
                <div className="space-y-3">
                  {data?.smtps?.length === 0 && <p className="text-xs text-zinc-600 font-medium italic">Nenhum servidor SMTP dinâmico gravado. O disparador usará o `.env` global como fallback.</p>}
                  {data?.smtps?.map((smtp: any) => (
                    <div key={smtp.id} className="bg-[#161618] border border-white/5 p-4 rounded-xl flex justify-between items-center group">
                      <div>
                        <div className="font-bold text-sm text-zinc-200">{smtp.user}</div>
                        <div className="text-[10px] text-zinc-500 font-mono mt-0.5">{smtp.host}:{smtp.port}</div>
                      </div>
                      <div className="flex items-center gap-2">
                        <button onClick={() => openTestSmtpExisting(smtp)} className="text-sky-400 hover:text-white bg-sky-500/10 hover:bg-sky-500 px-3 py-1.5 rounded-lg ring-1 ring-sky-500/30 transition-all text-[10px] font-bold uppercase tracking-wide" title="Enviar e-mail de teste">
                           Enviar teste
                        </button>
                        <button onClick={() => deleteSmtp(smtp.id)} className="text-rose-500 hover:text-white bg-rose-500/10 hover:bg-rose-500 p-2 rounded-lg transition-all opacity-0 group-hover:opacity-100 ring-1 ring-rose-500/20" title="Remover">
                           <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
             </div>
          </div>

          {/* Evo Instance Section */}
          <div className="bg-[#111113] border border-white/5 rounded-[2rem] p-8 shadow-2xl relative overflow-hidden flex flex-col">
             <div className="absolute top-0 inset-x-0 h-[2px] bg-gradient-to-r from-transparent via-blue-500 to-transparent opacity-50"></div>
             <h2 className="text-xl font-bold mb-6 text-blue-400 flex items-center gap-3">
                <div className="p-2 bg-blue-500/10 rounded-lg"><svg className="w-5 h-5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z"></path></svg></div>
                Roteadores Multi-Instâncias (Evo)
             </h2>

             <form onSubmit={createEvo} className="space-y-4 mb-8 bg-[#0C0C0E] border border-white/5 rounded-2xl p-5">
               <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-widest mb-4">Conectar Nova Instância WPP</h3>
               <div>
                  <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-1.5">Nome / Apelido do Número</label>
                  <input value={evoForm.name} onChange={e=>setEvoForm({...evoForm, name: e.target.value})} type="text" placeholder="WPP Comercial 01" className="w-full bg-[#161618] border border-transparent rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-blue-500 transition-all text-xs" />
               </div>
               <div>
                  <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-1.5">URL do Servidor Evo Base</label>
                  <input value={evoForm.apiUrl} onChange={e=>setEvoForm({...evoForm, apiUrl: e.target.value})} type="url" placeholder="https://api-evo.empresa.com" className="w-full bg-[#161618] border border-transparent rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-blue-500 transition-all text-xs" />
               </div>
               <div>
                  <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-1.5">Global API Token</label>
                  <input value={evoForm.apiKey} onChange={e=>setEvoForm({...evoForm, apiKey: e.target.value})} type="password" placeholder="••••••••••••" className="w-full bg-[#161618] border border-transparent rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-blue-500 transition-all tracking-widest text-xs" />
               </div>
               <div className="flex gap-2">
                 <button type="button" onClick={openTestEvoInline} className="flex-1 bg-sky-500/10 hover:bg-sky-500 hover:text-white text-sky-400 font-bold py-2.5 px-4 rounded-xl ring-1 ring-sky-500/30 transition-all text-xs uppercase tracking-wide">
                   Testar antes de salvar
                 </button>
                 <button type="submit" className="flex-1 bg-blue-600 hover:bg-blue-500 text-white font-bold py-2.5 px-4 rounded-xl shadow-[0_0_20px_rgba(37,99,235,0.2)] transition-all active:scale-[0.98] text-xs uppercase tracking-wide">
                   + Salvar Instância
                 </button>
               </div>
             </form>

             <div className="flex-1 overflow-y-auto">
                <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-widest mb-4">Instâncias Roteáveis Cadastradas</h3>
                <div className="space-y-3">
                  {data?.evos?.length === 0 && <p className="text-xs text-zinc-600 font-medium italic">O mecanismo de balanceamento anti-ban está desativado pois nenhuma instância extra foi cadastrada. Lendo .env padrão.</p>}
                  {data?.evos?.map((evo: any) => (
                    <div key={evo.id} className="bg-[#161618] border border-white/5 p-4 rounded-xl flex justify-between items-center group">
                      <div>
                        <div className="font-bold text-sm text-zinc-200">{evo.name}</div>
                        <div className="text-[10px] text-zinc-500 font-mono mt-0.5 truncate max-w-[200px]">{evo.apiUrl}</div>
                      </div>
                      <div className="flex items-center gap-2">
                        <button onClick={() => openTestEvoExisting(evo)} className="text-sky-400 hover:text-white bg-sky-500/10 hover:bg-sky-500 px-3 py-1.5 rounded-lg ring-1 ring-sky-500/30 transition-all text-[10px] font-bold uppercase tracking-wide" title="Enviar mensagem teste">
                           Enviar teste
                        </button>
                        <button onClick={() => toggleStatus(evo.id, evo.status)} className={`px-2 py-1 text-[10px] font-bold rounded-md uppercase tracking-wide cursor-pointer ring-1 transition-all ${evo.status === 'ATIVO' ? 'bg-emerald-500/10 text-emerald-400 ring-emerald-500/30 hover:bg-emerald-500/20' : 'bg-black text-zinc-500 ring-white/10 hover:bg-white/5'}`} title="Pausar/Ativar envio de mensagens por este número">
                          {evo.status}
                        </button>
                        <button onClick={() => deleteEvo(evo.id)} className="text-rose-500 hover:text-white bg-rose-500/10 hover:bg-rose-500 p-2 rounded-lg transition-all ring-1 ring-rose-500/20" title="Remover Instância">
                           <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
             </div>
          </div>

        </div>
      </div>

      {testModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={closeTestModal}>
          <div className="bg-[#111113] border border-white/10 rounded-[2rem] p-8 max-w-md w-full shadow-2xl relative" onClick={(e) => e.stopPropagation()}>
            <div className={`absolute top-0 inset-x-0 h-[2px] bg-gradient-to-r from-transparent ${testModal.kind === "smtp" ? "via-emerald-500" : "via-blue-500"} to-transparent opacity-50`}></div>
            <h2 className={`text-xl font-bold mb-2 ${testModal.kind === "smtp" ? "text-emerald-400" : "text-blue-400"}`}>
              {testModal.kind === "smtp" ? "Enviar e-mail de teste" : "Enviar mensagem de teste"}
            </h2>
            <p className="text-xs text-zinc-500 mb-6">
              {testModal.kind === "smtp"
                ? "Vamos disparar um e-mail real usando essa credencial. Se o e-mail chegar, está funcionando."
                : "Vamos disparar uma mensagem real de WhatsApp. Se você receber, a credencial está funcionando."}
            </p>

            <div className="space-y-4">
              <div>
                <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-1.5">
                  {testModal.kind === "smtp" ? "E-mail destinatário" : "WhatsApp destinatário (com DDI)"}
                </label>
                <input
                  value={testTo}
                  onChange={(e) => setTestTo(e.target.value)}
                  type={testModal.kind === "smtp" ? "email" : "tel"}
                  placeholder={testModal.kind === "smtp" ? "voce@exemplo.com" : "5561999999999"}
                  className="w-full bg-[#161618] border border-transparent rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-emerald-500 transition-all text-xs"
                  disabled={testing}
                />
              </div>

              {testResult && (
                <div className={`p-3 rounded-xl text-xs font-medium ring-1 ${testResult.success ? "bg-emerald-500/10 text-emerald-300 ring-emerald-500/30" : "bg-rose-500/10 text-rose-300 ring-rose-500/30"}`}>
                  <div className="font-bold mb-1">{testResult.success ? "✓ Sucesso" : "✗ Falha"}</div>
                  <div className="break-words">{testResult.message}</div>
                </div>
              )}

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={closeTestModal}
                  disabled={testing}
                  className="flex-1 bg-white/5 hover:bg-white/10 text-zinc-300 font-bold py-2.5 px-4 rounded-xl text-xs uppercase tracking-wide transition-all"
                >
                  Fechar
                </button>
                <button
                  type="button"
                  onClick={submitTest}
                  disabled={testing}
                  className={`flex-1 font-bold py-2.5 px-4 rounded-xl transition-all active:scale-[0.98] text-xs uppercase tracking-wide disabled:opacity-50 ${testModal.kind === "smtp" ? "bg-emerald-500 hover:bg-emerald-400 text-[#070708] shadow-[0_0_20px_rgba(16,185,129,0.2)]" : "bg-blue-600 hover:bg-blue-500 text-white shadow-[0_0_20px_rgba(37,99,235,0.2)]"}`}
                >
                  {testing ? "Enviando..." : "Enviar agora"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
