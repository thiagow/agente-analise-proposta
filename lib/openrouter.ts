const PROVIDER = (process.env.AI_PROVIDER ?? "openrouter") as
  | "openrouter"
  | "groq"
  | "openai";

const PROVIDER_CONFIGS = {
  openrouter: {
    baseUrl: "https://openrouter.ai/api/v1/chat/completions",
    defaultModel: "google/gemma-4-26b-a4b-it:free",
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
    defaultModel: "gpt-4o-mini",
    apiKey: () => process.env.OPENAI_API_KEY!,
    extraHeaders: {},
  },
};

type ProviderConfig = typeof PROVIDER_CONFIGS[keyof typeof PROVIDER_CONFIGS];

export interface Message {
  role: "system" | "user" | "assistant";
  content: string;
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export async function chatCompletion(messages: Message[]): Promise<string> {
  const config = PROVIDER_CONFIGS[PROVIDER];

  const modelsEnv = process.env.AI_MODELS ?? process.env.AI_MODEL ?? config.defaultModel;
  const models = modelsEnv.split(",").map((m) => m.trim()).filter(Boolean);

  let lastError: Error | null = null;

  for (const model of models) {
    try {
      const content = await tryOnce(config, model, messages);
      if (content && content.trim().length > 0) {
        console.log(`[chatCompletion] usou modelo: ${model}`);
        return content;
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

async function tryOnce(
  config: ProviderConfig,
  model: string,
  messages: Message[]
): Promise<string | null> {
  const res = await fetch(config.baseUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${config.apiKey()}`,
      ...config.extraHeaders,
    },
    body: JSON.stringify({ model, messages, max_tokens: 2000 }),
  });

  if (res.status === 429) {
    const body = await res.clone().json().catch(() => null);
    const retryAfter = body?.error?.metadata?.retry_after_seconds;
    if (typeof retryAfter === "number" && retryAfter <= 8) {
      await sleep(Math.ceil(retryAfter) * 1000 + 500);
      return tryOnce(config, model, messages);
    }
    throw new Error(`429 (retry ${retryAfter ?? "?"}s)`);
  }

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`${res.status}: ${text.slice(0, 300)}`);
  }

  const data = await res.json();
  return data?.choices?.[0]?.message?.content ?? null;
}
