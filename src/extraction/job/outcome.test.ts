import { describe, expect, it } from "vitest";
import { wholesaleConfig } from "@/portal-config";
import type { ExtractionOutcome } from "../ladder/types";
import { outcomeToFrame } from "./outcome";

describe("outcomeToFrame", () => {
  it("maps a ready outcome to a result event", () => {
    const outcome: ExtractionOutcome = {
      kind: "ready",
      config: wholesaleConfig,
      report: { anomalies: [], downgrades: [] },
      iterations: 2,
    };
    const frame = outcomeToFrame(outcome);
    expect(frame.event).toBe("result");
    expect(frame.data).toEqual({ config: wholesaleConfig });
  });

  it("maps a wrong-species outcome to a wrong_species event", () => {
    const outcome: ExtractionOutcome = {
      kind: "wrong-species",
      message: "Not an order sheet.",
      signals: { numericColumns: 0, priceHeaderHits: 0, formulaCount: 0, validationCount: 0, textCells: 30 },
    };
    const frame = outcomeToFrame(outcome);
    expect(frame.event).toBe("wrong_species");
  });

  it("maps a builder-mode outcome to a builder_mode event carrying the preview", () => {
    const outcome: ExtractionOutcome = {
      kind: "builder-mode",
      message: "Point us at the table.",
      preview: [{ sheet: "Sheet1", dimension: "A1:C3", columns: ["A", "B", "C"], rows: [["a", "b", "c"]] }],
    };
    const frame = outcomeToFrame(outcome);
    expect(frame.event).toBe("builder_mode");
    expect(frame.data).toMatchObject({ preview: outcome.preview });
  });

  it("maps a needs-human outcome to a needs_human event carrying the reason", () => {
    const outcome: ExtractionOutcome = {
      kind: "needs-human",
      reason: "too-large",
      message: "Too big for now.",
    };
    const frame = outcomeToFrame(outcome);
    expect(frame.event).toBe("needs_human");
    expect(frame.data).toMatchObject({ reason: "too-large" });
  });
});
