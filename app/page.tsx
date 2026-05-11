import Link from "next/link";
import Image from "next/image";
import { Star, CheckCircle, MessageSquare, Zap, Code2, ArrowRight } from "lucide-react";

export default function Home() {
  return (
    <main className="min-h-screen bg-hive-bg flex flex-col">
      {/* Header */}
      <header className="border-b border-hive-border px-6 py-4">
        <div className="max-w-6xl mx-auto flex items-center gap-3">
          <Image
            src="/logo.png"
            alt="Tech Hive"
            width={40}
            height={40}
            priority
            className="h-10 w-auto"
          />
        </div>
      </header>

      {/* Hero */}
      <section className="flex-1 flex flex-col items-center justify-center px-6 py-24 text-center">
        <div className="max-w-3xl mx-auto animate-fade-in">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-hive-border bg-hive-surface text-hive-muted text-sm mb-8">
            <div className="w-1.5 h-1.5 rounded-full bg-hive-pink animate-pulse" />
            IA disponível agora
          </div>

          <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold tracking-tight text-balance mb-6 leading-[1.1]">
            Transformamos sua ideia em um{" "}
            <span className="gradient-brand-text">software sob medida.</span>
          </h1>

          <p className="text-lg text-hive-muted max-w-xl mx-auto mb-12 text-balance">
            Nossa IA conversará com você para entender seu projeto, levantar
            requisitos e preparar uma proposta personalizada.
          </p>

          <Link
            href="/formulario"
            className="inline-flex items-center gap-2 px-8 py-4 rounded-xl gradient-brand text-white font-semibold text-lg hover:brightness-110 transition-all duration-200 shadow-lg shadow-hive-purple/20 group"
          >
            Começar Conversa com IA
            <ArrowRight className="w-5 h-5 group-hover:translate-x-0.5 transition-transform" />
          </Link>
        </div>
      </section>

      {/* How it works */}
      <section className="px-6 pb-24">
        <div className="max-w-2xl mx-auto">
          <div className="bg-hive-surface border border-hive-border rounded-2xl p-8 animate-slide-up">
            <h2 className="text-sm font-semibold text-hive-muted uppercase tracking-widest mb-6">
              Como funciona
            </h2>

            <div className="space-y-5">
              {steps.map((step) => (
                <div key={step.label} className="flex items-start gap-4">
                  <div className="w-8 h-8 rounded-lg bg-hive-surface-2 border border-hive-border flex items-center justify-center flex-shrink-0 mt-0.5">
                    <step.icon className="w-4 h-4 text-hive-purple" />
                  </div>
                  <div>
                    <p className="font-medium text-hive-text">{step.label}</p>
                    <p className="text-sm text-hive-muted mt-0.5">{step.desc}</p>
                  </div>
                  <CheckCircle className="w-5 h-5 text-hive-purple flex-shrink-0 ml-auto mt-0.5" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-hive-border px-6 py-6 text-center">
        <p className="text-sm text-hive-muted">
          © {new Date().getFullYear()} Tech Hive. Todos os direitos reservados.
        </p>
      </footer>
    </main>
  );
}

const steps = [
  {
    icon: MessageSquare,
    label: "Preencha seus dados",
    desc: "Nome, contato e informações da sua empresa em menos de 2 minutos.",
  },
  {
    icon: Zap,
    label: "Converse com a IA",
    desc: "Nossa IA faz as perguntas certas para entender profundamente seu projeto.",
  },
  {
    icon: Code2,
    label: "Receba uma proposta",
    desc: "Com base na conversa, geramos um briefing detalhado do seu projeto.",
  },
  {
    icon: Star,
    label: "Entregamos o software",
    desc: "Nossa equipe transforma o briefing em código de alta qualidade.",
  },
];
