import "server-only";
import { DEFAULT_ANTHROPIC_MODEL, DEFAULT_OPENAI_MODEL } from "./catalog.ts";
import type { OperatorProvider } from "./types.ts";

const PROVIDER_TIMEOUT_MS = 75_000;

export type ProviderRequest = {
  provider: Exclude<OperatorProvider, "human">;
  model?: string | null;
  systemPrompt: string;
  userPrompt: string;
};

export function providerConfiguration(provider: OperatorProvider) {
  if (provider === "openai") {
    return {
      ready: Boolean(process.env.OPENAI_API_KEY),
      model: process.env.OPENAI_OPERATOR_MODEL || DEFAULT_OPENAI_MODEL,
    };
  }
  if (provider === "anthropic") {
    return {
      ready: Boolean(process.env.ANTHROPIC_API_KEY),
      model: process.env.ANTHROPIC_OPERATOR_MODEL || DEFAULT_ANTHROPIC_MODEL,
    };
  }
  return { ready: true, model: "human" };
}

function openAIText(payload: unknown): string {
  if (!payload || typeof payload !== "object") return "";
  const record = payload as Record<string, unknown>;
  if (typeof record.output_text === "string") return record.output_text;
  if (!Array.isArray(record.output)) return "";

  const parts: string[] = [];
  for (const item of record.output) {
    if (!item || typeof item !== "object") continue;
    const content = (item as Record<string, unknown>).content;
    if (!Array.isArray(content)) continue;
    for (const block of content) {
      if (!block || typeof block !== "object") continue;
      const text = (block as Record<string, unknown>).text;
      if (typeof text === "string") parts.push(text);
    }
  }
  return parts.join("\n");
}

async function callOpenAI(request: ProviderRequest): Promise<{ text: string; model: string }> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error("OpenAI is not configured");
  const model = request.model || process.env.OPENAI_OPERATOR_MODEL || DEFAULT_OPENAI_MODEL;

  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    signal: AbortSignal.timeout(PROVIDER_TIMEOUT_MS),
    body: JSON.stringify({
      model,
      instructions: request.systemPrompt,
      input: request.userPrompt,
      max_output_tokens: 2200,
    }),
  });

  if (!response.ok) {
    throw new Error(`OpenAI request failed with status ${response.status}`);
  }
  const payload = (await response.json()) as unknown;
  const text = openAIText(payload);
  if (!text) throw new Error("OpenAI returned no text output");
  return { text, model };
}

async function callAnthropic(request: ProviderRequest): Promise<{ text: string; model: string }> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error("Anthropic is not configured");
  const model = request.model || process.env.ANTHROPIC_OPERATOR_MODEL || DEFAULT_ANTHROPIC_MODEL;

  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
      "Content-Type": "application/json",
    },
    signal: AbortSignal.timeout(PROVIDER_TIMEOUT_MS),
    body: JSON.stringify({
      model,
      max_tokens: 2200,
      system: request.systemPrompt,
      messages: [{ role: "user", content: request.userPrompt }],
    }),
  });

  if (!response.ok) {
    throw new Error(`Anthropic request failed with status ${response.status}`);
  }
  const payload = (await response.json()) as { content?: Array<{ type?: string; text?: string }> };
  const text = (payload.content ?? [])
    .filter((block) => block.type === "text" && typeof block.text === "string")
    .map((block) => block.text)
    .join("\n");
  if (!text) throw new Error("Anthropic returned no text output");
  return { text, model };
}

export async function callOperatorProvider(request: ProviderRequest): Promise<{ text: string; model: string }> {
  if (request.provider === "openai") return callOpenAI(request);
  return callAnthropic(request);
}
