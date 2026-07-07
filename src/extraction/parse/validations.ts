import type { DataValidationFact } from "../types";
import { collectAttrArray, parseFragment } from "./workbook-xml";

const DV_BLOCK = /<dataValidations\b[\s\S]*?<\/dataValidations>/g;
const DV_SELF = /<dataValidation\b[^>]*\/>/g;
const DV_OPEN = /<dataValidation\b[\s\S]*?<\/dataValidation>/g;

interface RawDataValidation {
  "@_type"?: string;
  "@_operator"?: string;
  "@_sqref"?: string;
  "@_allowBlank"?: string;
  "@_prompt"?: string;
  formula1?: string | number;
  formula2?: string | number;
}

const toText = (value: string | number | undefined): string | undefined => {
  if (value === undefined) return undefined;
  const text = String(value).trim();
  return text.length > 0 ? text : undefined;
};

const toFact = (raw: RawDataValidation): DataValidationFact | null => {
  const sqref = toText(raw["@_sqref"]);
  if (sqref === undefined) return null;
  return {
    type: raw["@_type"] ?? "custom",
    sqref: sqref.split(/\s+/),
    operator: raw["@_operator"],
    formula1: toText(raw.formula1),
    formula2: toText(raw.formula2),
    allowBlank: raw["@_allowBlank"] === "1",
    prompt: toText(raw["@_prompt"]),
  };
};

export const extractDataValidations = (sheetXml: string): DataValidationFact[] => {
  const fragments = new Set<string>();
  for (const block of sheetXml.match(DV_BLOCK) ?? []) {
    for (const inner of block.match(DV_OPEN) ?? []) fragments.add(inner);
    for (const inner of block.match(DV_SELF) ?? []) fragments.add(inner);
  }
  for (const inner of sheetXml.match(DV_OPEN) ?? []) fragments.add(inner);
  for (const inner of sheetXml.match(DV_SELF) ?? []) fragments.add(inner);

  const facts: DataValidationFact[] = [];
  for (const fragment of fragments) {
    const parsed = parseFragment(fragment) as { dataValidation?: RawDataValidation };
    const node = parsed.dataValidation;
    if (node === undefined) continue;
    const fact = toFact(node);
    if (fact !== null) facts.push(fact);
  }
  return facts;
};

export { collectAttrArray };
