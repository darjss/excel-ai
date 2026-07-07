import * as XLSX from "xlsx";
import type { TemplateSpec } from "./templates";

const HEADER_LABELS = ["Product", "Unit", "Unit Price", "Quantity", "Line Total"] as const;

const HEADER_ROW_INDEX = 6;
const FIRST_ITEM_ROW_INDEX = 7;

interface Placed {
  ref: string;
  cell: XLSX.CellObject;
}

const priceFormat = (symbol: string): string => `"${symbol}"#,##0.00`;

const text = (value: string): XLSX.CellObject => ({ t: "s", v: value });

const money = (value: number, symbol: string): XLSX.CellObject => ({
  t: "n",
  v: value,
  z: priceFormat(symbol),
});

const number = (value: number): XLSX.CellObject => ({ t: "n", v: value });

const formula = (expr: string, value: number, symbol: string): XLSX.CellObject => ({
  t: "n",
  f: expr,
  v: value,
  z: priceFormat(symbol),
});

const addr = (row: number, col: number): string => XLSX.utils.encode_cell({ r: row, c: col });

export const buildTemplateWorkbook = (spec: TemplateSpec): Uint8Array => {
  const symbol = spec.currencySymbol;
  const placed: Placed[] = [];
  const put = (row: number, col: number, cell: XLSX.CellObject): void => {
    placed.push({ ref: addr(row, col), cell });
  };

  put(0, 0, text(spec.businessName));
  put(1, 0, text(spec.formTitle));
  put(3, 0, text("Buyer"));
  put(3, 2, text("Order date"));
  put(4, 0, text("Contact"));
  put(4, 2, text("Order #"));

  HEADER_LABELS.forEach((label, col) => put(HEADER_ROW_INDEX, col, text(label)));

  spec.lineItems.forEach((item, index) => {
    const row = FIRST_ITEM_ROW_INDEX + index;
    const rowNumber = row + 1;
    const lineTotal = item.unitPrice * item.sampleQuantity;
    put(row, 0, text(item.product));
    put(row, 1, text(item.unit));
    put(row, 2, money(item.unitPrice, symbol));
    put(row, 3, number(item.sampleQuantity));
    put(row, 4, formula(`C${rowNumber}*D${rowNumber}`, lineTotal, symbol));
  });

  const lastItemRow = FIRST_ITEM_ROW_INDEX + spec.lineItems.length - 1;
  const subtotalValue = spec.lineItems.reduce(
    (sum, item) => sum + item.unitPrice * item.sampleQuantity,
    0,
  );
  const subtotalRow = lastItemRow + 2;
  const subtotalRowNumber = subtotalRow + 1;
  put(subtotalRow, 3, text("Subtotal"));
  put(
    subtotalRow,
    4,
    formula(`SUM(E${FIRST_ITEM_ROW_INDEX + 1}:E${lastItemRow + 1})`, subtotalValue, symbol),
  );

  let totalRow = subtotalRow + 1;
  let totalExpr = `E${subtotalRowNumber}`;
  let totalValue = subtotalValue;

  if (spec.taxRatePercent !== null && spec.taxLabel !== null) {
    const taxRow = subtotalRow + 1;
    const taxRowNumber = taxRow + 1;
    const taxValue = subtotalValue * (spec.taxRatePercent / 100);
    put(taxRow, 3, text(spec.taxLabel));
    put(taxRow, 4, formula(`E${subtotalRowNumber}*${spec.taxRatePercent / 100}`, taxValue, symbol));
    totalRow = taxRow + 1;
    totalExpr = `E${subtotalRowNumber}+E${taxRowNumber}`;
    totalValue = subtotalValue + taxValue;
  }

  put(totalRow, 3, text("Total"));
  put(totalRow, 4, formula(totalExpr, totalValue, symbol));

  const termsRow = totalRow + 2;
  put(termsRow, 0, text(`Terms: ${spec.paymentTerms}`));

  const sheet: XLSX.WorkSheet = {};
  for (const { ref, cell } of placed) sheet[ref] = cell;
  sheet["!ref"] = `A1:E${termsRow + 1}`;
  sheet["!cols"] = [{ wch: 28 }, { wch: 16 }, { wch: 12 }, { wch: 10 }, { wch: 14 }];

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, sheet, "Order Form");

  const output: unknown = XLSX.write(workbook, { type: "array", bookType: "xlsx" });
  return new Uint8Array(output as ArrayBuffer);
};
