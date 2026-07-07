import { strFromU8, unzipSync } from "fflate";
import { XMLParser } from "fast-xml-parser";

const MAX_INFLATED_BYTES = 50 * 1024 * 1024;

export class WorkbookTooLargeError extends Error {
  readonly inflatedBytes: number;
  readonly limitBytes: number;

  constructor(inflatedBytes: number, limitBytes: number) {
    super(
      `Workbook inflates to more than ${Math.round(limitBytes / (1024 * 1024))}MB and was rejected.`,
    );
    this.name = "WorkbookTooLargeError";
    this.inflatedBytes = inflatedBytes;
    this.limitBytes = limitBytes;
  }
}

export const assertInflatedSize = (bytes: Uint8Array, limit = MAX_INFLATED_BYTES): void => {
  let total = 0;
  unzipSync(bytes, {
    filter: (file) => {
      total += file.originalSize;
      if (total > limit) throw new WorkbookTooLargeError(total, limit);
      return false;
    },
  });
};

export interface SheetXmlEntry {
  name: string;
  path: string;
  xml: string;
}

export interface WorkbookXml {
  sheets: SheetXmlEntry[];
  hasVba: boolean;
}

const attrParser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: "@_",
  allowBooleanAttributes: true,
});

const asArray = <T>(value: T | T[] | undefined): T[] => {
  if (value === undefined) return [];
  return Array.isArray(value) ? value : [value];
};

const normalizeTarget = (target: string): string => {
  const trimmed = target.replace(/^\//, "");
  if (trimmed.startsWith("xl/")) return trimmed;
  return `xl/${trimmed}`;
};

export const readWorkbookXml = (bytes: Uint8Array): WorkbookXml => {
  const zip = unzipSync(bytes);
  const workbookXml = zip["xl/workbook.xml"];
  const relsXml = zip["xl/_rels/workbook.xml.rels"];
  if (workbookXml === undefined || relsXml === undefined) {
    return { sheets: [], hasVba: hasVbaProject(zip) };
  }

  const relTargets = new Map<string, string>();
  const relsParsed = attrParser.parse(strFromU8(relsXml));
  for (const rel of asArray(relsParsed?.Relationships?.Relationship)) {
    const id = rel?.["@_Id"];
    const target = rel?.["@_Target"];
    if (typeof id === "string" && typeof target === "string") {
      relTargets.set(id, normalizeTarget(target));
    }
  }

  const parsed = attrParser.parse(strFromU8(workbookXml));
  const sheets: SheetXmlEntry[] = [];
  for (const sheet of asArray(parsed?.workbook?.sheets?.sheet)) {
    const name = sheet?.["@_name"];
    const rid = sheet?.["@_r:id"] ?? sheet?.["@_id"];
    if (typeof name !== "string" || typeof rid !== "string") continue;
    const path = relTargets.get(rid);
    if (path === undefined) continue;
    const file = zip[path];
    sheets.push({ name, path, xml: file === undefined ? "" : strFromU8(file) });
  }

  return { sheets, hasVba: hasVbaProject(zip) };
};

const hasVbaProject = (zip: Record<string, Uint8Array>): boolean =>
  Object.keys(zip).some((name) => /vbaProject\.bin$/i.test(name));

export const parseFragment = (fragment: string): unknown => attrParser.parse(fragment);

export const collectAttrArray = asArray;
