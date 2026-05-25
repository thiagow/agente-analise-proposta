import type { OpenAITool } from "./tools";

const PROVIDER = (process.env.AI_PROVIDER ?? "openai") as
  | "openrouter"
  | "groq"
  | "openai";

const PROVIDER_CONFIGS = {
  openrouter: {
    baseUrl: "https://openrouter.ai/api/v1/chat/completions",
    defaultModel: "openai/gpt-4o",
    apiKey: () => process.env.OPENROUTER_API_KEY!,
    extraHeaders: {
      "HTTP-Referer": "https://techhive.app",
      "X-Title": "Tech Hive",
    },
  },
  groq: {
    baseUrl: "https://api.groq.com/openai/v1/chat/completions",
    defaultModel: "llama-3.3-70b-versatile",
    apiKey: () => process.env.GROQ_API_KEY!,
    extraHeaders: {},
  },
  openai: {
    baseUrl: "https://api.openai.com/v1/chat/completions",
    defaultModel: "gpt-4o",
    apiKey: () => process.env.OPENAI_API_KEY!,
    extraHeaders: {},
  },
};

type ProviderConfig = (typeof PROVIDER_CONFIGS)[keyof typeof PROVIDER_CONFIGS];

export interface Message {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface ToolCall {
  name: string;
  args: Record<string, unknown>;
}

export interface CompletionResult {
  content: string;
  toolCall: ToolCall | null;
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export async function chatCompletion(
  messages: Message[],
  maxTokens = 600
): Promise<string> {
  const result = await chatCompletionRich(messages, { maxTokens });
  return result.content;
}

export async function chatCompletionRich(
  messages: Message[],
  opts: {
    maxTokens?: number;
    tools?: OpenAITool[];
  } = {}
): Promise<CompletionResult> {
  const { maxTokens = 600, tools } = opts;
  const config = PROVIDER_CONFIGS[PROVIDER];

  const modelsEnv =
    process.env.AI_MODELS ?? process.env.AI_MODEL ?? config.defaultModel;
  const models = modelsEnv
    .split(",")
    .map((m) => m.trim())
    .filter(Boolean);

  let lastError: Error | null = null;

  for (const model of models) {
    try {
      const result = await tryOnce(config, model, messages, maxTokens, tools);
      if (result && (result.content.length > 0 || result.toolCall)) {
        console.log(`[chatCompletion] usou modelo: ${model}`);
        return result;
      }
      lastError = new Error("resposta vazia");
      console.warn(`[chatCompletion] modelo ${model} retornou vazio`);
    } catch (err) {
      lastError = err as Error;
      console.warn(
        `[chatCompletion] modelo ${model} falhou: ${(err as Error).message.slice(0, 200)}`
      );
    }
  }

  throw lastError ?? new Error("Nenhum modelo respondeu");
}

export async function chatCompletionWith(
  provider: keyof typeof PROVIDER_CONFIGS,
  messages: Message[],
  maxTokens = 600
): Promise<string> {
  const config = PROVIDER_CONFIGS[provider];
  const result = await tryOnce(
    config,
    config.defaultModel,
    messages,
    maxTokens,
    undefined
  );
  if (!result?.content) throw new Error("Resposta vazia do modelo");
  console.log(
    `[chatCompletionWith] provider: ${provider}, model: ${config.defaultModel}`
  );
  return result.content;
}

async function tryOnce(
  config: ProviderConfig,
  model: string,
  messages: Message[],
  maxTokens: number,
  tools?: OpenAITool[]
): Promise<CompletionResult | null> {
  const body: Record<string, unknown> = {
    model,
    messages,
    max_tokens: maxTokens,
  };

  if (tools && tools.length > 0) {
    body.tools = tools;
    body.tool_choice = "auto";
  }

  const res = await fetch(config.baseUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${config.apiKey()}`,
      ...config.extraHeaders,
    },
    body: JSON.stringify(body),
  });

  if (res.status === 429) {
    const errBody = await res.clone().json().catch(() => null);
    const retryAfter = errBody?.error?.metadata?.retry_after_seconds;
    if (typeof retryAfter === "number" && retryAfter <= 8) {
      await sleep(Math.ceil(retryAfter) * 1000 + 500);
      return tryOnce(config, model, messages, maxTokens, tools);
    }
    throw new Error(`429 (retry ${retryAfter ?? "?"}s)`);
  }

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`${res.status}: ${text.slice(0, 300)}`);
  }

  const data = await res.json();
  const choice = data?.choices?.[0]?.message;
  const content: string = choice?.content ?? "";

  let toolCall: ToolCall | null = null;
  const rawToolCall = choice?.tool_calls?.[0];
  if (rawToolCall?.function?.name) {
    try {
      toolCall = {
        name: rawToolCall.function.name,
        args: JSON.parse(rawToolCall.function.arguments ?? "{}"),
      };
    } catch (err) {
      console.warn(
        `[chatCompletion] tool_call com argumentos inválidos: ${(err as Error).message}`
      );
    }
  }

  if (!content && !toolCall) return null;
  return { content, toolCall };
}
