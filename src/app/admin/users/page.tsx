"use client";

import { useState, useEffect, useMemo } from "react";
import { useSession } from "next-auth/react";

type AdminUser = {
  id: string;
  nome: string;
  email: string;
  cargo: string | null;
  role: "ADMIN" | "USER";
  status: "PENDENTE" | "ATIVO" | "RECUSADO";
  createdAt: string;
};

type Toast = { type: "success" | "error" | "info"; text: string } | null;

export default function AdminUsersPage() {
  const { data: session, status } = useSession();
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<Toast>(null);

  const [statusFilter, setStatusFilter] = useState<"" | "PENDENTE" | "ATIVO" | "RECUSADO">("");
  const [search, setSearch] = useState("");

  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ nome: "", email: "", cargo: "", role: "USER" as "USER" | "ADMIN" });
  const [submitting, setSubmitting] = useState(false);
  const [emailFieldError, setEmailFieldError] = useState<string | null>(null);

  const showToast = (t: NonNullable<Toast>) => {
    setToast(t);
    setTimeout(() => setToast(null), 5000);
  };

  const loadUsers = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/users");
      const json = await res.json();
      if (res.ok) setUsers(json.users || []);
      else showToast({ type: "error", text: json.error || "Falha ao carregar usuários." });
    } catch {
      showToast({ type: "error", text: "Servidor indisponível." });
    }
    setLoading(false);
  };

  useEffect(() => {
    if (status === "authenticated") loadUsers();
  }, [status]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return users.filter((u) => {
      if (statusFilter && u.status !== statusFilter) return false;
      if (q && !u.nome.toLowerCase().includes(q) && !u.email.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [users, statusFilter, search]);

  if (status === "loading" || loading) {
    return <div className="p-10 text-white font-bold animate-pulse">Carregando gerenciador de usuários...</div>;
  }
  if ((session?.user as any)?.role !== "ADMIN") {
    return <div className="p-10 text-rose-500 font-bold">Acesso Negado. Reservado para Administradores.</div>;
  }

  const submitNewUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setEmailFieldError(null);
    if (!form.nome.trim() || !form.email.trim()) {
      showToast({ type: "error", text: "Nome e e-mail são obrigatórios." });
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch("/api/admin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const json = await res.json();
      if (res.status === 409) {
        setEmailFieldError(json.error || "Email já cadastrado.");
      } else if (!res.ok) {
        showToast({ type: "error", text: json.error || "Falha ao criar usuário." });
      } else {
        showToast({ type: "success", text: `Usuário criado. Link de definição de senha enviado para ${form.email}.` });
        setShowModal(false);
        setForm({ nome: "", email: "", cargo: "", role: "USER" });
        loadUsers();
      }
    } catch {
      showToast({ type: "error", text: "Servidor indisponível." });
    }
    setSubmitting(false);
  };

  const approveUser = async (u: AdminUser) => {
    if (!confirm(`Aprovar acesso de ${u.nome}?`)) return;
    try {
      const res = await fetch(`/api/admin/approve?id=${u.id}`);
      if (!res.ok) {
        const text = await res.text();
        showToast({ type: "error", text: text || "Falha ao aprovar." });
        return;
      }
      showToast({ type: "success", text: `${u.nome} aprovado.` });
      loadUsers();
    } catch {
      showToast({ type: "error", text: "Servidor indisponível." });
    }
  };

  const rejectUser = async (u: AdminUser) => {
    if (!confirm(`Recusar acesso de ${u.nome}? Ele(a) não conseguirá logar.`)) return;
    try {
      const res = await fetch(`/api/admin/users/${u.id}/reject`, { method: "POST" });
      const json = await res.json();
      if (!res.ok) {
        showToast({ type: "error", text: json.error || "Falha ao recusar." });
        return;
      }
      showToast({ type: "success", text: `${u.nome} marcado como RECUSADO.` });
      loadUsers();
    } catch {
      showToast({ type: "error", text: "Servidor indisponível." });
    }
  };

  const resendReset = async (u: AdminUser) => {
    if (!confirm(`Reenviar link de definição de senha para ${u.email}? O link anterior será invalidado.`)) return;
    try {
      const res = await fetch(`/api/admin/users/${u.id}/resend-reset`, { method: "POST" });
      const json = await res.json();
      if (!res.ok) {
        showToast({ type: "error", text: json.error || "Falha ao reenviar." });
        return;
      }
      if (json.warning) {
        showToast({ type: "info", text: json.warning });
      } else {
        showToast({ type: "success", text: `Link reenviado para ${u.email}.` });
      }
    } catch {
      showToast({ type: "error", text: "Servidor indisponível." });
    }
  };

  return (
    <div className="min-h-screen bg-[#070708] p-8 text-white font-sans selection:bg-emerald-500/30">
      <div className="max-w-7xl mx-auto space-y-8">
        <header className="flex flex-wrap gap-4 justify-between items-center border-b border-white/5 pb-6">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-white mb-2">Gerenciar Usuários</h1>
            <p className="text-zinc-400 text-sm">Crie acessos, aprove cadastros pendentes e gerencie os colaboradores.</p>
          </div>
          <div className="flex gap-3">
            <a href="/admin/settings" className="bg-white/5 hover:bg-white/10 px-4 py-2.5 rounded-xl text-xs font-bold transition-all ring-1 ring-white/10 uppercase tracking-widest text-zinc-300">
              Engrenagens
            </a>
            <a href="/" className="bg-white/5 hover:bg-white/10 px-4 py-2.5 rounded-xl text-xs font-bold transition-all ring-1 ring-white/10 uppercase tracking-widest text-zinc-300">
              Painel Operacional
            </a>
          </div>
        </header>

        <div className="bg-[#111113]/80 border border-white/5 rounded-[2rem] p-8 shadow-2xl">
          <div className="flex flex-wrap gap-4 items-end justify-between mb-6">
            <div className="flex flex-wrap gap-3">
              <div>
                <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-1.5">Buscar</label>
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  type="text"
                  placeholder="Nome ou e-mail"
                  className="bg-[#161618] border border-transparent rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-emerald-500 transition-all text-xs w-72"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-1.5">Status</label>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value as any)}
                  className="bg-[#161618] border border-transparent rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-emerald-500 transition-all text-xs"
                >
                  <option value="">Todos</option>
                  <option value="PENDENTE">Pendente</option>
                  <option value="ATIVO">Ativo</option>
                  <option value="RECUSADO">Recusado</option>
                </select>
              </div>
            </div>

            <button
              onClick={() => setShowModal(true)}
              className="bg-emerald-500 hover:bg-emerald-400 text-[#070708] font-bold py-2.5 px-5 rounded-xl shadow-[0_0_20px_rgba(16,185,129,0.2)] transition-all active:scale-[0.98] text-xs uppercase tracking-wide"
            >
              + Criar Novo Usuário
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest border-b border-white/5">
                  <th className="text-left py-3 pr-4">Nome</th>
                  <th className="text-left py-3 pr-4">E-mail</th>
                  <th className="text-left py-3 pr-4">Cargo</th>
                  <th className="text-left py-3 pr-4">Role</th>
                  <th className="text-left py-3 pr-4">Status</th>
                  <th className="text-right py-3">Ações</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={6} className="py-10 text-center text-zinc-600 italic">
                      Nenhum usuário encontrado com esses filtros.
                    </td>
                  </tr>
                )}
                {filtered.map((u) => (
                  <tr key={u.id} className="border-b border-white/5 hover:bg-white/[0.02] group">
                    <td className="py-3 pr-4 font-medium text-zinc-200">{u.nome}</td>
                    <td className="py-3 pr-4 text-zinc-400 font-mono text-xs">{u.email}</td>
                    <td className="py-3 pr-4 text-zinc-500 text-xs">{u.cargo || "—"}</td>
                    <td className="py-3 pr-4">
                      <span className={`px-2 py-1 text-[10px] font-bold rounded-md uppercase tracking-wide ring-1 ${u.role === "ADMIN" ? "bg-amber-500/10 text-amber-400 ring-amber-500/30" : "bg-zinc-500/10 text-zinc-300 ring-zinc-500/20"}`}>
                        {u.role}
                      </span>
                    </td>
                    <td className="py-3 pr-4">
                      <span className={`px-2 py-1 text-[10px] font-bold rounded-md uppercase tracking-wide ring-1 ${u.status === "ATIVO" ? "bg-emerald-500/10 text-emerald-400 ring-emerald-500/30" : u.status === "PENDENTE" ? "bg-yellow-500/10 text-yellow-400 ring-yellow-500/30" : "bg-rose-500/10 text-rose-400 ring-rose-500/30"}`}>
                        {u.status}
                      </span>
                    </td>
                    <td className="py-3 text-right">
                      <div className="flex justify-end gap-2">
                        {u.status === "PENDENTE" && (
                          <>
                            <button
                              onClick={() => approveUser(u)}
                              className="bg-emerald-500/10 hover:bg-emerald-500 hover:text-[#070708] text-emerald-400 px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wide ring-1 ring-emerald-500/30 transition-all"
                            >
                              Aprovar
                            </button>
                            <button
                              onClick={() => rejectUser(u)}
                              className="bg-rose-500/10 hover:bg-rose-500 hover:text-white text-rose-400 px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wide ring-1 ring-rose-500/30 transition-all"
                            >
                              Recusar
                            </button>
                          </>
                        )}
                        {u.status === "ATIVO" && (
                          <button
                            onClick={() => resendReset(u)}
                            className="bg-blue-500/10 hover:bg-blue-500 hover:text-white text-blue-400 px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wide ring-1 ring-blue-500/30 transition-all"
                          >
                            Reenviar link de senha
                          </button>
                        )}
                        {u.status === "RECUSADO" && (
                          <span className="text-zinc-600 text-[10px] italic">sem ações</span>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => !submitting && setShowModal(false)}>
          <div className="bg-[#111113] border border-white/10 rounded-[2rem] p-8 max-w-md w-full shadow-2xl relative" onClick={(e) => e.stopPropagation()}>
            <div className="absolute top-0 inset-x-0 h-[2px] bg-gradient-to-r from-transparent via-emerald-500 to-transparent opacity-50"></div>
            <h2 className="text-xl font-bold mb-2 text-emerald-400">Criar Novo Usuário</h2>
            <p className="text-xs text-zinc-500 mb-6">O usuário receberá um e-mail com link para definir a senha. O link não expira até ser usado.</p>

            <form onSubmit={submitNewUser} className="space-y-4">
              <div>
                <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-1.5">Nome *</label>
                <input
                  value={form.nome}
                  onChange={(e) => setForm({ ...form, nome: e.target.value })}
                  type="text"
                  required
                  placeholder="Nome completo"
                  className="w-full bg-[#161618] border border-transparent rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-emerald-500 transition-all text-xs"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-1.5">E-mail *</label>
                <input
                  value={form.email}
                  onChange={(e) => { setForm({ ...form, email: e.target.value }); setEmailFieldError(null); }}
                  type="email"
                  required
                  placeholder="email@empresa.com"
                  className={`w-full bg-[#161618] border rounded-xl px-4 py-2.5 text-white focus:outline-none transition-all text-xs ${emailFieldError ? "border-rose-500" : "border-transparent focus:border-emerald-500"}`}
                />
                {emailFieldError && <p className="text-rose-400 text-[10px] mt-1.5">{emailFieldError}</p>}
              </div>
              <div>
                <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-1.5">Cargo / Setor</label>
                <input
                  value={form.cargo}
                  onChange={(e) => setForm({ ...form, cargo: e.target.value })}
                  type="text"
                  placeholder="Opcional"
                  className="w-full bg-[#161618] border border-transparent rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-emerald-500 transition-all text-xs"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-1.5">Permissão</label>
                <select
                  value={form.role}
                  onChange={(e) => setForm({ ...form, role: e.target.value as any })}
                  className="w-full bg-[#161618] border border-transparent rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-emerald-500 transition-all text-xs"
                >
                  <option value="USER">USER (acesso padrão)</option>
                  <option value="ADMIN">ADMIN (acesso total)</option>
                </select>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  disabled={submitting}
                  className="flex-1 bg-white/5 hover:bg-white/10 text-zinc-300 font-bold py-2.5 px-4 rounded-xl text-xs uppercase tracking-wide transition-all"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 bg-emerald-500 hover:bg-emerald-400 text-[#070708] font-bold py-2.5 px-4 rounded-xl shadow-[0_0_20px_rgba(16,185,129,0.2)] transition-all active:scale-[0.98] text-xs uppercase tracking-wide disabled:opacity-50"
                >
                  {submitting ? "Criando..." : "Criar e enviar link"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {toast && (
        <div className={`fixed bottom-6 right-6 max-w-sm px-5 py-4 rounded-2xl shadow-2xl ring-1 backdrop-blur-md z-50 ${toast.type === "success" ? "bg-emerald-500/90 ring-emerald-400 text-[#070708]" : toast.type === "error" ? "bg-rose-600/90 ring-rose-500 text-white" : "bg-blue-500/90 ring-blue-400 text-white"}`}>
          <div className="text-sm font-bold">{toast.text}</div>
        </div>
      )}
    </div>
  );
}
