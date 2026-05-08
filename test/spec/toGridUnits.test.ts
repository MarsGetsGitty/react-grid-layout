import { toGridUnits } from "../../src/core/math/calculate";

describe("toGridUnits", () => {
  // ── Normal cases ──────────────────────────────────────────

  it("converts 50% of 12 columns to 6", () => {
    expect(toGridUnits(0.5, 12)).toBe(6);
  });

  it("converts 50% of 15 rows to 8 (rounds 7.5 up)", () => {
    expect(toGridUnits(0.5, 15)).toBe(8);
  });

  it("converts 25% of 24 columns to 6", () => {
    expect(toGridUnits(0.25, 24)).toBe(6);
  });

  it("converts 100% to the total units", () => {
    expect(toGridUnits(1, 10)).toBe(10);
  });

  it("converts 10% of 3-unit grid to 1 (minimum clamp)", () => {
    expect(toGridUnits(0.1, 3)).toBe(1);
  });

  // ── Boundary clamping ─────────────────────────────────────

  it("clamps 0% to 1 (never returns 0)", () => {
    expect(toGridUnits(0, 10)).toBe(1);
  });

  it("clamps >100% to totalUnits", () => {
    expect(toGridUnits(1.5, 10)).toBe(10);
  });

  // ── Degenerate inputs ─────────────────────────────────────

  it("returns 1 for totalUnits = 0", () => {
    expect(toGridUnits(0.5, 0)).toBe(1);
  });

  it("returns 1 for negative totalUnits", () => {
    expect(toGridUnits(0.5, -5)).toBe(1);
  });

  it("returns 1 for NaN fraction", () => {
    expect(toGridUnits(NaN, 10)).toBe(1);
  });

  it("returns 1 for NaN totalUnits", () => {
    expect(toGridUnits(0.5, NaN)).toBe(1);
  });
});
