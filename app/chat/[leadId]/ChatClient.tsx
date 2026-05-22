"use client";

import { useState, useRef, useEffect } from "react";
import { Star, Send, Loader2 } from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { cn } from "@/lib/utils";
import type { Lead } from "@/lib/db/schema";
import type { ProjectType } from "@/lib/prompts";

interface Message {
  role: "user" | "assistant";
  content: string;
}

interface Props {
  lead: Lead;
  historicoInicial: Message[];
}

const PROJECT_TYPES: { key: ProjectType; label: string; emoji: string }[] = [
  { key: "webApp", label: "Web App", emoji: "💻" },
  { key: "mobileApp", label: "Mobile App", emoji: "📱" },
  { key: "automacao", label: "Automação com IA", emoji: "🤖" },
  { key: "agente", label: "Agente de IA", emoji: "💬" },
];

const WELCOME = `Olá! Sou a IA da Tech Hive. Estou aqui para entender melhor o seu projeto e ajudar a criar uma proposta sob medida para você.

Para começar, qual é o tipo de projeto que você tem em mente?`;

function isJsonMessage(content: string): boolean {
  const trimmed = content.trim();
  if (trimmed.startsWith("{") && trimmed.endsWith("}")) {
    try { JSON.parse(trimmed); return true; } catch { return false; }
  }
  const match = trimmed.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/);
  if (match) {
    try { JSON.parse(match[1]); return true; } catch { return false; }
  }
  return false;
}

export default function ChatClient({ lead, historicoInicial }: Props) {
  const historicoFiltrado = historicoInicial.filter((m) => !isJsonMessage(m.content));
  const encerradaNoHistorico = historicoInicial.length > historicoFiltrado.length;

  const [messages, setMessages] = useState<Message[]>(
    historicoFiltrado.length > 0
      ? historicoFiltrado
      : [{ role: "assistant", content: WELCOME }]
  );
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [tipoProjeto, setTipoProjeto] = useState<ProjectType | null>(
    lead.tipoProjeto as ProjectType | null
  );
  const [projectSelected, setProjectSelected] = useState(
    historicoInicial.length > 0 || !!lead.tipoProjeto
  );
  const [conversaEncerrada, setConversaEncerrada] = useState(encerradaNoHistorico);

  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function sendMessage(content: string, tipo?: ProjectType) {
    if (!content.trim() || loading) return;

    const userMsg: Message = { role: "user", content: content.trim() };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setLoading(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          leadId: lead.id,
          message: content.trim(),
          tipoProjeto: tipo,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setMessages((prev) => [
          ...prev,
          { role: "assistant", content: "Desculpe, ocorreu um erro. Tente novamente." },
        ]);
        return;
      }

      if (data.conversaEncerrada) {
        if (data.response) {
          setMessages((prev) => [
            ...prev,
            { role: "assistant", content: data.response },
          ]);
        }
        setConversaEncerrada(true);
        return;
      }

      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: data.response },
      ]);
    } catch {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: "Erro de conexão. Verifique sua internet." },
      ]);
    } finally {
      setLoading(false);
      inputRef.current?.focus();
    }
  }

  async function handleProjectSelect(tipo: ProjectType, label: string) {
    setTipoProjeto(tipo);
    setProjectSelected(true);
    await sendMessage(`Meu projeto é um ${label}.`, tipo);
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  }

  return (
    <div className="flex flex-col h-screen bg-hive-bg">
      {/* Header */}
      <header className="flex-shrink-0 border-b border-hive-border px-6 py-5">
        <div className="max-w-3xl mx-auto grid grid-cols-3 items-center">
          <div />
          <div className="flex justify-center">
            <Link href="/">
              <Image
                src="/logo.png"
                alt="Tech Hive"
                width={240}
                height={60}
                priority
                className="h-14 w-auto"
              />
            </Link>
          </div>
          <div className="text-right">
            <p className="text-sm font-medium text-hive-text">{lead.nome}</p>
            {lead.empresa && (
              <p className="text-xs text-hive-muted">{lead.empresa}</p>
            )}
          </div>
        </div>
      </header>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto scrollbar-hide px-6 py-6">
        <div className="max-w-3xl mx-auto space-y-4">
          {messages.map((msg, i) => (
            <div
              key={i}
              className={cn(
                "flex animate-slide-up",
                msg.role === "user" ? "justify-end" : "justify-start"
              )}
            >
              {msg.role === "assistant" && (
                <div className="w-7 h-7 rounded-lg gradient-brand flex items-center justify-center flex-shrink-0 mr-3 mt-0.5">
                  <Star className="w-3.5 h-3.5 text-white fill-white" />
                </div>
              )}
              <div
                className={cn(
                  "max-w-[75%] px-4 py-3 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap",
                  msg.role === "user"
                    ? "gradient-brand text-white rounded-tr-sm"
                    : "bg-hive-surface border border-hive-border text-hive-text rounded-tl-sm"
                )}
              >
                {msg.content}
              </div>
            </div>
          ))}

          {/* Quick select buttons (show only before project is selected) */}
          {!projectSelected && messages.length === 1 && (
            <div className="flex flex-wrap gap-2 pl-10 animate-slide-up">
              {PROJECT_TYPES.map((pt) => (
                <button
                  key={pt.key}
                  onClick={() => handleProjectSelect(pt.key, pt.label)}
                  disabled={loading}
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-hive-border bg-hive-surface text-hive-text text-sm hover:border-hive-purple/60 hover:bg-hive-purple/5 transition disabled:opacity-50"
                >
                  <span>{pt.emoji}</span>
                  {pt.label}
                </button>
              ))}
            </div>
          )}

          {loading && (
            <div className="flex items-center gap-3 pl-10 animate-fade-in">
              <div className="w-7 h-7 rounded-lg gradient-brand flex items-center justify-center flex-shrink-0">
                <Star className="w-3.5 h-3.5 text-white fill-white" />
              </div>
              <div className="flex gap-1.5 px-4 py-3 bg-hive-surface border border-hive-border rounded-2xl rounded-tl-sm">
                {[0, 1, 2].map((i) => (
                  <div
                    key={i}
                    className="w-2 h-2 rounded-full bg-hive-muted animate-bounce"
                    style={{ animationDelay: `${i * 0.15}s` }}
                  />
                ))}
              </div>
            </div>
          )}

          <div ref={bottomRef} />
        </div>
      </div>

      {/* Input */}
      <div className="flex-shrink-0 border-t border-hive-border px-6 py-4">
        <div className="max-w-3xl mx-auto">
          {conversaEncerrada ? (
            <div className="text-center py-3">
              <p className="text-sm text-hive-muted">
                Conversa encerrada. Nossa equipe entrará em contato em breve com a proposta.
              </p>
            </div>
          ) : (
            <>
              <div className="flex items-end gap-3 bg-hive-surface border border-hive-border rounded-2xl px-4 py-3 focus-within:border-hive-purple/60 transition">
                <textarea
                  ref={inputRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder={
                    projectSelected
                      ? "Digite sua mensagem... (Enter para enviar)"
                      : "Selecione o tipo de projeto acima ou escreva sua mensagem"
                  }
                  rows={1}
                  className="flex-1 bg-transparent text-hive-text placeholder-hive-muted text-sm resize-none focus:outline-none max-h-32 overflow-y-auto scrollbar-hide"
                  style={{ lineHeight: "1.5" }}
                />
                <button
                  onClick={() => sendMessage(input)}
                  disabled={!input.trim() || loading}
                  className="w-8 h-8 rounded-lg gradient-brand flex items-center justify-center flex-shrink-0 hover:brightness-110 transition disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {loading ? (
                    <Loader2 className="w-4 h-4 text-white animate-spin" />
                  ) : (
                    <Send className="w-4 h-4 text-white" />
                  )}
                </button>
              </div>
              <p className="text-xs text-hive-muted text-center mt-2">
                IA pode cometer erros. Revise informações importantes.
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
