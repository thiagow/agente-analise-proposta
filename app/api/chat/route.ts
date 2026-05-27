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

// Camada C — detecção textual canônica da despedida.
// Baseada no texto literal do prompt; específica o suficiente para evitar falso positivo.
const CLOSING_PATTERN =
  /informa[çc][õo]es foram registradas[\s\S]*equipe de analistas[\s\S]*48 horas/i;

function detectClosingMessage(content: string): boolean {
  if (!content) return false;
  return CLOSING_PATTERN.test(content);
}

// Gate: só ativa Camada C quando a conversa já avançou (evita falso positivo cedo).
function isLateInConversation(historicoLength: number): boolean {
  return historicoLength >= 10;
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

    if (lead.analiseDocumento) {
      messages.push({
        role: "system",
        content: `## ANÁLISE PRÉVIA DO DOCUMENTO

O lead anexou um briefing que JÁ FOI analisado e estruturado:

${JSON.stringify(lead.analiseDocumento, null, 2)}

## COMO USAR ESTA ANÁLISE

**IMPORTANTE — a abertura confirmatória JÁ FOI ENVIADA antes desta conversa começar.** Você verá ela como a primeira mensagem do assistente no histórico. A primeira mensagem do usuário é uma resposta a essa confirmação.

REGRAS:
1. **NÃO envie a ABERTURA padrão do prompt.** Ela seria redundante — a confirmação já foi feita.
2. Se o lead confirmou que o resumo está correto ("sim", "está certo", "perfeito"), considere todos os campos em "campos_identificados" como VALIDADOS e prossiga direto para os "gaps".
3. Se o lead corrigiu algo, ajuste mentalmente o entendimento e continue para os "gaps".
4. **Pule TODAS as fases cujos campos já estão em "campos_identificados".** Não pergunte de novo o que já está claro.
5. Foque exclusivamente nos itens listados em "gaps" — esses são os que faltam.
6. Mantenha tom natural — não enumere os gaps, faça as perguntas de forma fluida.
7. No ENCERRAMENTO (tool call submit_qualified_lead), combine "campos_identificados" + respostas coletadas no chat para preencher TODOS os campos do schema.`,
      });
    } else if (arquivo?.textoExtraido) {
      // Fallback: PDF existe mas análise estruturada falhou
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
      // Camada A — tool call oficial
      qualificacao = completion.toolCall.args;
      conversaEncerrada = true;
    } else if (extractedJson) {
      // Camada B — JSON em texto (fallback de leakage)
      console.warn("[chat] modelo emitiu JSON em texto — usando fallback B");
      qualificacao = extractedJson;
      conversaEncerrada = true;
    } else if (
      detectClosingMessage(completion.content) &&
      isLateInConversation(historico.length)
    ) {
      // Camada C — despedida sem tool call; força encerramento
      console.warn("[chat] despedida sem tool — ativando Camada C");
      conversaEncerrada = true;

      // Camada D — segundo chamado forçando tool para recuperar dados estruturados
      if (tools && tools.length > 0) {
        try {
          const forced = await chatCompletionRich(
            [...messages, { role: "assistant", content: completion.content }],
            { tools, forceTool: TOOL_NAME, maxTokens: 800 }
          );
          if (forced.toolCall?.name === TOOL_NAME) {
            qualificacao = forced.toolCall.args;
            console.log("[chat] Camada D recuperou tool call com sucesso");
          }
        } catch (err) {
          console.warn(
            `[chat] Camada D falhou: ${(err as Error).message.slice(0, 200)} — encerrando sem JSON`
          );
        }
      }
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
