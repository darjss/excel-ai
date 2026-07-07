import type { ChatFn, ChatMessage, ToolSchema } from "./models";
import { friendlyToolNarration } from "./prompt";
import type { ToolExecution } from "./tools";

export interface AgentLoopArgs {
  chat: ChatFn;
  model: string;
  systemPrompt: string;
  userPrompt: string;
  tools: ToolSchema[];
  execution: ToolExecution;
  maxIterations?: number;
  maxCompletionTokens?: number;
  onNarrate?: (message: string) => void;
}

export interface AgentLoopResult {
  draft: unknown;
  iterations: number;
  transcript: ChatMessage[];
}

const parseArgs = (raw: string): Record<string, unknown> => {
  try {
    const parsed: unknown = JSON.parse(raw);
    return typeof parsed === "object" && parsed !== null ? (parsed as Record<string, unknown>) : {};
  } catch {
    return {};
  }
};

export const runAgentLoop = async (args: AgentLoopArgs): Promise<AgentLoopResult> => {
  const maxIterations = args.maxIterations ?? 8;
  const maxCompletionTokens = args.maxCompletionTokens ?? 8192;
  const messages: ChatMessage[] = [
    { role: "system", content: args.systemPrompt },
    { role: "user", content: args.userPrompt },
  ];

  for (let iteration = 1; iteration <= maxIterations; iteration += 1) {
    const result = await args.chat({
      model: args.model,
      messages,
      tools: args.tools,
      maxCompletionTokens,
    });

    if (result.toolCalls.length === 0) {
      messages.push({ role: "assistant", content: result.content });
      const draft = args.execution.getDraft();
      if (draft !== undefined) return { draft, iterations: iteration, transcript: messages };
      return { draft: undefined, iterations: iteration, transcript: messages };
    }

    messages.push({ role: "assistant", content: result.content, tool_calls: result.toolCalls });

    let submitted = false;
    for (const call of result.toolCalls) {
      const callArgs = parseArgs(call.function.arguments);
      args.onNarrate?.(friendlyToolNarration(call.function.name, callArgs));
      const output = args.execution.execute(call.function.name, callArgs);
      messages.push({ role: "tool", tool_call_id: call.id, name: call.function.name, content: output });
      if (call.function.name === "proposeDraft") submitted = true;
    }

    if (submitted) {
      return { draft: args.execution.getDraft(), iterations: iteration, transcript: messages };
    }
  }

  return { draft: args.execution.getDraft(), iterations: maxIterations, transcript: messages };
};
