import { describe, expect, it } from "vitest";
import { reduceDispositions, type Disposition } from "./api";

const ev = (
  citation: number,
  action: Disposition["action"],
  ts = "2026-07-11T18:00:00+00:00",
): Disposition => ({ ts, citation, action, operator: "TC", note: null });

describe("reduceDispositions", () => {
  it("returns empty state for no events", () => {
    expect(reduceDispositions([]).size).toBe(0);
  });

  it("keeps the last event per citation", () => {
    const state = reduceDispositions([ev(1, "quarantined"), ev(1, "escalated")]);
    expect(state.get(1)?.action).toBe("escalated");
    expect(state.size).toBe(1);
  });

  it("reopened returns the row to Open", () => {
    const state = reduceDispositions([ev(1, "quarantined"), ev(1, "reopened")]);
    expect(state.has(1)).toBe(false);
  });

  it("a new disposition after a reopen wins again", () => {
    const state = reduceDispositions([
      ev(1, "quarantined"),
      ev(1, "reopened"),
      ev(1, "verified"),
    ]);
    expect(state.get(1)?.action).toBe("verified");
  });

  it("citations reduce independently", () => {
    const state = reduceDispositions([
      ev(1, "quarantined"),
      ev(2, "dismissed"),
      ev(1, "reopened"),
    ]);
    expect(state.has(1)).toBe(false);
    expect(state.get(2)?.action).toBe("dismissed");
  });
});
