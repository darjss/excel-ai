export interface ModelSlots {
  reasoning: string;
  auxiliary: string;
}

export const DEFAULT_MODELS: ModelSlots = {
  reasoning: "@cf/zai-org/glm-5.2",
  auxiliary: "@cf/moonshotai/kimi-k2.7-code",
};

export interface ToolCall {
  id: string;
  type: "function";
  function: { name: string; arguments: string };
}

export interface ChatMessage {
  role: "system" | "user" | "assistant" | "tool";
  content: string;
  tool_calls?: ToolCall[];
  tool_call_id?: string;
  name?: string;
}

export interface ToolSchema {
  type: "function";
  function: { name: string; description: string; parameters: Record<string, unknown> };
}

export interface ChatResult {
  content: string;
  toolCalls: ToolCall[];
  finishReason: string;
}

export interface ChatRequest {
  model: string;
  messages: ChatMessage[];
  tools?: ToolSchema[];
  maxCompletionTokens: number;
  temperature?: number;
}

export type ChatFn = (request: ChatRequest) => Promise<ChatResult>;

export class TokenStarvationError extends Error {
  constructor(model: string) {
    super(`Model ${model} returned empty content with finish_reason "length" (reasoning starved the completion budget).`);
    this.name = "TokenStarvationError";
  }
}

export class TimeoutError extends Error {
  constructor(
    readonly model: string,
    readonly timeoutMs: number,
  ) {
    super(`Model ${model} did not respond within ${timeoutMs}ms.`);
    this.name = "TimeoutError";
  }
}

export const DEFAULT_MODEL_CALL_TIMEOUT_MS = 120_000;

export const withTimeout = (chat: ChatFn, timeoutMs: number): ChatFn => {
  return async (request) => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    const timeout = new Promise<never>((_, reject) => {
      timer = setTimeout(() => reject(new TimeoutError(request.model, timeoutMs)), timeoutMs);
    });
    try {
      return await Promise.race([chat(request), timeout]);
    } finally {
      if (timer !== undefined) clearTimeout(timer);
    }
  };
};

interface GatewayConfig {
  id: string;
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

const asString = (value: unknown): string => (typeof value === "string" ? value : "");

const parseToolCalls = (value: unknown): ToolCall[] => {
  if (!Array.isArray(value)) return [];
  const calls: ToolCall[] = [];
  value.forEach((entry, index) => {
    if (!isRecord(entry)) return;
    const fn = entry.function;
    if (!isRecord(fn)) return;
    const name = asString(fn.name);
    if (name.length === 0) return;
    const args = typeof fn.arguments === "string" ? fn.arguments : JSON.stringify(fn.arguments ?? {});
    calls.push({
      id: asString(entry.id) || `call_${index}`,
      type: "function",
      function: { name, arguments: args },
    });
  });
  return calls;
};

const parseResponse = (raw: unknown, model: string): ChatResult => {
  if (!isRecord(raw)) throw new Error(`Model ${model} returned a non-object response.`);

  const choices = raw.choices;
  if (Array.isArray(choices) && choices.length > 0 && isRecord(choices[0])) {
    const choice = choices[0];
    const message = isRecord(choice.message) ? choice.message : {};
    const finishReason = asString(choice.finish_reason) || "stop";
    const content = asString(message.content);
    const toolCalls = parseToolCalls(message.tool_calls);
    if (content.length === 0 && toolCalls.length === 0 && finishReason === "length") {
      throw new TokenStarvationError(model);
    }
    return { content, toolCalls, finishReason };
  }

  const content = asString(raw.response);
  const toolCalls = parseToolCalls(raw.tool_calls);
  const finishReason = asString(raw.finish_reason) || "stop";
  if (content.length === 0 && toolCalls.length === 0 && finishReason === "length") {
    throw new TokenStarvationError(model);
  }
  return { content, toolCalls, finishReason };
};

export const createChatFn = (ai: Ai, gateway?: GatewayConfig): ChatFn => {
  return async (request) => {
    const inputs: Record<string, unknown> = {
      messages: request.messages,
      max_completion_tokens: request.maxCompletionTokens,
    };
    if (request.tools !== undefined && request.tools.length > 0) inputs.tools = request.tools;
    if (request.temperature !== undefined) inputs.temperature = request.temperature;
    const options = gateway !== undefined ? { gateway: { id: gateway.id } } : undefined;
    const raw = await ai.run(request.model, inputs, options);
    return parseResponse(raw, request.model);
  };
};

export const gatewayFromEnv = (gatewayId: string | undefined): GatewayConfig | undefined =>
  gatewayId !== undefined && gatewayId.length > 0 ? { id: gatewayId } : undefined;
