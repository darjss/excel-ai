import * as v from "valibot";
import { consumeWhiteGloveToken, type RateLimitStore } from "../api/rate-limit";

export const WHITE_GLOVE_REASONS = [
  "too-large",
  "too-many-sheets",
  "macro-workbook",
  "unreadable",
  "no-draft",
  "unviable-after-hints",
  "internal",
] as const;

export const whiteGloveInputSchema = v.object({
  email: v.pipe(v.string(), v.trim(), v.email("A valid email is required.")),
  jobId: v.pipe(v.string(), v.trim(), v.minLength(1, "A job reference is required.")),
  reason: v.picklist(WHITE_GLOVE_REASONS, "Unknown reason."),
});

export type WhiteGloveInput = v.InferOutput<typeof whiteGloveInputSchema>;

export interface WhiteGloveStore {
  insert: (row: WhiteGloveInput) => Promise<void>;
}

export interface WhiteGloveDeps {
  store: WhiteGloveStore;
  cache: RateLimitStore;
  ip: string;
  limitVar: string | undefined;
}

export type WhiteGloveResult =
  | { ok: true }
  | { ok: false; code: "validation" | "rate_limited"; message: string; details?: unknown };

export const submitWhiteGlove = async (
  deps: WhiteGloveDeps,
  body: unknown,
): Promise<WhiteGloveResult> => {
  const parsed = v.safeParse(whiteGloveInputSchema, body);
  if (!parsed.success) {
    const details = parsed.issues.map((issue) => ({
      path: issue.path?.map((segment) => String(segment.key)).join("."),
      message: issue.message,
    }));
    return { ok: false, code: "validation", message: "Please check the form and try again.", details };
  }

  const decision = await consumeWhiteGloveToken(deps.cache, deps.ip, deps.limitVar);
  if (!decision.allowed) {
    return {
      ok: false,
      code: "rate_limited",
      message: `Too many requests. Try again later (limit ${decision.limit}/hour).`,
    };
  }

  await deps.store.insert(parsed.output);
  return { ok: true };
};
