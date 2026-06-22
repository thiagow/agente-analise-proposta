"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { Upload, X, FileText, Loader2 } from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { cn } from "@/lib/utils";

export default function FormularioPage() {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);

  const [form, setForm] = useState({
    nome: "",
    whatsapp: "+55 ",
    email: "",
    cargo: "",
    empresa: "",
  });
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
    setError("");
  }

  function handleWhatsappChange(e: React.ChangeEvent<HTMLInputElement>) {
    const digits = e.target.value.replace(/\D/g, "").slice(2);

    let formatted = "+55 ";
    if (digits.length > 0) formatted += "(" + digits.slice(0, 2);
    if (digits.length >= 2) formatted += ") " + digits.slice(2, 7);
    if (digits.length >= 7) formatted += "-" + digits.slice(7, 11);

    if (digits.length <= 11) {
      setForm((prev) => ({ ...prev, whatsapp: formatted }));
    }
    setError("");
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file?.type === "application/pdf") {
      setPdfFile(file);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!form.nome.trim() || !form.whatsapp.trim() || !form.email.trim()) {
      setError("Nome, WhatsApp e e-mail são obrigatórios.");
      return;
    }

    const whatsappDigits = form.whatsapp.replace(/\D/g, "").slice(2);
    if (whatsappDigits.length !== 11) {
      setError("WhatsApp inválido. Informe DDD + 9 dígitos: (11) 99999-9999.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const fd = new FormData();
      fd.append("nome", form.nome.trim());
      fd.append("whatsapp", form.whatsapp.trim());
      fd.append("email", form.email.trim());
      if (form.cargo.trim()) fd.append("cargo", form.cargo.trim());
      if (form.empresa.trim()) fd.append("empresa", form.empresa.trim());
      if (pdfFile) fd.append("pdf", pdfFile);

      const res = await fetch("/api/leads", { method: "POST", body: fd });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Erro ao criar lead.");
        return;
      }

      if (typeof window !== "undefined" && (window as any).fbq) {
        (window as any).fbq("track", "EnviouFormulario", {
          content_name: "Formulario Qualificacao IA",
        });
      }

      router.push(`/chat/${data.leadId}`);
    } catch {
      setError("Erro de conexão. Tente novamente.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-hive-bg">
      {/* Header */}
      <header className="border-b border-hive-border px-6 py-5">
        <div className="max-w-6xl mx-auto flex justify-center">
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
      </header>

      <div className="max-w-xl mx-auto px-6 py-16">
        <div className="mb-10">
          <h1 className="text-3xl font-bold tracking-tight text-hive-text mb-2">
            Antes de conversar com a IA
          </h1>
          <p className="text-hive-muted">
            Precisamos de algumas informações para personalizar a experiência.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Required fields */}
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-hive-text mb-1.5">
                Nome Completo <span className="text-hive-pink">*</span>
              </label>
              <input
                name="nome"
                value={form.nome}
                onChange={handleChange}
                placeholder="João Silva"
                className="w-full px-4 py-3 rounded-xl bg-hive-surface border border-hive-border text-hive-text placeholder-hive-muted focus:outline-none focus:ring-2 focus:ring-hive-purple/50 focus:border-hive-purple transition"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-hive-text mb-1.5">
                WhatsApp <span className="text-hive-pink">*</span>
              </label>
              <input
                name="whatsapp"
                value={form.whatsapp}
                onChange={handleWhatsappChange}
                placeholder="+55 (11) 99999-9999"
                inputMode="numeric"
                className="w-full px-4 py-3 rounded-xl bg-hive-surface border border-hive-border text-hive-text placeholder-hive-muted focus:outline-none focus:ring-2 focus:ring-hive-purple/50 focus:border-hive-purple transition"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-hive-text mb-1.5">
                E-mail <span className="text-hive-pink">*</span>
              </label>
              <input
                name="email"
                type="email"
                value={form.email}
                onChange={handleChange}
                placeholder="joao@empresa.com"
                className="w-full px-4 py-3 rounded-xl bg-hive-surface border border-hive-border text-hive-text placeholder-hive-muted focus:outline-none focus:ring-2 focus:ring-hive-purple/50 focus:border-hive-purple transition"
              />
            </div>
          </div>

          {/* Divider */}
          <div className="flex items-center gap-3">
            <div className="flex-1 h-px bg-hive-border" />
            <span className="text-xs text-hive-muted">Opcional</span>
            <div className="flex-1 h-px bg-hive-border" />
          </div>

          {/* Optional fields */}
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-hive-text mb-1.5">
                Cargo / Posição
              </label>
              <input
                name="cargo"
                value={form.cargo}
                onChange={handleChange}
                placeholder="CEO, Product Manager..."
                className="w-full px-4 py-3 rounded-xl bg-hive-surface border border-hive-border text-hive-text placeholder-hive-muted focus:outline-none focus:ring-2 focus:ring-hive-purple/50 focus:border-hive-purple transition"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-hive-text mb-1.5">
                Nome da Empresa
              </label>
              <input
                name="empresa"
                value={form.empresa}
                onChange={handleChange}
                placeholder="Acme Corp"
                className="w-full px-4 py-3 rounded-xl bg-hive-surface border border-hive-border text-hive-text placeholder-hive-muted focus:outline-none focus:ring-2 focus:ring-hive-purple/50 focus:border-hive-purple transition"
              />
            </div>

            {/* PDF Upload */}
            <div>
              <label className="block text-sm font-medium text-hive-text mb-1.5">
                Documentação do Projeto (PDF)
              </label>

              {pdfFile ? (
                <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-hive-surface border border-hive-purple/40">
                  <FileText className="w-5 h-5 text-hive-purple flex-shrink-0" />
                  <span className="text-sm text-hive-text flex-1 truncate">
                    {pdfFile.name}
                  </span>
                  <button
                    type="button"
                    onClick={() => setPdfFile(null)}
                    className="text-hive-muted hover:text-hive-text transition"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <div
                  onDragOver={(e) => {
                    e.preventDefault();
                    setDragOver(true);
                  }}
                  onDragLeave={() => setDragOver(false)}
                  onDrop={handleDrop}
                  onClick={() => fileRef.current?.click()}
                  className={cn(
                    "flex flex-col items-center gap-2 px-4 py-8 rounded-xl border-2 border-dashed cursor-pointer transition",
                    dragOver
                      ? "border-hive-purple bg-hive-purple/5"
                      : "border-hive-border bg-hive-surface hover:border-hive-purple/50"
                  )}
                >
                  <Upload className="w-6 h-6 text-hive-muted" />
                  <p className="text-sm text-hive-muted text-center">
                    Arraste um PDF ou{" "}
                    <span className="text-hive-purple font-medium">
                      clique para selecionar
                    </span>
                  </p>
                  <p className="text-xs text-hive-muted">Máximo 10MB</p>
                </div>
              )}

              <input
                ref={fileRef}
                type="file"
                accept=".pdf,application/pdf"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) setPdfFile(file);
                }}
              />
            </div>
          </div>

          {error && (
            <p className="text-sm text-red-400 bg-red-500/10 border border-red-500/20 px-4 py-3 rounded-xl">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-4 rounded-xl gradient-brand text-white font-semibold text-base hover:brightness-110 transition-all duration-200 disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Iniciando...
              </>
            ) : (
              "Iniciar Conversa com IA"
            )}
          </button>
        </form>
      </div>
    </main>
  );
}
