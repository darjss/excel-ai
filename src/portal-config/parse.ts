import * as v from "valibot";
import { portalConfigSchema } from "./schema/config";
import type { PortalConfig } from "./types";

export type ParseErrorCode = "validation" | "repair_exhausted";

export interface ParseErrorDetail {
  path: string;
  message: string;
}

export interface ParseError {
  code: ParseErrorCode;
  message: string;
  details: readonly ParseErrorDetail[];
}

export type ParseResult = { ok: true; data: PortalConfig } | { ok: false; error: ParseError };

export type RepairFn = (
  previous: unknown,
  details: readonly ParseErrorDetail[],
) => Promise<unknown>;

const formatDetails = (issues: readonly v.BaseIssue<unknown>[]): ParseErrorDetail[] =>
  issues.map((issue) => ({ path: v.getDotPath(issue) ?? "", message: issue.message }));

export const parsePortalConfig = (input: unknown): ParseResult => {
  const result = v.safeParse(portalConfigSchema, input);
  if (result.success) return { ok: true, data: result.output };
  return {
    ok: false,
    error: {
      code: "validation",
      message: "PortalConfig failed validation",
      details: formatDetails(result.issues),
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
    candidate = await repair(candidate, last.error.details);
    last = parsePortalConfig(candidate);
    attempts += 1;
  }
  if (last.ok) return last;
  return {
    ok: false,
    error: {
      code: "repair_exhausted",
      message: `PortalConfig still invalid after ${attempts} repair attempt(s)`,
      details: last.error.details,
    },
  };
};
