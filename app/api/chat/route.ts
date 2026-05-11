import { NextRequest, NextResponse } from "next/server";

function isJsonSummary(text: string): boolean {
  const trimmed = text.trim();
  if (trimmed.startsWith("{") && trimmed.endsWith("}")) {
    try { JSON.parse(trimmed); return true; } catch { return false; }
  }
  const match = trimmed.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/);
  if (match) {
    try { JSON.parse(match[1]); return true; } catch { return false; }
  }
  return false;
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

    // Detect JSON summary — save to DB but hide from chat UI
    if (isJsonSummary(response)) {
      return NextResponse.json({ response: null, conversaEncerrada: true });
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
