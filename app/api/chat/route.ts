import { NextRequest, NextResponse } from "next/server";

interface ExtractionResult {
  found: boolean;
  closingText: string | null;
}

function extractClosingMessage(text: string): ExtractionResult {
  const trimmed = text.trim();

  // Caso 1: resposta é puro JSON
  if (trimmed.startsWith("{") && trimmed.endsWith("}")) {
    try { JSON.parse(trimmed); return { found: true, closingText: null }; }
    catch { /* continua */ }
  }

  // Caso 2: resposta é somente um bloco ```json ... ```
  const pureBlock = trimmed.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/);
  if (pureBlock) {
    try { JSON.parse(pureBlock[1]); return { found: true, closingText: null }; }
    catch { /* continua */ }
  }

  // Caso 3: texto + bloco ```json ... ``` ao final
  const mixed = trimmed.match(/^([\s\S]*?)```(?:json)?\s*(\{[\s\S]*?\})\s*```\s*$/);
  if (mixed) {
    try {
      JSON.parse(mixed[2]);
      return { found: true, closingText: mixed[1].trim() || null };
    }
    catch { /* continua */ }
  }

  return { found: false, closingText: null };
}
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { leads, mensagens, arquivos, prompts } from "@/lib/db/schema";
import { chatCompletion, type Message } from "@/lib/openrouter";
import { SYSTEM_PROMPTS, type ProjectType } from "@/lib/prompts";

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

    // Update tipoProjeto if provided for the first time
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

    // Fetch PDF context if available
    const [arquivo] = await db
      .select()
      .from(arquivos)
      .where(eq(arquivos.leadId, leadId))
      .limit(1);

    // Fetch conversation history
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

    const response = await chatCompletion(messages);

    // Persist both turns
    await db.insert(mensagens).values([
      { leadId, role: "user", conteudo: message.trim() },
      { leadId, role: "assistant", conteudo: response },
    ]);

    // Detect JSON summary — strip JSON from response and hide it from the chat UI
    const detection = extractClosingMessage(response);
    if (detection.found) {
      await db.update(leads).set({ encerrada: true }).where(eq(leads.id, leadId));
      return NextResponse.json({
        response: detection.closingText,
        conversaEncerrada: true,
      });
    }

    return NextResponse.json({ response });
  } catch (err) {
    console.error("[POST /api/chat]", err);
    return NextResponse.json(
      { error: "Erro ao processar mensagem" },
      { status: 500 }
    );
  }
}
