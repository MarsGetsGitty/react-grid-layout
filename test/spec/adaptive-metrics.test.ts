/**
 * Adaptive Metrics — Test Suite
 *
 * Tests for computeAdaptiveMetrics(), the pure function that computes
 * dynamic cols, rowHeight, and maxRows from container dimensions.
 *
 * @module test/spec/adaptive-metrics
 */

import {
  computeAdaptiveMetrics,
  ADAPTIVE_DEFAULTS,
} from "../../src/core/math/adaptive-metrics";
import { calcGridColWidth } from "../../src/core/math/calculate";

// ============================================================================
// Helpers
// ============================================================================

/** Shorthand with default options. */
const compute = (
  w: number,
  h: number,
  opts: Parameters<typeof computeAdaptiveMetrics>[2] = {}
) => computeAdaptiveMetrics(w, h, opts);

// ============================================================================
// Column Computation
// ============================================================================

describe("computeAdaptiveMetrics — column computation", () => {
  it("#1: 1200px wide → correct cols (default targetCellWidth=120)", () => {
    // effectivePadding[0] = 6 (margin, since containerPadding is null)
    // availableWidth = max(1, 1200 - 6*2) = 1188
    // rawCols = floor(1188 / 120) = 9. Clamped to [6, 24] = 9.
    const result = compute(1200, 800);
    expect(result.cols).toBe(9);
  });

  it("#2: 1920px wide → correct cols", () => {
    const result = compute(1920, 1080);
    // availableWidth = 1920 - 12 = 1908, floor(1908/120) = 15
    expect(result.cols).toBe(15);
  });

  it("#3: 2560px wide → correct cols", () => {
    const result = compute(2560, 1440);
    // availableWidth = 2560 - 12 = 2548, floor(2548/120) = 21
    expect(result.cols).toBe(21);
  });

  it("#4: maxCols=8 clamps high col count", () => {
    const result = compute(1920, 1080, { maxCols: 8 });
    expect(result.cols).toBe(8);
  });

  it("#5: 400px wide clamps to minCols=6", () => {
    const result = compute(400, 600, { minCols: 6 });
    // availableWidth = 400 - 12 = 388, floor(388/120) = 3
    // Clamped to minCols=6
    expect(result.cols).toBe(6);
  });

  it("#14: different targetCellWidth → different cols", () => {
    const a = compute(1920, 1080, { targetCellWidth: 100 });
    const b = compute(1920, 1080, { targetCellWidth: 200 });
    expect(a.cols).toBeGreaterThan(b.cols);
  });
});

// ============================================================================
// Row Height Computation
// ============================================================================

describe("computeAdaptiveMetrics — row height", () => {
  it("#11: cellAspectRatio=1.0 → rowHeight ≈ colWidth", () => {
    const result = compute(1200, 800, { cellAspectRatio: 1.0 });
    expect(result.rowHeight).toBe(Math.max(1, Math.round(result.colWidth * 1.0)));
  });

  it("#12: cellAspectRatio=0.5 → rowHeight ≈ colWidth × 0.5", () => {
    const result = compute(1200, 800, { cellAspectRatio: 0.5 });
    expect(result.rowHeight).toBe(Math.max(1, Math.round(result.colWidth * 0.5)));
  });

  it("#15: rowHeight is always a positive integer", () => {
    const sizes = [100, 400, 800, 1200, 1920, 2560, 3840];
    for (const w of sizes) {
      const result = compute(w, 800);
      expect(result.rowHeight).toBeGreaterThanOrEqual(1);
      expect(Number.isInteger(result.rowHeight)).toBe(true);
    }
  });
});

// ============================================================================
// Column Width Formula Parity
// ============================================================================

describe("computeAdaptiveMetrics — colWidth matches calcGridColWidth", () => {
  it("#13: computed colWidth matches RGL's calcGridColWidth formula", () => {
    const margin: [number, number] = [6, 6];
    const containerPadding: [number, number] = [10, 10];
    const containerWidth = 1200;

    const result = compute(containerWidth, 800, { margin, containerPadding });

    const rglColWidth = calcGridColWidth({
      margin,
      containerPadding,
      containerWidth,
      cols: result.cols,
      rowHeight: result.rowHeight,
      maxRows: result.maxRows,
    });

    // colWidth from adaptive metrics should match calcGridColWidth exactly
    // (both use the same formula). Allow tiny floating point tolerance.
    expect(Math.abs(result.colWidth - rglColWidth)).toBeLessThan(0.001);
  });

  it("#13b: parity holds with null containerPadding (uses margin)", () => {
    const margin: [number, number] = [8, 8];
    const containerWidth = 1600;

    const result = compute(containerWidth, 900, {
      margin,
      containerPadding: null,
    });

    const rglColWidth = calcGridColWidth({
      margin,
      containerPadding: margin, // null → uses margin
      containerWidth,
      cols: result.cols,
      rowHeight: result.rowHeight,
      maxRows: result.maxRows,
    });

    expect(Math.abs(result.colWidth - rglColWidth)).toBeLessThan(0.001);
  });

  it("#13c: hand-computed colWidth validates the formula", () => {
    // Hand computation for a known scenario:
    //   containerWidth = 1000, margin = [10, 10], containerPadding = [20, 20]
    //   targetCellWidth = 100
    //   availableWidth = max(1, 1000 - 20*2) = 960
    //   rawCols = floor(960 / 100) = 9, clamped to [6, 24] = 9
    //   colWidth = (1000 - 10*(9-1) - 20*2) / 9
    //            = (1000 - 80 - 40) / 9
    //            = 880 / 9
    //            ≈ 97.778
    const result = compute(1000, 800, {
      targetCellWidth: 100,
      margin: [10, 10],
      containerPadding: [20, 20],
    });
    expect(result.cols).toBe(9);
    expect(result.colWidth).toBeCloseTo(880 / 9, 2);
    // rowHeight = round(colWidth * 0.75) = round(97.778 * 0.75) = round(73.333) = 73
    expect(result.rowHeight).toBe(73);
  });
});

// ============================================================================
// maxRows Computation
// ============================================================================

describe("computeAdaptiveMetrics — maxRows", () => {
  it("#7: containerHeight=0 → maxRows=Infinity", () => {
    const result = compute(1200, 0);
    expect(result.maxRows).toBe(Infinity);
  });

  it("#8: containerHeight=800 uses computed rowHeight for maxRows", () => {
    const margin: [number, number] = [6, 6];
    const result = compute(1200, 800, { margin, containerPadding: null });

    // Verify maxRows formula: accounts for vertical padding (=margin when null)
    const effectivePadding = margin;
    const availableHeight = Math.max(0, 800 - effectivePadding[1] * 2);
    const expectedMaxRows = Math.floor(
      (availableHeight + margin[1]) / (result.rowHeight + margin[1])
    );

    expect(result.maxRows).toBe(expectedMaxRows);
  });

  it("#18: maxRows with vertical containerPadding subtracts padding", () => {
    const margin: [number, number] = [6, 6];

    const withPadding = compute(1200, 800, {
      margin,
      containerPadding: [10, 40], // large vertical padding
    });
    const withoutPadding = compute(1200, 800, {
      margin,
      containerPadding: [10, 0],
    });

    // More vertical padding → fewer rows
    expect(withPadding.maxRows).toBeLessThan(withoutPadding.maxRows);
  });
});

// ============================================================================
// Edge Cases / Degenerate Input
// ============================================================================

describe("computeAdaptiveMetrics — edge cases", () => {
  it("#6: containerWidth=0 → safe fallback", () => {
    const result = compute(0, 0);
    expect(result.cols).toBe(ADAPTIVE_DEFAULTS.minCols);
    expect(result.maxRows).toBe(Infinity);
    expect(result.rowHeight).toBeGreaterThanOrEqual(1);
    expect(result.colWidth).toBeGreaterThanOrEqual(1);
  });

  it("#6b: containerWidth=-100 → safe fallback", () => {
    const result = compute(-100, 500);
    expect(result.cols).toBe(ADAPTIVE_DEFAULTS.minCols);
    expect(result.colWidth).toBeGreaterThanOrEqual(1);
  });

  it("#9: targetCellWidth=0 → does not crash", () => {
    // targetCellWidth clamped to 1
    expect(() => compute(1200, 800, { targetCellWidth: 0 })).not.toThrow();
    const result = compute(1200, 800, { targetCellWidth: 0 });
    expect(result.cols).toBeGreaterThanOrEqual(1);
  });

  it("#9b: targetCellWidth=-50 → does not crash", () => {
    expect(() => compute(1200, 800, { targetCellWidth: -50 })).not.toThrow();
  });

  it("#10: minCols > maxCols → uses minCols", () => {
    const result = compute(1200, 800, { minCols: 20, maxCols: 5 });
    expect(result.cols).toBe(20);
  });

  it("#15b: cellAspectRatio=0 → clamped, rowHeight ≥ 1", () => {
    const result = compute(1200, 800, { cellAspectRatio: 0 });
    expect(result.rowHeight).toBeGreaterThanOrEqual(1);
  });

  it("#15c: cellAspectRatio=-1 → clamped, rowHeight ≥ 1", () => {
    const result = compute(1200, 800, { cellAspectRatio: -1 });
    expect(result.rowHeight).toBeGreaterThanOrEqual(1);
  });

  it("#15d: tiny container (20px, padding 20px) → does not crash", () => {
    const result = compute(20, 100, {
      containerPadding: [20, 20],
      margin: [6, 6],
    });
    expect(result.cols).toBe(ADAPTIVE_DEFAULTS.minCols);
    expect(result.colWidth).toBeGreaterThanOrEqual(1);
    expect(result.rowHeight).toBeGreaterThanOrEqual(1);
  });
});

// ============================================================================
// Defaults
// ============================================================================

describe("computeAdaptiveMetrics — defaults", () => {
  it("ADAPTIVE_DEFAULTS is frozen", () => {
    expect(Object.isFrozen(ADAPTIVE_DEFAULTS)).toBe(true);
  });

  it("empty options {} uses all defaults", () => {
    const withEmpty = compute(1200, 800, {});
    const withDefaults = compute(1200, 800, {
      targetCellWidth: 120,
      cellAspectRatio: 0.75,
      minCols: 6,
      maxCols: 24,
      margin: [6, 6],
      containerPadding: null,
    });
    expect(withEmpty).toEqual(withDefaults);
  });

  it("undefined adaptive options fall through to defaults", () => {
    const result = compute(1200, 800, {
      targetCellWidth: undefined,
      cellAspectRatio: undefined,
    });
    const defaultResult = compute(1200, 800);
    expect(result).toEqual(defaultResult);
  });
});

// ============================================================================
// Determinism
// ============================================================================

describe("computeAdaptiveMetrics — determinism", () => {
  it("same inputs produce identical outputs", () => {
    const a = compute(1920, 1080, { targetCellWidth: 120 });
    const b = compute(1920, 1080, { targetCellWidth: 120 });
    expect(a).toEqual(b);
  });

  it("different container sizes produce different metrics", () => {
    const small = compute(800, 600);
    const large = compute(2560, 1440);
    expect(small.cols).not.toBe(large.cols);
  });
});
