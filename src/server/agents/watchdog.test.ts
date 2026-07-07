import { describe, expect, it } from "vitest";
import { decideWatchdogAction } from "./watchdog";

const BUDGET = 600_000;

describe("decideWatchdogAction", () => {
  it("fails a run still in progress past the wall-clock budget", () => {
    const action = decideWatchdogAction(
      { status: "running", runStartedAt: 0, budgetMs: BUDGET },
      BUDGET,
    );
    expect(action).toBe("fail");
  });

  it("ignores a run still within its budget", () => {
    const action = decideWatchdogAction(
      { status: "running", runStartedAt: 0, budgetMs: BUDGET },
      BUDGET - 1,
    );
    expect(action).toBe("ignore");
  });

  it("ignores a run that never recorded a start time", () => {
    const action = decideWatchdogAction(
      { status: "running", runStartedAt: null, budgetMs: BUDGET },
      BUDGET * 2,
    );
    expect(action).toBe("ignore");
  });

  it("ignores an alarm that fires after the job already settled", () => {
    for (const status of ["ready", "needs-human", "wrong-species", "builder-mode", "idle"] as const) {
      const action = decideWatchdogAction(
        { status, runStartedAt: 0, budgetMs: BUDGET },
        BUDGET * 2,
      );
      expect(action).toBe("ignore");
    }
  });
});
