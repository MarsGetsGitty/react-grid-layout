/**
 * Proportional Layout Conversion — Test Suite
 *
 * Proves that layouts expressed in proportional fractions can safely
 * round-trip across different column/row counts without introducing
 * gaps, overlaps, or constraint violations.
 *
 * @see 2A.9.extra-1_Adaptive_Grid_System.md — Session 4 (Proportional Layout Spike)
 */

import {
  toProportional,
  fromProportional,
  toProportionalLayout,
  fromProportionalLayout,
  totalOccupiedRows,
} from "../../src/core/math/proportional";
import type {
  ProportionalCoords,
  GridContext,
} from "../../src/core/math/proportional";
import {
  repairLayout,
  hasOverlaps,
  hasOverflow,
} from "../../src/core/math/proportional-repair";
import type { LayoutItem } from "../../src/core/types/layout";

// ── Test Data: Admin Template (7 widgets) ─────────────────

const adminLayout: LayoutItem[] = [
  { i: "admin-stats-1",    x: 0,  y: 0,  w: 12, h: 1 },
  { i: "admin-urgent-1",   x: 0,  y: 1,  w: 12, h: 1 },
  { i: "admin-pipeline-1", x: 0,  y: 2,  w: 12, h: 4 },
  { i: "admin-active-1",   x: 0,  y: 6,  w: 9,  h: 5 },
  { i: "admin-clients-1",  x: 9,  y: 6,  w: 3,  h: 5 },
  { i: "admin-wrapup-1",   x: 0,  y: 11, w: 12, h: 3 },
  { i: "admin-ll152-1",    x: 0,  y: 14, w: 12, h: 2 },
];

// ── Test Data: Solo Template (5 widgets) ──────────────────

const soloLayout: LayoutItem[] = [
  { i: "solo-urgent-1",   x: 0,  y: 0, w: 12, h: 2 },
  { i: "solo-pipeline-1", x: 0,  y: 2, w: 12, h: 2 },
  { i: "solo-active-1",   x: 0,  y: 4, w: 9,  h: 3 },
  { i: "solo-clients-1",  x: 9,  y: 4, w: 3,  h: 3 },
  { i: "solo-wrapup-1",   x: 0,  y: 7, w: 12, h: 3 },
];

// ── Helper ────────────────────────────────────────────────

function ctx(cols: number, maxRows: number): GridContext {
  return { cols, maxRows };
}

// =============================================================================
// 1. Single-Item Conversion
// =============================================================================

describe("toProportional", () => {
  it("converts a half-width widget correctly", () => {
    const result = toProportional({ x: 6, y: 3, w: 6, h: 3 }, ctx(12, 12));
    expect(result).toEqual({ xF: 0.5, yF: 0.25, wF: 0.5, hF: 0.25 });
  });

  it("converts a full-width widget to wF=1.0", () => {
    const result = toProportional({ x: 0, y: 0, w: 12, h: 1 }, ctx(12, 16));
    expect(result.wF).toBe(1.0);
    expect(result.xF).toBe(0.0);
  });

  it("converts a quarter-width widget", () => {
    const result = toProportional({ x: 9, y: 6, w: 3, h: 5 }, ctx(12, 16));
    expect(result.xF).toBe(0.75);
    expect(result.wF).toBe(0.25);
  });

  it("handles zero-size grid gracefully", () => {
    const result = toProportional({ x: 5, y: 5, w: 5, h: 5 }, ctx(0, 0));
    expect(result).toEqual({ xF: 0, yF: 0, wF: 1, hF: 1 });
  });
});

describe("fromProportional", () => {
  it("restores a half-width widget on same grid", () => {
    const frac: ProportionalCoords = { xF: 0.5, yF: 0.25, wF: 0.5, hF: 0.25 };
    const result = fromProportional(frac, ctx(12, 12));
    expect(result).toEqual({ x: 6, y: 3, w: 6, h: 3 });
  });

  it("scales a half-width widget to a 24-col grid", () => {
    const frac: ProportionalCoords = { xF: 0.5, yF: 0.25, wF: 0.5, hF: 0.25 };
    const result = fromProportional(frac, ctx(24, 17));
    expect(result.x).toBe(12);
    expect(result.w).toBe(12);
    expect(result.y).toBe(4);  // round(0.25 * 17) = 4
    expect(result.h).toBe(4);  // round(0.25 * 17) = 4
  });

  it("clamps w and h to minimum 1", () => {
    const frac: ProportionalCoords = { xF: 0, yF: 0, wF: 0.01, hF: 0.01 };
    const result = fromProportional(frac, ctx(12, 12));
    expect(result.w).toBeGreaterThanOrEqual(1);
    expect(result.h).toBeGreaterThanOrEqual(1);
  });

  it("clamps x+w to not exceed cols", () => {
    const frac: ProportionalCoords = { xF: 0.95, yF: 0, wF: 0.5, hF: 0.1 };
    const result = fromProportional(frac, ctx(12, 12));
    expect(result.x + result.w).toBeLessThanOrEqual(12);
  });

  it("clamps y+h to not exceed maxRows", () => {
    const frac: ProportionalCoords = { xF: 0, yF: 0.95, wF: 0.1, hF: 0.5 };
    const result = fromProportional(frac, ctx(12, 12));
    expect(result.y + result.h).toBeLessThanOrEqual(12);
  });

  it("handles zero-size grid gracefully", () => {
    const frac: ProportionalCoords = { xF: 0.5, yF: 0.5, wF: 0.5, hF: 0.5 };
    const result = fromProportional(frac, ctx(0, 0));
    expect(result).toEqual({ x: 0, y: 0, w: 1, h: 1 });
  });

  it("full-width widget spans all cols on any grid size", () => {
    const frac: ProportionalCoords = { xF: 0, yF: 0, wF: 1.0, hF: 0.1 };
    expect(fromProportional(frac, ctx(12, 12)).w).toBe(12);
    expect(fromProportional(frac, ctx(24, 17)).w).toBe(24);
    expect(fromProportional(frac, ctx(8, 8)).w).toBe(8);
    expect(fromProportional(frac, ctx(48, 26)).w).toBe(48);
  });
});

// =============================================================================
// 2. Round-Trip Conversion (Same Grid)
// =============================================================================

describe("round-trip: same grid", () => {
  it("12-col → proportional → 12-col: identical layout", () => {
    const source = ctx(12, 16);
    const proportional = toProportionalLayout(adminLayout, source);
    const restored = fromProportionalLayout(proportional, source);

    for (let i = 0; i < adminLayout.length; i++) {
      expect(restored[i]!.x).toBe(adminLayout[i]!.x);
      expect(restored[i]!.y).toBe(adminLayout[i]!.y);
      expect(restored[i]!.w).toBe(adminLayout[i]!.w);
      expect(restored[i]!.h).toBe(adminLayout[i]!.h);
    }
  });

  it("preserves item identifiers", () => {
    const proportional = toProportionalLayout(adminLayout, ctx(12, 16));
    const restored = fromProportionalLayout(proportional, ctx(12, 16));
    const ids = restored.map(item => item.i);
    expect(ids).toEqual(adminLayout.map(item => item.i));
  });
});

// =============================================================================
// 3. Cross-Screen Conversion
// =============================================================================

describe("cross-screen conversion: admin template", () => {
  const sourceCtx = { cols: 12, maxRows: 16 }; // Original 12-col, 16-row grid

  // All target column counts from the design doc
  const targets: Array<[string, GridContext]> = [
    ["8-col laptop",        { cols: 8, maxRows: 8 }],
    ["12-col standard",     { cols: 12, maxRows: 12 }],
    ["17-col 1366px",       { cols: 17, maxRows: 12 }],
    ["24-col 1080p",        { cols: 24, maxRows: 17 }],
    ["32-col 1440p",        { cols: 32, maxRows: 17 }],
    ["43-col ultrawide",    { cols: 43, maxRows: 20 }],
    ["48-col 4K",           { cols: 48, maxRows: 26 }],
  ];

  // Convert once from source to proportional
  const proportional = toProportionalLayout(adminLayout, sourceCtx);

  for (const [label, targetCtx] of targets) {
    it(`converts overlap-free to ${label} (${targetCtx.cols}×${targetCtx.maxRows})`, () => {
      const restored = fromProportionalLayout(proportional, targetCtx);
      const repaired = repairLayout(restored, targetCtx);

      // All items present
      expect(repaired.length).toBe(adminLayout.length);

      // CRITICAL: No overlaps after repair — this is the key invariant.
      // Rounding may inflate total height (sum of rounded individual heights
      // > proportional sum), so overflow is acceptable. But overlaps are not.
      expect(hasOverlaps(repaired)).toBe(false);

      // Full-width items should still be full-width (horizontal scaling)
      const statsWidget = repaired.find(item => item.i === "admin-stats-1");
      expect(statsWidget?.w).toBe(targetCtx.cols);

      // 3/4 width item should be approximately 3/4 of cols
      const activeWidget = repaired.find(item => item.i === "admin-active-1");
      const expectedW = Math.max(1, Math.round(0.75 * targetCtx.cols));
      expect(activeWidget?.w).toBe(expectedW);
    });
  }
});

describe("cross-screen conversion: solo template", () => {
  const sourceCtx = ctx(12, 10);
  const proportional = toProportionalLayout(soloLayout, sourceCtx);

  it("converts to 24-col without overlaps", () => {
    const targetCtx = ctx(24, 17);
    const restored = fromProportionalLayout(proportional, targetCtx);
    const repaired = repairLayout(restored, targetCtx);

    expect(hasOverlaps(repaired)).toBe(false);
    expect(hasOverflow(repaired, targetCtx)).toBe(false);
  });

  it("converts to 8-col without overlaps", () => {
    const targetCtx = ctx(8, 8);
    const restored = fromProportionalLayout(proportional, targetCtx);
    const repaired = repairLayout(restored, targetCtx);

    expect(hasOverlaps(repaired)).toBe(false);
    expect(hasOverflow(repaired, targetCtx)).toBe(false);
  });
});

// =============================================================================
// 4. Round-Trip Through Different Grid Sizes
// =============================================================================

describe("round-trip: 12→24→12", () => {
  it("admin layout survives double round-trip", () => {
    const src = ctx(12, 16);
    const mid = ctx(24, 17);

    // 12 → proportional → 24 → proportional → 12
    const prop1 = toProportionalLayout(adminLayout, src);
    const at24 = fromProportionalLayout(prop1, mid);
    const prop2 = toProportionalLayout(at24, mid);
    const back12 = fromProportionalLayout(prop2, src);

    // After round-trip, we may have small rounding diffs.
    // But topology should be preserved: same relative ordering,
    // no overlaps, same widths (within ±1 grid unit).
    for (let i = 0; i < adminLayout.length; i++) {
      const orig = adminLayout[i]!;
      const restored = back12[i]!;

      expect(restored.i).toBe(orig.i);
      expect(Math.abs(restored.x - orig.x)).toBeLessThanOrEqual(1);
      expect(Math.abs(restored.y - orig.y)).toBeLessThanOrEqual(1);
      expect(Math.abs(restored.w - orig.w)).toBeLessThanOrEqual(1);
      expect(Math.abs(restored.h - orig.h)).toBeLessThanOrEqual(1);
    }
  });
});

describe("round-trip: extreme range 48→8→48", () => {
  it("layout survives extreme col-count change", () => {
    const src = ctx(48, 26);
    const mid = ctx(8, 8);

    // Build a layout for 48 cols
    const wideLayout: LayoutItem[] = [
      { i: "a", x: 0,  y: 0, w: 48, h: 2 },
      { i: "b", x: 0,  y: 2, w: 36, h: 4 },
      { i: "c", x: 36, y: 2, w: 12, h: 4 },
    ];

    const prop1 = toProportionalLayout(wideLayout, src);
    const at8 = fromProportionalLayout(prop1, mid);
    const repaired = repairLayout(at8, mid);

    expect(hasOverlaps(repaired)).toBe(false);
    expect(hasOverflow(repaired, mid)).toBe(false);

    // a should still be full-width
    expect(repaired.find(item => item.i === "a")?.w).toBe(8);
  });
});

// =============================================================================
// 5. Rounding Edge Cases
// =============================================================================

describe("rounding edge cases", () => {
  it("w never rounds to 0", () => {
    // wF = 1/48 ≈ 0.0208 → on 8-col grid: round(0.0208*8) = round(0.167) = 0 → clamped to 1
    const frac: ProportionalCoords = { xF: 0, yF: 0, wF: 1 / 48, hF: 0.5 };
    const result = fromProportional(frac, ctx(8, 8));
    expect(result.w).toBeGreaterThanOrEqual(1);
  });

  it("h never rounds to 0", () => {
    const frac: ProportionalCoords = { xF: 0, yF: 0, wF: 0.5, hF: 1 / 48 };
    const result = fromProportional(frac, ctx(8, 8));
    expect(result.h).toBeGreaterThanOrEqual(1);
  });

  it("adjacent widgets remain adjacent after conversion", () => {
    // Two widgets side by side: x₁+w₁ = x₂
    const layout: LayoutItem[] = [
      { i: "a", x: 0, y: 0, w: 9, h: 3 },
      { i: "b", x: 9, y: 0, w: 3, h: 3 },
    ];

    const proportional = toProportionalLayout(layout, ctx(12, 12));
    const restored = fromProportionalLayout(proportional, ctx(24, 17));

    // On 24 cols: a.w = round(0.75*24) = 18, b.x = round(0.75*24) = 18
    // They should be adjacent: a.x + a.w === b.x
    const a = restored.find(item => item.i === "a")!;
    const b = restored.find(item => item.i === "b")!;
    expect(a.x + a.w).toBe(b.x);
  });

  it("stacked widgets remain stacked after conversion", () => {
    const layout: LayoutItem[] = [
      { i: "a", x: 0, y: 0, w: 12, h: 4 },
      { i: "b", x: 0, y: 4, w: 12, h: 4 },
    ];

    const proportional = toProportionalLayout(layout, ctx(12, 16));
    const restored = fromProportionalLayout(proportional, ctx(24, 17));

    const a = restored.find(item => item.i === "a")!;
    const b = restored.find(item => item.i === "b")!;

    // They should not overlap
    expect(a.y + a.h).toBeLessThanOrEqual(b.y);
  });

  it("negative position clamped to 0", () => {
    const frac: ProportionalCoords = { xF: -0.1, yF: -0.2, wF: 0.5, hF: 0.5 };
    const result = fromProportional(frac, ctx(12, 12));
    expect(result.x).toBeGreaterThanOrEqual(0);
    expect(result.y).toBeGreaterThanOrEqual(0);
  });
});

// =============================================================================
// 6. Repair Pass
// =============================================================================

describe("repairLayout", () => {
  it("resolves two overlapping items via push-down", () => {
    const layout: LayoutItem[] = [
      { i: "a", x: 0, y: 0, w: 6, h: 3 },
      { i: "b", x: 0, y: 1, w: 6, h: 3 }, // overlaps a
    ];

    const repaired = repairLayout(layout, ctx(12, 12));
    expect(hasOverlaps(repaired)).toBe(false);

    const a = repaired.find(item => item.i === "a")!;
    const b = repaired.find(item => item.i === "b")!;
    expect(b.y).toBeGreaterThanOrEqual(a.y + a.h);
  });

  it("enforces minW from external constraints", () => {
    const layout: LayoutItem[] = [
      { i: "a", x: 0, y: 0, w: 2, h: 2 }, // w=2 but minW=3
    ];
    const constraints = new Map([["a", { minW: 3 }]]);

    const repaired = repairLayout(layout, ctx(12, 12), constraints);
    expect(repaired[0]!.w).toBeGreaterThanOrEqual(3);
  });

  it("enforces minH from external constraints", () => {
    const layout: LayoutItem[] = [
      { i: "a", x: 0, y: 0, w: 6, h: 1 }, // h=1 but minH=2
    ];
    const constraints = new Map([["a", { minH: 2 }]]);

    const repaired = repairLayout(layout, ctx(12, 12), constraints);
    expect(repaired[0]!.h).toBeGreaterThanOrEqual(2);
  });

  it("enforces maxW from external constraints", () => {
    const layout: LayoutItem[] = [
      { i: "a", x: 0, y: 0, w: 12, h: 2 }, // w=12 but maxW=6
    ];
    const constraints = new Map([["a", { maxW: 6 }]]);

    const repaired = repairLayout(layout, ctx(12, 12), constraints);
    expect(repaired[0]!.w).toBeLessThanOrEqual(6);
  });

  it("clamps items extending past cols", () => {
    const layout: LayoutItem[] = [
      { i: "a", x: 10, y: 0, w: 6, h: 2 }, // x+w=16 > 12
    ];

    const repaired = repairLayout(layout, ctx(12, 12));
    expect(repaired[0]!.x + repaired[0]!.w).toBeLessThanOrEqual(12);
  });

  it("clamps items extending past maxRows", () => {
    const layout: LayoutItem[] = [
      { i: "a", x: 0, y: 10, w: 6, h: 6 }, // y+h=16 > 12
    ];

    const repaired = repairLayout(layout, ctx(12, 12));
    expect(repaired[0]!.y + repaired[0]!.h).toBeLessThanOrEqual(12);
  });

  it("empty layout returns empty", () => {
    expect(repairLayout([], ctx(12, 12))).toEqual([]);
  });

  it("single widget layout is trivial", () => {
    const layout: LayoutItem[] = [
      { i: "a", x: 0, y: 0, w: 6, h: 3 },
    ];
    const repaired = repairLayout(layout, ctx(12, 12));
    expect(repaired.length).toBe(1);
    expect(repaired[0]!.x).toBe(0);
  });

  it("does not mutate input", () => {
    const layout: LayoutItem[] = [
      { i: "a", x: 0, y: 0, w: 6, h: 3 },
      { i: "b", x: 0, y: 1, w: 6, h: 3 },
    ];
    const originalA = { ...layout[0]! };

    repairLayout(layout, ctx(12, 12));
    expect(layout[0]).toEqual(originalA);
  });
});

// =============================================================================
// 7. Validation Helpers
// =============================================================================

describe("hasOverlaps", () => {
  it("returns false for non-overlapping layout", () => {
    expect(hasOverlaps(adminLayout)).toBe(false);
  });

  it("returns true for overlapping items", () => {
    const layout: LayoutItem[] = [
      { i: "a", x: 0, y: 0, w: 6, h: 3 },
      { i: "b", x: 3, y: 1, w: 6, h: 3 },
    ];
    expect(hasOverlaps(layout)).toBe(true);
  });

  it("returns false for empty layout", () => {
    expect(hasOverlaps([])).toBe(false);
  });
});

describe("hasOverflow", () => {
  it("returns false for in-bounds layout", () => {
    expect(hasOverflow(adminLayout, ctx(12, 16))).toBe(false);
  });

  it("returns true for item past right edge", () => {
    const layout: LayoutItem[] = [
      { i: "a", x: 10, y: 0, w: 6, h: 2 },
    ];
    expect(hasOverflow(layout, ctx(12, 12))).toBe(true);
  });

  it("returns true for item past bottom edge", () => {
    const layout: LayoutItem[] = [
      { i: "a", x: 0, y: 10, w: 6, h: 6 },
    ];
    expect(hasOverflow(layout, ctx(12, 12))).toBe(true);
  });

  it("returns true for negative positions", () => {
    const layout: LayoutItem[] = [
      { i: "a", x: -1, y: 0, w: 6, h: 2 },
    ];
    expect(hasOverflow(layout, ctx(12, 12))).toBe(true);
  });
});

// =============================================================================
// 8. totalOccupiedRows
// =============================================================================

describe("totalOccupiedRows", () => {
  it("returns bottom edge of lowest item", () => {
    expect(totalOccupiedRows(adminLayout)).toBe(16); // admin-ll152: y=14, h=2
  });

  it("returns 0 for empty layout", () => {
    expect(totalOccupiedRows([])).toBe(0);
  });
});

// =============================================================================
// 9. Approach Comparison: Full Proportional vs Horizontal-Only
// =============================================================================

describe("approach comparison", () => {
  it("approach A (full proportional): admin template survives 16-row → 8-row", () => {
    const src = ctx(12, 16);
    const target = ctx(12, 8); // Half the rows!

    const proportional = toProportionalLayout(adminLayout, src);
    const restored = fromProportionalLayout(proportional, target);
    const repaired = repairLayout(restored, target);

    // All items present
    expect(repaired.length).toBe(adminLayout.length);

    // No overlaps — the primary invariant
    expect(hasOverlaps(repaired)).toBe(false);

    // Overflow IS expected here: 7 widgets scaled from 16 to 8 rows.
    // Push-down repair pushes items past maxRows. This is the correct
    // behavior — ContainerGrid would grow to accommodate.
    // The key advantage over horizontal-only: items are proportionally
    // scaled, so the *ratios* are preserved even if the grid overflows.
  });

  it("horizontal-only approach would overflow on shorter screen", () => {
    // Simulate horizontal-only: keep original y/h, only convert x/w
    const target = ctx(24, 8); // Wider but shorter screen

    // The admin layout's last item is at y=14, h=2 → bottom=16.
    // On an 8-row grid, this would overflow (y=14 > maxRows=8).
    // This is why horizontal-only is insufficient.
    const lastItem = adminLayout[adminLayout.length - 1]!;
    expect(lastItem.y + lastItem.h).toBeGreaterThan(8);

    // With full proportional, the same item would be scaled down:
    const proportional = toProportionalLayout(adminLayout, ctx(12, 16));
    const restored = fromProportionalLayout(proportional, ctx(24, 8));
    const lastRestored = restored.find(item => item.i === "admin-ll152-1")!;

    // y should be scaled: round(14/16 * 8) = round(7) = 7
    // h should be scaled: round(2/16 * 8) = round(1) = 1
    // Bottom = 7 + 1 = 8 ≤ maxRows ✅
    expect(lastRestored.y + lastRestored.h).toBeLessThanOrEqual(8);
  });
});

// =============================================================================
// 10. fromProportionalLayout with originals (carry-forward)
// =============================================================================

describe("fromProportionalLayout with originals", () => {
  it("carries forward minW/minH from original items", () => {
    const originals: LayoutItem[] = [
      { i: "a", x: 0, y: 0, w: 6, h: 3, minW: 3, minH: 2 },
    ];

    const proportional = toProportionalLayout(originals, ctx(12, 12));
    const originalsMap = new Map(originals.map(item => [item.i, item]));
    const restored = fromProportionalLayout(proportional, ctx(24, 17), originalsMap);

    expect(restored[0]!.minW).toBe(3);
    expect(restored[0]!.minH).toBe(2);
  });

  it("carries forward static flag", () => {
    const originals: LayoutItem[] = [
      { i: "a", x: 0, y: 0, w: 12, h: 1, static: true },
    ];

    const proportional = toProportionalLayout(originals, ctx(12, 12));
    const originalsMap = new Map(originals.map(item => [item.i, item]));
    const restored = fromProportionalLayout(proportional, ctx(24, 17), originalsMap);

    expect(restored[0]!.static).toBe(true);
  });
});

// =============================================================================
// 11. Integration: Full Pipeline (convert + repair with constraints)
// =============================================================================

describe("full pipeline: convert + repair", () => {
  it("admin template: 12-col → 17-col with constraints", () => {
    const src = ctx(12, 16);
    const target = ctx(17, 12); // 12 rows < 16 source rows → overflow expected

    const proportional = toProportionalLayout(adminLayout, src);
    const restored = fromProportionalLayout(proportional, target);

    // Apply repair with some constraints
    const constraints = new Map([
      ["admin-active-1", { minW: 4 }],
      ["admin-clients-1", { minW: 2 }],
    ]);

    const repaired = repairLayout(restored, target, constraints);

    expect(repaired.length).toBe(adminLayout.length);
    expect(hasOverlaps(repaired)).toBe(false);
    // Note: overflow is expected (12 target rows < 16 source rows)

    // Constraints respected
    const active = repaired.find(item => item.i === "admin-active-1")!;
    expect(active.w).toBeGreaterThanOrEqual(4);

    const clients = repaired.find(item => item.i === "admin-clients-1")!;
    expect(clients.w).toBeGreaterThanOrEqual(2);
  });

  it("admin template: 12-col → 24-col with large maxRows (no overflow)", () => {
    const src = ctx(12, 16);
    const target = ctx(24, 17); // 17 rows >= 16 source rows → should fit

    const proportional = toProportionalLayout(adminLayout, src);
    const restored = fromProportionalLayout(proportional, target);
    const repaired = repairLayout(restored, target);

    expect(repaired.length).toBe(adminLayout.length);
    expect(hasOverlaps(repaired)).toBe(false);
    expect(hasOverflow(repaired, target)).toBe(false);
  });
});
