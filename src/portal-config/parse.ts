import * as v from "valibot";
import { portalConfigSchema } from "./schema/config";
import type { PortalConfig } from "./types";

export type ParseErrorCode = "validation" | "repair_exhausted";

export interface ParseError {
  code: ParseErrorCode;
  message: string;
  issues: readonly string[];
}

export type ParseResult = { ok: true; data: PortalConfig } | { ok: false; error: ParseError };

export type RepairFn = (previous: unknown, issues: readonly string[]) => Promise<unknown>;

const formatIssues = (issues: readonly v.BaseIssue<unknown>[]): string[] =>
  issues.map((issue) => {
    const path = v.getDotPath(issue);
    return path ? `${path}: ${issue.message}` : issue.message;
  });

export const parsePortalConfig = (input: unknown): ParseResult => {
  const result = v.safeParse(portalConfigSchema, input);
  if (result.success) return { ok: true, data: result.output };
  return {
    ok: false,
    error: {
      code: "validation",
      message: "PortalConfig failed validation",
      issues: formatIssues(result.issues),
    },
  };
};

export const repairAndParse = async (
  raw: unknown,
  repair: RepairFn,
  maxAttempts = 2,
): Promise<ParseResult> => {
  let candidate = raw;
  let last = parsePortalConfig(candidate);
  let attempts = 0;
  while (!last.ok && attempts < maxAttempts) {
    candidate = await repair(candidate, last.error.issues);
    last = parsePortalConfig(candidate);
    attempts += 1;
  }
  if (last.ok) return last;
  return {
    ok: false,
    error: {
      code: "repair_exhausted",
      message: `PortalConfig still invalid after ${attempts} repair attempt(s)`,
      issues: last.error.issues,
    },
  };
};
