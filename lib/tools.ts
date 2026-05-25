import type { ProjectType } from "./prompts";

export interface OpenAITool {
  type: "function";
  function: {
    name: string;
    description: string;
    parameters: Record<string, unknown>;
  };
}

const sharedDescription =
  "Use esta função APENAS depois de o lead ter confirmado o resumo final. " +
  "Esta é a ÚNICA forma de finalizar a qualificação. " +
  "NUNCA escreva JSON, chaves '{' ou '}' no texto da resposta. " +
  "A função registra silenciosamente os dados estruturados e encerra a conversa.";

const urgenciaEnum = ["imediata", "proximos_meses", "sem_prazo"] as const;
const designStatusEnum = [
  "Entregue pelo cliente",
  "A criar",
  "Referência visual fornecida",
] as const;

export const TOOLS: Record<ProjectType, OpenAITool[]> = {
  webApp: [
    {
      type: "function",
      function: {
        name: "submit_qualified_lead",
        description: sharedDescription,
        parameters: {
          type: "object",
          additionalProperties: false,
          required: [
            "tipo",
            "projeto",
            "objetivo",
            "area_logada",
            "painel_admin",
            "integracoes",
            "modelo_uso",
            "volume_usuarios",
            "features_mvp",
            "features_futuras",
            "design_status",
            "urgencia",
            "orcamento",
            "observacoes",
          ],
          properties: {
            tipo: { const: "webApp" },
            projeto: { type: "string", description: "Nome do projeto" },
            objetivo: { type: "string", description: "1-2 frases" },
            area_logada: { type: "boolean" },
            painel_admin: { type: "boolean" },
            integracoes: { type: "array", items: { type: "string" } },
            modelo_uso: {
              type: "string",
              enum: ["interno", "saas", "nao_definido"],
            },
            volume_usuarios: {
              type: "string",
              enum: ["dezenas", "centenas", "milhares", "nao_definido"],
            },
            features_mvp: { type: "array", items: { type: "string" } },
            features_futuras: { type: "array", items: { type: "string" } },
            design_status: { type: "string", enum: [...designStatusEnum] },
            urgencia: { type: "string", enum: [...urgenciaEnum] },
            orcamento: {
              type: "string",
              enum: ["ate_20k", "20k_50k", "acima_50k", "nao_informado"],
            },
            observacoes: { type: "string" },
          },
        },
      },
    },
  ],

  mobileApp: [
    {
      type: "function",
      function: {
        name: "submit_qualified_lead",
        description: sharedDescription,
        parameters: {
          type: "object",
          additionalProperties: false,
          required: [
            "tipo",
            "projeto",
            "objetivo",
            "plataforma",
            "offline",
            "recursos_nativos",
            "area_logada",
            "painel_admin",
            "integracoes",
            "publicacao_lojas",
            "features_mvp",
            "features_futuras",
            "design_status",
            "urgencia",
            "orcamento",
            "analyst_notes",
            "observacoes",
          ],
          properties: {
            tipo: { const: "mobileApp" },
            projeto: { type: "string" },
            objetivo: { type: "string" },
            plataforma: {
              type: "string",
              enum: ["ios", "android", "ambos"],
            },
            offline: { type: "boolean" },
            recursos_nativos: {
              type: "array",
              items: {
                type: "string",
                enum: ["camera", "gps", "notificacoes", "biometria", "microfone", "outros"],
              },
            },
            area_logada: { type: "boolean" },
            painel_admin: { type: "boolean" },
            integracoes: { type: "array", items: { type: "string" } },
            publicacao_lojas: { type: "boolean" },
            features_mvp: { type: "array", items: { type: "string" } },
            features_futuras: { type: "array", items: { type: "string" } },
            design_status: { type: "string", enum: [...designStatusEnum] },
            urgencia: { type: "string", enum: [...urgenciaEnum] },
            orcamento: {
              type: "string",
              enum: ["ate_30k", "30k_80k", "acima_80k", "nao_informado"],
            },
            analyst_notes: { type: "string" },
            observacoes: { type: "string" },
          },
        },
      },
    },
  ],

  automacao: [
    {
      type: "function",
      function: {
        name: "submit_qualified_lead",
        description: sharedDescription,
        parameters: {
          type: "object",
          additionalProperties: false,
          required: [
            "tipo",
            "projeto",
            "objetivo",
            "gatilho",
            "sistemas",
            "tem_leitura_ia",
            "tipo_conteudo_ia",
            "frequencia",
            "volume_mensal",
            "tempo_real",
            "tratamento_erros",
            "processo_manual_hoje",
            "horas_manuais_semana",
            "interface_required",
            "painel_monitoramento",
            "design_status",
            "urgencia",
            "orcamento",
            "analyst_notes",
            "observacoes",
          ],
          properties: {
            tipo: { const: "automacao" },
            projeto: { type: "string" },
            objetivo: { type: "string" },
            gatilho: {
              type: "string",
              enum: ["evento_humano", "agendado", "evento_sistema", "outro"],
            },
            sistemas: { type: "array", items: { type: "string" } },
            tem_leitura_ia: { type: "boolean" },
            tipo_conteudo_ia: { type: "array", items: { type: "string" } },
            frequencia: { type: "string" },
            volume_mensal: { type: "string" },
            tempo_real: { type: "boolean" },
            tratamento_erros: {
              type: "string",
              enum: ["notificacao", "reprocessamento", "pausa", "nao_definido"],
            },
            processo_manual_hoje: { type: "boolean" },
            horas_manuais_semana: { type: "string" },
            interface_required: { type: "boolean" },
            painel_monitoramento: { type: "boolean" },
            design_status: {
              type: "string",
              enum: [...designStatusEnum, "nao_aplicavel"],
            },
            urgencia: { type: "string", enum: [...urgenciaEnum] },
            orcamento: {
              type: "string",
              enum: ["ate_15k", "15k_40k", "acima_40k", "nao_informado"],
            },
            analyst_notes: { type: "string" },
            observacoes: { type: "string" },
          },
        },
      },
    },
  ],

  agente: [
    {
      type: "function",
      function: {
        name: "submit_qualified_lead",
        description: sharedDescription,
        parameters: {
          type: "object",
          additionalProperties: false,
          required: [
            "tipo",
            "projeto",
            "objetivo",
            "canal",
            "canais_lista",
            "publico",
            "base_conhecimento",
            "base_conhecimento_descricao",
            "tipo_interacao",
            "acoes_descricao",
            "fallback",
            "sistema_handoff",
            "volume_conversas",
            "painel_gestao",
            "curadoria_base",
            "design_status",
            "urgencia",
            "orcamento",
            "recurring_cost_alert",
            "analyst_notes",
            "observacoes",
          ],
          properties: {
            tipo: { const: "agente" },
            projeto: { type: "string" },
            objetivo: { type: "string" },
            canal: {
              type: "string",
              enum: [
                "whatsapp",
                "site",
                "app_mobile",
                "telegram",
                "instagram",
                "omnichannel",
              ],
            },
            canais_lista: { type: "array", items: { type: "string" } },
            publico: {
              type: "string",
              enum: ["clientes", "funcionarios", "fornecedores", "misto"],
            },
            base_conhecimento: {
              type: "string",
              enum: ["documentada", "nao_documentada", "sistema_externo_api", "misto"],
            },
            base_conhecimento_descricao: { type: "string" },
            tipo_interacao: {
              type: "string",
              enum: ["conversacional", "acoes_leitura", "acoes_escrita"],
            },
            acoes_descricao: { type: "string" },
            fallback: {
              type: "string",
              enum: ["encerra", "transfere_humano", "registra_ticket", "nao_definido"],
            },
            sistema_handoff: { type: "string" },
            volume_conversas: {
              type: "string",
              enum: [
                "menos_100_mes",
                "100_2000_mes",
                "acima_2000_mes",
                "nao_informado",
              ],
            },
            painel_gestao: { type: "boolean" },
            curadoria_base: { type: "boolean" },
            design_status: {
              type: "string",
              enum: [...designStatusEnum, "N/A (canal externo)"],
            },
            urgencia: { type: "string", enum: [...urgenciaEnum] },
            orcamento: {
              type: "string",
              enum: ["ate_20k", "20k_60k", "acima_60k", "nao_informado"],
            },
            recurring_cost_alert: { type: "boolean" },
            analyst_notes: { type: "string" },
            observacoes: { type: "string" },
          },
        },
      },
    },
  ],
};

export const TOOL_NAME = "submit_qualified_lead";
