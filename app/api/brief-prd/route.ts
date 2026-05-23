import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { leads, mensagens, arquivos, propostas, prompts } from "@/lib/db/schema";
import { chatCompletion, type Message } from "@/lib/openrouter";
import { SYSTEM_PROMPTS } from "@/lib/prompts";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { leadId } = body as { leadId: number };

    if (!leadId) {
      return NextResponse.json({ error: "leadId é obrigatório" }, { status: 400 });
    }

    const [lead] = await db
      .select()
      .from(leads)
      .where(eq(leads.id, leadId))
      .limit(1);

    if (!lead) {
      return NextResponse.json({ error: "Lead não encontrado" }, { status: 404 });
    }

    const historico = await db
      .select()
      .from(mensagens)
      .where(eq(mensagens.leadId, leadId))
      .orderBy(mensagens.criadoEm);

    const [arquivo] = await db
      .select()
      .from(arquivos)
      .where(eq(arquivos.leadId, leadId))
      .limit(1);

    const leadInfo = `
Lead: ${lead.nome}
Email: ${lead.email}
WhatsApp: ${lead.whatsapp}
${lead.cargo ? `Cargo: ${lead.cargo}` : ""}
${lead.empresa ? `Empresa: ${lead.empresa}` : ""}
Tipo de Projeto: ${lead.tipoProjeto || "Não informado"}
`.trim();

    const conversaFormatada = historico
      .map((m) => `${m.role === "user" ? "Cliente" : "Tech Hive"}: ${m.conteudo}`)
      .join("\n\n");

    const [dbPrompt] = await db
      .select()
      .from(prompts)
      .where(eq(prompts.tipo, "gerarBriefPRD"))
      .limit(1);
    const systemPrompt = dbPrompt?.conteudo ?? SYSTEM_PROMPTS.gerarBriefPRD;

    const messages: Message[] = [
      { role: "system", content: systemPrompt },
      {
        role: "user",
        content: `Informações do Lead:\n${leadInfo}\n\n${
          arquivo?.textoExtraido
            ? `Documentação fornecida:\n${arquivo.textoExtraido}\n\n`
            : ""
        }Histórico de conversa:\n${conversaFormatada}\n\nGere o Brief PRD completo em Markdown.`,
      },
    ];

    const briefGerado = await chatCompletion(messages, 4000);

    await db.insert(propostas).values({ leadId, promptGerado: briefGerado });

    return NextResponse.json({ promptGerado: briefGerado });
  } catch (err) {
    console.error("[POST /api/brief-prd]", err);
    return NextResponse.json(
      { error: "Erro ao gerar Brief PRD" },
      { status: 500 }
    );
  }
}
