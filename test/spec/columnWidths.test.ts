/**
 * columnWidths.test.ts — Tests for unequal column width support.
 *
 * Validates:
 * 1. Per-column width calculations with columnWidths fractions
 * 2. Position calculations at cumulative column boundaries
 * 3. Drag snapping to correct columns (calcXY)
 * 4. Resize column counting (calcWH)
 * 5. Cell dimensions (calcGridCellDimensions) with columnWidths
 * 6. Regression: all functions behave identically when columnWidths absent
 *
 * @see implementation_plan.md — Part 1 + Part 1c
 */


import {
  calcGridColWidth,
  calcGridItemPosition,
  calcXY,
  calcXYRaw,
  calcWH,
  calcWHRaw,
  calcGridCellDimensions,
  type PositionParams,
} from "../../src/core/math/calculate";

// ── Test Fixtures ──────────────────────────────────────────

/** Standard equal-width params (existing behavior baseline) */
const equalParams: PositionParams = {
  cols: 2,
  containerWidth: 1000,
  margin: [10, 10] as const,
  containerPadding: [10, 10] as const,
  rowHeight: 30,
  maxRows: Infinity,
};

/** 65/35 weighted-left profile */
const weightedParams: PositionParams = {
  ...equalParams,
  columnWidths: [0.65, 0.35],
};

/** 20/60/20 wide-center profile (3 cols) */
const wideCenterParams: PositionParams = {
  cols: 3,
  containerWidth: 1000,
  margin: [10, 10] as const,
  containerPadding: [10, 10] as const,
  rowHeight: 30,
  maxRows: Infinity,
  columnWidths: [0.20, 0.60, 0.20],
};

// Usable width = containerWidth - 2*padding - (cols-1)*margin
// For 2 cols: 1000 - 20 - 10 = 970
// For 3 cols: 1000 - 20 - 20 = 960

// ── Regression Tests ───────────────────────────────────────

describe("columnWidths regression (absent = identical to today)", () => {
  it("calcGridColWidth returns equal division", () => {
    const result = calcGridColWidth(equalParams);
    // usableWidth = 970, cols = 2 → 485
    expect(result).toBe(485);
  });

  it("calcGridColWidth ignores colIndex when no columnWidths", () => {
    expect(calcGridColWidth(equalParams, 0)).toBe(calcGridColWidth(equalParams, 1));
  });

  it("calcGridItemPosition produces identical results", () => {
    const pos = calcGridItemPosition(equalParams, 1, 0, 1, 2);
    // left = (485 + 10) * 1 + 10 = 505
    expect(pos.left).toBe(505);
    // width = calcGridItemWHPx(1, 485, 10) = 485
    expect(pos.width).toBe(485);
  });

  it("calcXY snaps correctly with equal columns", () => {
    const { x, y } = calcXY(equalParams, 10, 505, 1, 1);
    expect(x).toBe(1);
    expect(y).toBe(0);
  });
});

// ── calcGridColWidth with columnWidths ─────────────────────

describe("calcGridColWidth with columnWidths", () => {
  it("returns per-column widths for 65/35 split", () => {
    // usableWidth = 970
    const col0 = calcGridColWidth(weightedParams, 0);
    const col1 = calcGridColWidth(weightedParams, 1);
    expect(col0).toBeCloseTo(970 * 0.65, 5); // 630.5
    expect(col1).toBeCloseTo(970 * 0.35, 5); // 339.5
  });

  it("returns per-column widths for 20/60/20 split", () => {
    // usableWidth = 960
    const col0 = calcGridColWidth(wideCenterParams, 0);
    const col1 = calcGridColWidth(wideCenterParams, 1);
    const col2 = calcGridColWidth(wideCenterParams, 2);
    expect(col0).toBeCloseTo(960 * 0.20, 5); // 192
    expect(col1).toBeCloseTo(960 * 0.60, 5); // 576
    expect(col2).toBeCloseTo(960 * 0.20, 5); // 192
  });

  it("default colIndex=0 returns column 0 width", () => {
    expect(calcGridColWidth(weightedParams)).toBeCloseTo(970 * 0.65, 5);
  });
});

// ── calcGridItemPosition with columnWidths ─────────────────

describe("calcGridItemPosition with columnWidths", () => {
  it("positions widget at column 0 correctly", () => {
    const pos = calcGridItemPosition(weightedParams, 0, 0, 1, 1);
    expect(pos.left).toBe(10); // containerPadding
  });

  it("positions widget at column 1 with cumulative offset", () => {
    const pos = calcGridItemPosition(weightedParams, 1, 0, 1, 1);
    // col0Width = 630.5, left = padding + col0Width + margin = 10 + 630.5 + 10 = 650.5
    const expectedLeft = Math.round(10 + 970 * 0.65 + 10);
    expect(pos.left).toBe(expectedLeft);
  });

  it("width at column 0 uses column 0 fraction", () => {
    const pos = calcGridItemPosition(weightedParams, 0, 0, 1, 1);
    // width spans from calcColumnLeft(0) to calcColumnLeft(1) minus margin
    // = 650.5 - 10 - 10 = 630.5 → rounds appropriately
    expect(pos.width).toBeGreaterThan(600);
    expect(pos.width).toBeLessThan(660);
  });

  it("width at column 1 uses column 1 fraction (narrower)", () => {
    const pos = calcGridItemPosition(weightedParams, 1, 0, 1, 1);
    // narrower column
    expect(pos.width).toBeGreaterThan(300);
    expect(pos.width).toBeLessThan(370);
  });

  it("vertical positioning is unaffected by columnWidths", () => {
    const equalPos = calcGridItemPosition(equalParams, 0, 3, 1, 2);
    const weightedPos = calcGridItemPosition(weightedParams, 0, 3, 1, 2);
    expect(weightedPos.top).toBe(equalPos.top);
    expect(weightedPos.height).toBe(equalPos.height);
  });
});

// ── calcXY with columnWidths ───────────────────────────────

describe("calcXY with columnWidths", () => {
  it("snaps to column 0 when cursor is at the left edge", () => {
    const { x } = calcXY(weightedParams, 10, 10, 1, 1);
    expect(x).toBe(0);
  });

  it("snaps to column 1 when cursor is past column boundary", () => {
    // Column 1 left edge = 10 + 630.5 + 10 = 650.5
    // Cursor well past boundary
    const { x } = calcXY(weightedParams, 10, 700, 1, 1);
    expect(x).toBe(1);
  });

  it("clamps to cols - w", () => {
    const { x } = calcXY(weightedParams, 10, 9999, 1, 1);
    expect(x).toBe(1); // cols=2, w=1, max x=1
  });

  it("calcXYRaw returns unclamped column index", () => {
    const { x } = calcXYRaw(weightedParams, 10, 10);
    expect(x).toBe(0);
  });
});

// ── calcWH with columnWidths ───────────────────────────────

describe("calcWH with columnWidths", () => {
  it("returns w=1 for a width matching column 0", () => {
    const col0Width = 970 * 0.65;
    const { w } = calcWH(weightedParams, col0Width, 30, 0, 0, "se");
    expect(w).toBe(1);
  });

  it("returns w=2 for width spanning both columns from x=0", () => {
    // Full width of both columns plus margin between them
    const fullWidth = 970 * 0.65 + 10 + 970 * 0.35;
    const { w } = calcWH(weightedParams, fullWidth, 30, 0, 0, "se");
    expect(w).toBe(2);
  });

  it("vertical h calculation is unchanged", () => {
    const equalResult = calcWH(equalParams, 100, 70, 0, 0, "se");
    const weightedResult = calcWH(weightedParams, 100, 70, 0, 0, "se");
    expect(weightedResult.h).toBe(equalResult.h);
  });
});

// ── calcWHRaw with columnWidths ────────────────────────────

describe("calcWHRaw with columnWidths", () => {
  it("returns w=1 minimum", () => {
    const { w } = calcWHRaw(weightedParams, 10, 30);
    expect(w).toBe(1);
  });
});

// ── calcGridCellDimensions with columnWidths ───────────────

describe("calcGridCellDimensions with columnWidths", () => {
  it("returns cellWidths array when columnWidths provided", () => {
    const dims = calcGridCellDimensions({
      width: 1000,
      cols: 2,
      rowHeight: 30,
      margin: [10, 10],
      containerPadding: [10, 10],
      columnWidths: [0.65, 0.35],
    });
    expect(dims.cellWidths).toBeDefined();
    expect(dims.cellWidths!.length).toBe(2);
    expect(dims.cellWidths![0]).toBeCloseTo(970 * 0.65, 5);
    expect(dims.cellWidths![1]).toBeCloseTo(970 * 0.35, 5);
  });

  it("cellWidth returns column 0 width for backward compat", () => {
    const dims = calcGridCellDimensions({
      width: 1000,
      cols: 2,
      rowHeight: 30,
      margin: [10, 10],
      containerPadding: [10, 10],
      columnWidths: [0.65, 0.35],
    });
    expect(dims.cellWidth).toBeCloseTo(970 * 0.65, 5);
  });

  it("does not return cellWidths when columnWidths absent", () => {
    const dims = calcGridCellDimensions({
      width: 1000,
      cols: 2,
      rowHeight: 30,
      margin: [10, 10],
      containerPadding: [10, 10],
    });
    expect(dims.cellWidths).toBeUndefined();
    expect(dims.cellWidth).toBeCloseTo(485, 5);
  });

  it("handles 3-column wide-center profile", () => {
    const dims = calcGridCellDimensions({
      width: 1000,
      cols: 3,
      rowHeight: 30,
      margin: [10, 10],
      containerPadding: [10, 10],
      columnWidths: [0.20, 0.60, 0.20],
    });
    expect(dims.cellWidths!.length).toBe(3);
    expect(dims.cellWidths![0]).toBeCloseTo(960 * 0.20, 5);
    expect(dims.cellWidths![1]).toBeCloseTo(960 * 0.60, 5);
    expect(dims.cellWidths![2]).toBeCloseTo(960 * 0.20, 5);
  });
});
