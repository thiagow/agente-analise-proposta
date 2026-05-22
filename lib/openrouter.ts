const PROVIDER = (process.env.AI_PROVIDER ?? "openrouter") as
  | "openrouter"
  | "groq"
  | "openai";

const PROVIDER_CONFIGS = {
  openrouter: {
    baseUrl: "https://openrouter.ai/api/v1/chat/completions",
    defaultModel: "meta-llama/llama-3.3-70b-instruct:free",
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

export interface Message {
  role: "system" | "user" | "assistant";
  content: string;
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export async function chatCompletion(messages: Message[], retries = 3): Promise<string> {
  const config = PROVIDER_CONFIGS[PROVIDER];
  const model = process.env.AI_MODEL ?? config.defaultModel;

  const res = await fetch(config.baseUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${config.apiKey()}`,
      ...config.extraHeaders,
    },
    body: JSON.stringify({ model, messages }),
  });

  if (res.status === 429 && retries > 0) {
    let waitMs = 5000;
    try {
      const body = await res.clone().json();
      const retryAfter = body?.error?.metadata?.retry_after_seconds;
      if (typeof retryAfter === "number") waitMs = Math.ceil(retryAfter) * 1000 + 500;
    } catch { /* usa default */ }
    await sleep(waitMs);
    return chatCompletion(messages, retries - 1);
  }

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`[${PROVIDER}] ${res.status}: ${body}`);
  }

  const data = await res.json();
  return data.choices[0].message.content as string;
}
