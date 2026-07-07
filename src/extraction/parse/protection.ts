import type { ProtectionFact } from "../types";
import { parseFragment } from "./workbook-xml";

const PROT = /<sheetProtection\b[^>]*\/>/;

export const extractProtection = (sheetName: string, sheetXml: string): ProtectionFact | null => {
  const match = sheetXml.match(PROT);
  if (match === null) return null;
  const parsed = parseFragment(match[0]) as {
    sheetProtection?: Record<string, string>;
  };
  const node = parsed.sheetProtection;
  if (node === undefined) return null;

  const flags: Record<string, string> = {};
  for (const [key, value] of Object.entries(node)) {
    if (key.startsWith("@_")) flags[key.slice(2)] = String(value);
  }

  return {
    sheet: sheetName,
    algorithmName: flags.algorithmName,
    selectLockedCells: flags.selectLockedCells === "1",
    selectUnlockedCells: flags.selectUnlockedCells === "1",
    flags,
  };
};
