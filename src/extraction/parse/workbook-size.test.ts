import { zipSync } from "fflate";
import { describe, expect, it } from "vitest";
import { WorkbookTooLargeError, assertInflatedSize } from "./workbook-xml";

const zipWithInflatedPayload = (bytes: number): Uint8Array =>
  zipSync({ "xl/big.bin": new Uint8Array(bytes) });

describe("assertInflatedSize", () => {
  it("passes a workbook under the inflated cap", () => {
    expect(() => assertInflatedSize(zipWithInflatedPayload(1024), 1024 * 1024)).not.toThrow();
  });

  it("throws a typed error when the inflated size exceeds the cap", () => {
    const archive = zipWithInflatedPayload(2 * 1024 * 1024);
    expect(() => assertInflatedSize(archive, 1024 * 1024)).toThrow(WorkbookTooLargeError);
  });
});
