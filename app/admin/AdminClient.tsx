"use client";

import { useState, useEffect } from "react";
import {
  FileText,
  Eye,
  Sparkles,
  Copy,
  Check,
  X,
  Loader2,
  Users,
  MessageSquareDiff,
  Save,
  LogOut,
  Trash2,
} from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";

interface LeadRow {
  id: number;
  nome: string;
  cargo: string | null;
  empresa: string | null;
  whatsapp: string;
  email: string;
  tipoProjeto: string | null;
  criadoEm: string;
  totalMensagens: number;
  temArquivo: boolean;
}

interface Message {
  role: string;
  conteudo: string;
  criadoEm: string;
}

interface PromptRow {
  tipo: string;
  conteudo: string;
  customizado: boolean;
  atualizadoEm: string | null;
}

const TIPO_LABELS: Record<string, string> = {
  webApp: "💻 Web App",
  mobileApp: "📱 Mobile App",
  automacao: "🤖 Automação com IA",
  agente: "💬 Agente de IA",
  gerarProposta: "📄 Gerar Proposta",
};

// ─── Admin Root ────────────────────────────────────────────────────────────────

export function AdminClient({ leads }: { leads: LeadRow[] }) {
  const router = useRouter();
  const [tab, setTab] = useState<"leads" | "prompts">("leads");
  const [loggingOut, setLoggingOut] = useState(false);

  async function handleLogout() {
    setLoggingOut(true);
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      router.push("/admin/login");
    } catch {
      alert("Erro ao fazer logout");
      setLoggingOut(false);
    }
  }

  return (
    <div className="min-h-screen bg-hive-bg">
      {/* Header */}
      <header className="border-b border-hive-border px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3">
            <Image
              src="/logo.png"
              alt="Tech Hive"
              width={40}
              height={40}
              priority
              className="h-10 w-auto"
            />
          </Link>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 text-hive-muted text-sm">
              <Users className="w-4 h-4" />
              {leads.length} lead{leads.length !== 1 ? "s" : ""}
            </div>
            <button
              onClick={handleLogout}
              disabled={loggingOut}
              className="inline-flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-hive-muted hover:text-hive-text hover:bg-hive-surface-2 transition disabled:opacity-50"
            >
              <LogOut className="w-4 h-4" />
              Sair
            </button>
          </div>
        </div>
      </header>

      {/* Tabs */}
      <div className="border-b border-hive-border px-6">
        <div className="max-w-7xl mx-auto flex gap-1">
          {(["leads", "prompts"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={cn(
                "flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 -mb-px transition",
                tab === t
                  ? "border-hive-purple text-hive-text"
                  : "border-transparent text-hive-muted hover:text-hive-text"
              )}
            >
              {t === "leads" ? <Users className="w-4 h-4" /> : <MessageSquareDiff className="w-4 h-4" />}
              {t === "leads" ? "Leads" : "Prompts"}
            </button>
          ))}
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8">
        {tab === "leads" ? <LeadsTab leads={leads} /> : <PromptsTab />}
      </div>
    </div>
  );
}

// ─── Leads Tab ─────────────────────────────────────────────────────────────────

function LeadsTab({ leads: initialLeads }: { leads: LeadRow[] }) {
  const [localLeads, setLocalLeads] = useState<LeadRow[]>(initialLeads);
  const [conversaModal, setConversaModal] = useState<{
    lead: LeadRow;
    messages: Message[];
  } | null>(null);
  const [propostaModal, setPropostaModal] = useState<{
    lead: LeadRow;
    proposta: string;
  } | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<LeadRow | null>(null);
  const [loadingConversa, setLoadingConversa] = useState<number | null>(null);
  const [loadingProposta, setLoadingProposta] = useState<number | null>(null);
  const [loadingDelete, setLoadingDelete] = useState(false);
  const [copied, setCopied] = useState(false);

  async function verConversa(lead: LeadRow) {
    setLoadingConversa(lead.id);
    try {
      const res = await fetch(`/api/admin/leads/${lead.id}/mensagens`);
      const data = await res.json();
      setConversaModal({ lead, messages: data });
    } catch {
      alert("Erro ao carregar conversa.");
    } finally {
      setLoadingConversa(null);
    }
  }

  async function gerarProposta(lead: LeadRow) {
    setLoadingProposta(lead.id);
    try {
      const res = await fetch("/api/proposta", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ leadId: lead.id }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setPropostaModal({ lead, proposta: data.promptGerado });
    } catch (e) {
      alert(`Erro ao gerar proposta: ${e instanceof Error ? e.message : "Tente novamente."}`);
    } finally {
      setLoadingProposta(null);
    }
  }

  async function copiarProposta() {
    if (!propostaModal) return;
    await navigator.clipboard.writeText(propostaModal.proposta);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  async function excluirLead(lead: LeadRow) {
    setLoadingDelete(true);
    try {
      const res = await fetch(`/api/admin/leads/${lead.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
      setLocalLeads((prev) => prev.filter((l) => l.id !== lead.id));
      setConfirmDelete(null);
    } catch {
      alert("Erro ao excluir lead. Tente novamente.");
    } finally {
      setLoadingDelete(false);
    }
  }

  return (
    <>
      <div className="mb-8">
        <h1 className="text-2xl font-bold tracking-tight text-hive-text mb-1">Painel de Leads</h1>
        <p className="text-hive-muted text-sm">Gerencie leads e gere propostas comerciais</p>
      </div>

      {localLeads.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <Users className="w-12 h-12 text-hive-muted mb-4" />
          <p className="text-hive-muted">Nenhum lead cadastrado ainda.</p>
        </div>
      ) : (
        <div className="bg-hive-surface border border-hive-border rounded-2xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-hive-border">
                  {["Nome", "Empresa", "WhatsApp", "E-mail", "Projeto", "Msgs", "PDF", "Data", "Ações"].map(
                    (col) => (
                      <th
                        key={col}
                        className="px-4 py-3 text-left text-xs font-semibold text-hive-muted uppercase tracking-wider"
                      >
                        {col}
                      </th>
                    )
                  )}
                </tr>
              </thead>
              <tbody>
                {localLeads.map((lead, i) => (
                  <tr
                    key={lead.id}
                    className={cn(
                      "border-b border-hive-border last:border-0 hover:bg-hive-bg/50 transition",
                      i % 2 === 0 ? "" : "bg-hive-bg/20"
                    )}
                  >
                    <td className="px-4 py-3 font-medium text-hive-text whitespace-nowrap">{lead.nome}</td>
                    <td className="px-4 py-3 text-hive-muted whitespace-nowrap">{lead.empresa || "—"}</td>
                    <td className="px-4 py-3 text-hive-muted whitespace-nowrap">{lead.whatsapp}</td>
                    <td className="px-4 py-3 text-hive-muted whitespace-nowrap">{lead.email}</td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      {lead.tipoProjeto ? (
                        <span className="inline-flex items-center px-2 py-1 rounded-md bg-hive-purple/10 text-hive-purple text-xs font-medium border border-hive-purple/20">
                          {TIPO_LABELS[lead.tipoProjeto]?.replace(/^\S+\s/, "") || lead.tipoProjeto}
                        </span>
                      ) : (
                        <span className="text-hive-muted">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-hive-muted text-center">{lead.totalMensagens}</td>
                    <td className="px-4 py-3 text-center">
                      {lead.temArquivo ? (
                        <FileText className="w-4 h-4 text-hive-purple mx-auto" />
                      ) : (
                        <span className="text-hive-muted">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-hive-muted whitespace-nowrap text-xs">
                      {new Date(lead.criadoEm).toLocaleDateString("pt-BR")}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => verConversa(lead)}
                          disabled={loadingConversa === lead.id}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-hive-surface-2 border border-hive-border text-hive-text text-xs hover:border-hive-purple/50 transition disabled:opacity-50"
                        >
                          {loadingConversa === lead.id ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <Eye className="w-3.5 h-3.5" />
                          )}
                          Conversa
                        </button>
                        <button
                          onClick={() => gerarProposta(lead)}
                          disabled={loadingProposta === lead.id}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg gradient-brand text-white text-xs hover:brightness-110 transition disabled:opacity-50"
                        >
                          {loadingProposta === lead.id ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <Sparkles className="w-3.5 h-3.5" />
                          )}
                          Proposta
                        </button>
                        <button
                          onClick={() => setConfirmDelete(lead)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-xs hover:bg-red-500/20 transition"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          Excluir
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal de Confirmação de Exclusão */}
      {confirmDelete && (
        <Modal onClose={() => !loadingDelete && setConfirmDelete(null)}>
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-red-500/10 border border-red-500/20">
                <Trash2 className="w-5 h-5 text-red-400" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-hive-text">Excluir lead</h2>
                <p className="text-sm text-hive-muted">Esta ação não pode ser desfeita.</p>
              </div>
            </div>
            <button
              onClick={() => setConfirmDelete(null)}
              disabled={loadingDelete}
              className="p-2 rounded-lg hover:bg-hive-surface-2 text-hive-muted transition disabled:opacity-50"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          <p className="text-sm text-hive-text mb-6">
            Tem certeza que deseja excluir o lead{" "}
            <span className="font-semibold">{confirmDelete.nome}</span>? Toda a conversa, arquivos e propostas vinculados serão removidos permanentemente.
          </p>
          <div className="flex gap-3">
            <button
              onClick={() => setConfirmDelete(null)}
              disabled={loadingDelete}
              className="flex-1 py-2.5 rounded-xl bg-hive-surface-2 border border-hive-border text-hive-text text-sm font-medium hover:border-hive-purple/50 transition disabled:opacity-50"
            >
              Cancelar
            </button>
            <button
              onClick={() => excluirLead(confirmDelete)}
              disabled={loadingDelete}
              className="flex-1 py-2.5 rounded-xl bg-red-500 text-white text-sm font-medium hover:bg-red-600 transition disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loadingDelete ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Trash2 className="w-4 h-4" />
              )}
              Excluir lead
            </button>
          </div>
        </Modal>
      )}

      {/* Conversa Modal */}
      {conversaModal && (
        <Modal onClose={() => setConversaModal(null)}>
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-lg font-semibold text-hive-text">Conversa — {conversaModal.lead.nome}</h2>
              <p className="text-sm text-hive-muted">{conversaModal.messages.length} mensagens</p>
            </div>
            <button
              onClick={() => setConversaModal(null)}
              className="p-2 rounded-lg hover:bg-hive-surface-2 text-hive-muted transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          <div className="space-y-3 max-h-96 overflow-y-auto scrollbar-hide pr-1">
            {conversaModal.messages.length === 0 ? (
              <p className="text-hive-muted text-sm text-center py-8">Nenhuma mensagem ainda.</p>
            ) : (
              conversaModal.messages.map((msg, i) => (
                <div key={i} className={cn("flex", msg.role === "user" ? "justify-end" : "justify-start")}>
                  <div
                    className={cn(
                      "max-w-[80%] px-3 py-2 rounded-xl text-sm whitespace-pre-wrap",
                      msg.role === "user"
                        ? "gradient-brand text-white"
                        : "bg-hive-surface-2 border border-hive-border text-hive-text"
                    )}
                  >
                    {msg.conteudo}
                  </div>
                </div>
              ))
            )}
          </div>
        </Modal>
      )}

      {/* Proposta Modal */}
      {propostaModal && (
        <Modal onClose={() => setPropostaModal(null)}>
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-lg font-semibold text-hive-text">Proposta — {propostaModal.lead.nome}</h2>
              <p className="text-sm text-hive-muted">Gerada pela IA</p>
            </div>
            <button
              onClick={() => setPropostaModal(null)}
              className="p-2 rounded-lg hover:bg-hive-surface-2 text-hive-muted transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          <div className="bg-hive-surface-2 border border-hive-border rounded-xl p-4 max-h-96 overflow-y-auto scrollbar-hide mb-4">
            <pre className="text-sm text-hive-text whitespace-pre-wrap font-sans leading-relaxed">
              {propostaModal.proposta}
            </pre>
          </div>
          <button
            onClick={copiarProposta}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-xl gradient-brand text-white font-semibold hover:brightness-110 transition"
          >
            {copied ? (
              <><Check className="w-4 h-4" />Copiado!</>
            ) : (
              <><Copy className="w-4 h-4" />Copiar Proposta</>
            )}
          </button>
        </Modal>
      )}
    </>
  );
}

// ─── Prompts Tab ───────────────────────────────────────────────────────────────

function PromptsTab() {
  const [promptsList, setPromptsList] = useState<PromptRow[]>([]);
  const [editado, setEditado] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState<string | null>(null);
  const [saved, setSaved] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/admin/prompts")
      .then((r) => r.json())
      .then((data: PromptRow[]) => {
        setPromptsList(data);
        const inicial: Record<string, string> = {};
        for (const p of data) inicial[p.tipo] = p.conteudo;
        setEditado(inicial);
      })
      .finally(() => setLoading(false));
  }, []);

  async function salvar(tipo: string) {
    setSaving(tipo);
    try {
      const res = await fetch("/api/admin/prompts", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tipo, conteudo: editado[tipo] }),
      });
      if (!res.ok) throw new Error();
      setSaved(tipo);
      // Update customizado flag locally
      setPromptsList((prev) =>
        prev.map((p) => (p.tipo === tipo ? { ...p, customizado: true } : p))
      );
      setTimeout(() => setSaved(null), 2000);
    } catch {
      alert("Erro ao salvar prompt.");
    } finally {
      setSaving(null);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="w-6 h-6 text-hive-muted animate-spin" />
      </div>
    );
  }

  return (
    <>
      <div className="mb-8">
        <h1 className="text-2xl font-bold tracking-tight text-hive-text mb-1">Prompts dos Agentes</h1>
        <p className="text-hive-muted text-sm">
          Edite os prompts de sistema usados pela IA. Alterações entram em vigor imediatamente, sem redeploy.
        </p>
      </div>

      <div className="space-y-6">
        {promptsList.map((prompt) => {
          const isDirty = editado[prompt.tipo] !== prompt.conteudo;
          const isSaving = saving === prompt.tipo;
          const isSaved = saved === prompt.tipo;

          return (
            <div
              key={prompt.tipo}
              className="bg-hive-surface border border-hive-border rounded-2xl p-6"
            >
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <h2 className="font-semibold text-hive-text">
                    {TIPO_LABELS[prompt.tipo] || prompt.tipo}
                  </h2>
                  {prompt.customizado ? (
                    <span className="text-xs px-2 py-0.5 rounded-full bg-hive-purple/10 text-hive-purple border border-hive-purple/20">
                      customizado
                    </span>
                  ) : (
                    <span className="text-xs px-2 py-0.5 rounded-full bg-hive-surface-2 text-hive-muted border border-hive-border">
                      padrão
                    </span>
                  )}
                </div>
                <button
                  onClick={() => salvar(prompt.tipo)}
                  disabled={isSaving || (!isDirty && !isSaved)}
                  className={cn(
                    "inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition",
                    isSaved
                      ? "bg-green-500/10 text-green-400 border border-green-500/20"
                      : isDirty
                      ? "gradient-brand text-white hover:brightness-110"
                      : "bg-hive-surface-2 text-hive-muted border border-hive-border cursor-not-allowed"
                  )}
                >
                  {isSaving ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : isSaved ? (
                    <Check className="w-4 h-4" />
                  ) : (
                    <Save className="w-4 h-4" />
                  )}
                  {isSaved ? "Salvo!" : "Salvar"}
                </button>
              </div>

              <textarea
                value={editado[prompt.tipo] ?? ""}
                onChange={(e) =>
                  setEditado((prev) => ({ ...prev, [prompt.tipo]: e.target.value }))
                }
                rows={10}
                className="w-full px-4 py-3 rounded-xl bg-hive-surface-2 border border-hive-border text-hive-text text-sm font-mono leading-relaxed placeholder-hive-muted focus:outline-none focus:ring-2 focus:ring-hive-purple/50 focus:border-hive-purple transition resize-y"
                placeholder={`Prompt para ${TIPO_LABELS[prompt.tipo] || prompt.tipo}...`}
              />

              {prompt.atualizadoEm && (
                <p className="text-xs text-hive-muted mt-2">
                  Última atualização:{" "}
                  {new Date(prompt.atualizadoEm).toLocaleString("pt-BR")}
                </p>
              )}
            </div>
          );
        })}
      </div>
    </>
  );
}

// ─── Modal ─────────────────────────────────────────────────────────────────────

function Modal({ children, onClose }: { children: React.ReactNode; onClose: () => void }) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="w-full max-w-2xl bg-hive-surface border border-hive-border rounded-2xl p-6 animate-slide-up">
        {children}
      </div>
    </div>
  );
}
