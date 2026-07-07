import { describe, expect, it } from "vitest";
import type { OrderStatus } from "./order";
import { canTransition, isTerminalStatus, nextStatuses, ORDER_STATUSES } from "./status";

const valid = new Set<`${OrderStatus}->${OrderStatus}`>([
  "received->confirmed",
  "received->cancelled",
  "confirmed->fulfilled",
  "confirmed->cancelled",
]);

describe("order lifecycle state machine", () => {
  it("allows exactly the four valid transitions and rejects every other pair", () => {
    for (const from of ORDER_STATUSES) {
      for (const to of ORDER_STATUSES) {
        expect(canTransition(from, to)).toBe(valid.has(`${from}->${to}`));
      }
    }
  });

  it("never allows a self-transition", () => {
    for (const status of ORDER_STATUSES) {
      expect(canTransition(status, status)).toBe(false);
    }
  });

  it("treats fulfilled and cancelled as terminal (no resurrection)", () => {
    expect(nextStatuses("fulfilled")).toEqual([]);
    expect(nextStatuses("cancelled")).toEqual([]);
  });

  it("reaches cancelled only from received or confirmed", () => {
    expect(canTransition("received", "cancelled")).toBe(true);
    expect(canTransition("confirmed", "cancelled")).toBe(true);
    expect(canTransition("fulfilled", "cancelled")).toBe(false);
    expect(canTransition("cancelled", "cancelled")).toBe(false);
  });

  it("marks fulfilled and cancelled as terminal and the rest as open", () => {
    expect(isTerminalStatus("fulfilled")).toBe(true);
    expect(isTerminalStatus("cancelled")).toBe(true);
    expect(isTerminalStatus("received")).toBe(false);
    expect(isTerminalStatus("confirmed")).toBe(false);
  });
});
