export const stripEquals = (formula: string): string =>
  formula.startsWith("=") ? formula.slice(1) : formula;

const CELL_REF = /^\$?[A-Z]{1,3}\$?\d+$/;
const NUMERIC = /^\d+(?:\.\d+)?$/;

export const isCellRef = (token: string): boolean => CELL_REF.test(token);

export const normalizeRef = (token: string): string => token.replace(/\$/g, "").toUpperCase();

export const extractRefs = (formula: string): string[] => {
  const body = stripEquals(formula);
  const matches = body.match(/\$?[A-Z]{1,3}\$?\d+/g) ?? [];
  return matches
    .filter((token) => CELL_REF.test(token))
    .map(normalizeRef);
};

export const splitTopLevelAdditive = (formula: string): string[] => {
  const body = stripEquals(formula);
  const operands: string[] = [];
  let depth = 0;
  let current = "";
  let inString = false;
  for (let i = 0; i < body.length; i += 1) {
    const char = body[i];
    if (char === '"') inString = !inString;
    if (!inString && (char === "(" || char === "[")) depth += 1;
    if (!inString && (char === ")" || char === "]")) depth -= 1;
    const isSplit = !inString && depth === 0 && (char === "+" || char === "-") && current.length > 0;
    const prev = body[i - 1];
    const isExponentSign = prev === "E" || prev === "e";
    if (isSplit && !isExponentSign) {
      operands.push(current.trim());
      current = "";
      continue;
    }
    current += char;
  }
  if (current.trim().length > 0) operands.push(current.trim());
  return operands.filter((operand) => operand.length > 0);
};

export const numericLiteralOperands = (formula: string): number[] => {
  return splitTopLevelAdditive(formula)
    .filter((operand) => NUMERIC.test(operand))
    .map((operand) => Number(operand));
};

export const percentLiterals = (formula: string): number[] => {
  const body = stripEquals(formula);
  const matches = body.match(/(\d+(?:\.\d+)?)%/g) ?? [];
  return matches.map((match) => Number(match.replace("%", "")));
};
