import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { leads, mensagens, arquivos, prompts } from "@/lib/db/schema";
import { chatCompletionRich, type Message } from "@/lib/openrouter";
import { SYSTEM_PROMPTS, type ProjectType } from "@/lib/prompts";
import { TOOLS, TOOL_NAME } from "@/lib/tools";

interface ExtractionResult {
  cleanedContent: string;
  extractedJson: Record<string, unknown> | null;
}

// Camada B — defesa em profundidade contra o modelo escorregar e emitir JSON em texto.
// Hoje a coleta estruturada é via tool calling (Camada A), mas esse parser limpa qualquer
// resíduo caso o modelo viole a regra.
function sanitizeAssistantContent(text: string): ExtractionResult {
  const trimmed = text.trim();
  if (!trimmed) return { cleanedContent: "", extractedJson: null };

  const tryParse = (raw: string): Record<string, unknown> | null => {
    try {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
        return parsed as Record<string, unknown>;
      }
    } catch {
      /* noop */
    }
    return null;
  };

  // 1. Resposta inteira é JSON puro
  if (trimmed.startsWith("{") && trimmed.endsWith("}")) {
    const parsed = tryParse(trimmed);
    if (parsed) return { cleanedContent: "", extractedJson: parsed };
  }

  // 2. Apenas um bloco ```json ... ```
  const pureBlock = trimmed.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/);
  if (pureBlock) {
    const parsed = tryParse(pureBlock[1]);
    if (parsed) return { cleanedContent: "", extractedJson: parsed };
  }

  // 3. Texto + bloco ```json ... ``` ao final
  const mixed = trimmed.match(/^([\s\S]*?)```(?:json)?\s*(\{[\s\S]*?\})\s*```\s*$/);
  if (mixed) {
    const parsed = tryParse(mixed[2]);
    if (parsed) {
      return { cleanedContent: mixed[1].trim(), extractedJson: parsed };
    }
  }

  // 4. Heurística agressiva: localizar o último bloco { ... } no fim do texto
  //    e tentar parsear progressivamente (lida com JSON inline sem bloco markdown).
  const lastBraceStart = trimmed.lastIndexOf("{");
  if (lastBraceStart >= 0) {
    const tail = trimmed.slice(lastBraceStart);
    if (tail.trim().endsWith("}")) {
      const parsed = tryParse(tail);
      if (parsed && looksLikeQualification(parsed)) {
        const head = trimmed.slice(0, lastBraceStart).trim();
        return { cleanedContent: head, extractedJson: parsed };
      }
    }
  }

  return { cleanedContent: trimmed, extractedJson: null };
}

function looksLikeQualification(obj: Record<string, unknown>): boolean {
  // Campos que aparecem em qualquer um dos 4 schemas de qualificação
  return (
    "tipo" in obj ||
    "projeto" in obj ||
    "project_name" in obj ||
    "objetivo" in obj ||
    "features_mvp" in obj
  );
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { leadId, message, tipoProjeto } = body as {
      leadId: number;
      message: string;
      tipoProjeto?: ProjectType;
    };

    if (!leadId || !message?.trim()) {
      return NextResponse.json(
        { error: "leadId e message são obrigatórios" },
        { status: 400 }
      );
    }

    const [lead] = await db
      .select()
      .from(leads)
      .where(eq(leads.id, leadId))
      .limit(1);

    if (!lead) {
      return NextResponse.json({ error: "Lead não encontrado" }, { status: 404 });
    }

    if (tipoProjeto && !lead.tipoProjeto) {
      await db
        .update(leads)
        .set({ tipoProjeto })
        .where(eq(leads.id, leadId));
    }

    const projeto = (tipoProjeto || lead.tipoProjeto) as ProjectType | null;
    const tipoFinal = projeto ?? "webApp";

    const [dbPrompt] = await db
      .select()
      .from(prompts)
      .where(eq(prompts.tipo, tipoFinal))
      .limit(1);
    const systemPrompt = dbPrompt?.conteudo ?? SYSTEM_PROMPTS[tipoFinal];

    const [arquivo] = await db
      .select()
      .from(arquivos)
      .where(eq(arquivos.leadId, leadId))
      .limit(1);

    const historico = await db
      .select()
      .from(mensagens)
      .where(eq(mensagens.leadId, leadId))
      .orderBy(mensagens.criadoEm);

    const messages: Message[] = [{ role: "system", content: systemPrompt }];

    if (arquivo?.textoExtraido) {
      messages.push({
        role: "system",
        content: `Documentação do projeto fornecida pelo cliente:\n\n${arquivo.textoExtraido}`,
      });
    }

    for (const msg of historico) {
      messages.push({
        role: msg.role as "user" | "assistant",
        content: msg.conteudo,
      });
    }

    messages.push({ role: "user", content: message.trim() });

    const tools = TOOLS[tipoFinal];
    const completion = await chatCompletionRich(messages, { tools });

    const { cleanedContent, extractedJson } = sanitizeAssistantContent(
      completion.content
    );

    let conversaEncerrada = false;
    let qualificacao: Record<string, unknown> | null = null;

    if (completion.toolCall && completion.toolCall.name === TOOL_NAME) {
      qualificacao = completion.toolCall.args;
      conversaEncerrada = true;
    } else if (extractedJson) {
      console.warn(
        "[POST /api/chat] modelo emitiu JSON em texto apesar de ter tool disponível — usando fallback"
      );
      qualificacao = extractedJson;
      conversaEncerrada = true;
    }

    const finalContent =
      cleanedContent ||
      (conversaEncerrada
        ? "Perfeito! As informações foram registradas e serão encaminhadas para nossa equipe de analistas. Em aproximadamente 48 horas entraremos em contato para apresentar a proposta personalizada. Obrigado pela conversa!"
        : "");

    await db.insert(mensagens).values([
      { leadId, role: "user", conteudo: message.trim() },
      { leadId, role: "assistant", conteudo: finalContent },
    ]);

    if (conversaEncerrada) {
      await db
        .update(leads)
        .set({
          encerrada: true,
          ...(qualificacao ? { jsonQualificacao: qualificacao } : {}),
        })
        .where(eq(leads.id, leadId));

      return NextResponse.json({
        response: finalContent,
        conversaEncerrada: true,
      });
    }

    return NextResponse.json({ response: finalContent });
  } catch (err) {
    console.error("[POST /api/chat]", err);
    return NextResponse.json(
      { error: "Erro ao processar mensagem" },
      { status: 500 }
    );
  }
}
