import { chatCompletionRich, type Message } from "./openrouter";
import { ANALYZE_BRIEFING_TOOL, ANALYZE_BRIEFING_TOOL_NAME } from "./tools";
import type { ProjectType } from "./prompts";

export interface AnaliseDocumento {
  tipo: ProjectType;
  projeto: string;
  objetivo: string;
  resumo_curto: string;
  campos_identificados: Record<string, unknown>;
  gaps: string[];
}

const ANALISE_SYSTEM_PROMPT = `Você é o **Analista de Briefings da Tech Hive**. Seu trabalho é ler o documento que o cliente enviou e extrair informações estruturadas.

REGRAS:
1. **Classifique o tipo de projeto** entre: webApp, mobileApp, automacao, agente.
   - webApp: sistema web acessado pelo navegador (SaaS, plataformas, dashboards, portais)
   - mobileApp: aplicativo instalado em celular (iOS/Android)
   - automacao: automação de processos repetitivos com ou sem IA (RPA, integrações, workflows)
   - agente: chatbot conversacional ou agente de IA para atendimento/suporte
   Se for ambíguo, escolha o que MELHOR representa a essência do projeto.

2. **Extraia apenas o que está CLARAMENTE no documento.** Nunca invente, nunca extrapole. Se algo é vago, deixe fora de campos_identificados e adicione um gap.

3. **resumo_curto** deve ser uma síntese natural em 2-3 linhas, escrita como o agente vai dizer ao lead no chat. Exemplo: "Você quer um sistema web para gerenciar pedidos da sua confeitaria, com login para clientes e painel admin para você."

4. **gaps** lista o que falta perguntar. Use linguagem simples (ex: "qual a urgência?", "tem orçamento definido?"), não nomes técnicos.

5. Retorne TUDO via tool call 'analyze_briefing'. NUNCA escreva texto na resposta.`;

export async function analisarBriefing(
  textoExtraido: string
): Promise<AnaliseDocumento | null> {
  if (!textoExtraido?.trim()) return null;

  const messages: Message[] = [
    { role: "system", content: ANALISE_SYSTEM_PROMPT },
    {
      role: "user",
      content: `Analise o briefing abaixo e retorne via tool call.\n\n---\n\n${textoExtraido}`,
    },
  ];

  try {
    const completion = await chatCompletionRich(messages, {
      tools: [ANALYZE_BRIEFING_TOOL],
      forceTool: ANALYZE_BRIEFING_TOOL_NAME,
      maxTokens: 1500,
    });

    if (!completion.toolCall || completion.toolCall.name !== ANALYZE_BRIEFING_TOOL_NAME) {
      console.warn("[analisarBriefing] tool não foi chamada");
      return null;
    }

    const args = completion.toolCall.args as unknown as AnaliseDocumento;
    if (!args.tipo || !["webApp", "mobileApp", "automacao", "agente"].includes(args.tipo)) {
      console.warn("[analisarBriefing] tipo inválido:", args.tipo);
      return null;
    }
    return args;
  } catch (err) {
    console.warn(
      `[analisarBriefing] falhou: ${(err as Error).message.slice(0, 200)}`
    );
    return null;
  }
}

export function montarAberturaContextual(analise: AnaliseDocumento): string {
  return `${analise.resumo_curto}\n\nIsso está correto, ou tem algo que eu entendi errado?`;
}
