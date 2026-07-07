import type { ParseErrorDetail, RepairFn } from "@/portal-config";
import type { ChatFn } from "./models";

const REPAIR_SYSTEM =
  "You repair a JSON PortalConfig so it passes strict schema validation. Return ONLY the corrected JSON object, no prose.";

const extractJson = (text: string): unknown => {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  const body = fenced?.[1] ?? text;
  const start = body.indexOf("{");
  const end = body.lastIndexOf("}");
  if (start === -1 || end === -1) return {};
  try {
    return JSON.parse(body.slice(start, end + 1));
  } catch {
    return {};
  }
};

export const createRepairFn = (chat: ChatFn, model: string): RepairFn => {
  return async (previous: unknown, details: readonly ParseErrorDetail[]) => {
    const issues = details.map((detail) => `- ${detail.path}: ${detail.message}`).join("\n");
    const result = await chat({
      model,
      maxCompletionTokens: 8192,
      messages: [
        { role: "system", content: REPAIR_SYSTEM },
        {
          role: "user",
          content: `Fix these validation issues:\n${issues}\n\nCurrent JSON:\n${JSON.stringify(previous)}`,
        },
      ],
    });
    return extractJson(result.content);
  };
};
