import type { ConditionalFormatFact, ConditionalRuleFact } from "../types";
import { collectAttrArray, parseFragment } from "./workbook-xml";

const CF_BLOCK = /<conditionalFormatting\b[\s\S]*?<\/conditionalFormatting>/g;

interface RawCfRule {
  "@_type"?: string;
  "@_operator"?: string;
  formula?: string | number | (string | number)[];
}

interface RawCf {
  "@_sqref"?: string;
  cfRule?: RawCfRule | RawCfRule[];
}

const firstFormula = (formula: RawCfRule["formula"]): string | undefined => {
  if (formula === undefined) return undefined;
  const value = Array.isArray(formula) ? formula[0] : formula;
  const text = String(value).trim();
  return text.length > 0 ? text : undefined;
};

export const extractConditionalFormats = (sheetXml: string): ConditionalFormatFact[] => {
  const facts: ConditionalFormatFact[] = [];
  for (const block of sheetXml.match(CF_BLOCK) ?? []) {
    const parsed = parseFragment(block) as { conditionalFormatting?: RawCf };
    const node = parsed.conditionalFormatting;
    if (node === undefined) continue;
    const sqref = node["@_sqref"];
    if (typeof sqref !== "string") continue;
    const rules: ConditionalRuleFact[] = collectAttrArray(node.cfRule).map((rule) => ({
      type: rule["@_type"] ?? "unknown",
      operator: rule["@_operator"],
      formula: firstFormula(rule.formula),
    }));
    facts.push({ sqref, rules });
  }
  return facts;
};
