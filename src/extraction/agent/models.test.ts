import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { runAgentLoop } from "./loop";
import { type ChatFn, type ChatResult, TimeoutError, withTimeout } from "./models";

const reply: ChatResult = { content: "done", finishReason: "stop", toolCalls: [] };

describe("withTimeout", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it("resolves with the model result when the call settles under the limit", async () => {
    const chat: ChatFn = () =>
      new Promise((resolve) => setTimeout(() => resolve(reply), 50));
    const bounded = withTimeout(chat, 200);

    const promise = bounded({ model: "m", messages: [], maxCompletionTokens: 8 });
    await vi.advanceTimersByTimeAsync(50);

    await expect(promise).resolves.toEqual(reply);
  });

  it("rejects with a TimeoutError when the call exceeds the limit", async () => {
    const chat: ChatFn = () => new Promise(() => {});
    const bounded = withTimeout(chat, 100);

    const promise = bounded({ model: "glm", messages: [], maxCompletionTokens: 8 });
    const assertion = expect(promise).rejects.toBeInstanceOf(TimeoutError);
    await vi.advanceTimersByTimeAsync(100);
    await assertion;
  });

  it("surfaces the model and timeout on the error", async () => {
    const bounded = withTimeout(() => new Promise(() => {}), 100);
    const promise = bounded({ model: "glm", messages: [], maxCompletionTokens: 8 });
    const assertion = expect(promise).rejects.toMatchObject({ model: "glm", timeoutMs: 100 });
    await vi.advanceTimersByTimeAsync(100);
    await assertion;
  });
});

describe("withTimeout at the agent-loop seam", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it("propagates a TimeoutError when a loop iteration hangs", async () => {
    const hanging: ChatFn = () => new Promise(() => {});
    const bounded = withTimeout(hanging, 100);

    const promise = runAgentLoop({
      chat: bounded,
      model: "glm",
      systemPrompt: "system",
      userPrompt: "user",
      tools: [],
      execution: { execute: () => "", getDraft: () => undefined },
    });
    const assertion = expect(promise).rejects.toBeInstanceOf(TimeoutError);
    await vi.advanceTimersByTimeAsync(100);
    await assertion;
  });
});
