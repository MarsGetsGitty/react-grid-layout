/**
 * PhysicsEngine integration tests
 *
 * Tests the engine facade's orchestration and immutability invariant.
 * Each test verifies a specific pipeline from the implementation plan.
 *
 * Risk references map to risk_analysis.md:
 * - R1: In-place mutation corrupts caller data
 * - R2: preventCollision revert returns same reference
 * - R3: correctBounds destructive w = cols side effect
 * - R4: Null-compact position swap mutates both items
 */

import { createPhysicsEngine } from "../../src/core/engine.js";
import {
  verticalCompactor,
  noCompactor,
  cloneLayout
} from "../../src/core/index.js";
import type { Layout, LayoutItem } from "../../src/core/index.js";

// =============================================================================
// Helpers
// =============================================================================

/** Create a simple layout item */
function item(
  i: string,
  x: number,
  y: number,
  w: number,
  h: number,
  opts?: Partial<LayoutItem>
): LayoutItem {
  return { i, x, y, w, h, static: false, moved: false, ...opts };
}

/** Deep-freeze a layout to catch any mutation attempts */
function deepFreeze(layout: Layout): Layout {
  Object.freeze(layout);
  for (const l of layout) {
    if (l !== undefined) Object.freeze(l);
  }
  return layout;
}

// =============================================================================
// Tests
// =============================================================================

describe("PhysicsEngine", () => {
  const engine = createPhysicsEngine({
    cols: 12,
    compactor: verticalCompactor,
  });

  // -------------------------------------------------------------------------
  // initializeLayout
  // -------------------------------------------------------------------------

  describe("initializeLayout", () => {
    it("clamps out-of-bounds items (test 1)", () => {
      const layout: Layout = [
        item("a", 11, 0, 4, 2), // x + w = 15 > 12, should clamp
      ];

      const result = engine.initializeLayout(layout);
      const a = result.find(l => l.i === "a");

      expect(a).toBeDefined();
      expect(a!.x + a!.w).toBeLessThanOrEqual(12);
    });

    it("does NOT mutate the input layout (test 2, R1)", () => {
      const layout: Layout = deepFreeze([
        item("a", 0, 5, 2, 2),
        item("b", 0, 10, 2, 2),
      ]);

      // Should not throw — engine clones internally
      const result = engine.initializeLayout(layout);

      // Original is untouched
      expect(layout[0]!.y).toBe(5);
      expect(layout[1]!.y).toBe(10);

      // Result is compacted (items moved up)
      expect(result).not.toBe(layout);
    });

    it("negative-x item gets w = cols (test 3, R3)", () => {
      const layout: Layout = [
        item("a", -1, 0, 2, 2), // x < 0 triggers destructive clamping
      ];

      const result = engine.initializeLayout(layout);
      const a = result.find(l => l.i === "a");

      expect(a).toBeDefined();
      expect(a!.x).toBe(0);
      expect(a!.w).toBe(12); // w gets set to cols
    });
  });

  // -------------------------------------------------------------------------
  // moveItem
  // -------------------------------------------------------------------------

  describe("moveItem", () => {
    it("basic move + compact (test 4)", () => {
      const layout: Layout = [
        item("a", 0, 0, 2, 2),
        item("b", 2, 0, 2, 2),
      ];

      const result = engine.moveItem(layout, "a", 4, 0);
      const a = result.find(l => l.i === "a");

      expect(a).toBeDefined();
      expect(a!.x).toBe(4);
      expect(a!.y).toBe(0);
    });

    it("does NOT mutate the input layout (test 5, R1)", () => {
      const layout: Layout = deepFreeze([
        item("a", 0, 0, 2, 2),
        item("b", 2, 0, 2, 2),
      ]);

      // Should not throw — engine clones internally
      const result = engine.moveItem(layout, "a", 4, 0);

      // Original is untouched
      expect(layout[0]!.x).toBe(0);
      expect(layout[0]!.y).toBe(0);

      // Result is different
      expect(result).not.toBe(layout);
    });

    it("collision cascading displaces other items (test 6)", () => {
      const layout: Layout = [
        item("a", 0, 0, 2, 2),
        item("b", 2, 0, 2, 2),
      ];

      // Move A onto B's position
      const result = engine.moveItem(layout, "a", 2, 0);
      const a = result.find(l => l.i === "a");
      const b = result.find(l => l.i === "b");

      expect(a).toBeDefined();
      expect(b).toBeDefined();

      // A should be at the requested position
      expect(a!.x).toBe(2);
      expect(a!.y).toBe(0);

      // B should have been displaced (moved away from A)
      // It shouldn't overlap with A
      const aRight = a!.x + a!.w;
      const bRight = b!.x + b!.w;
      const aBottom = a!.y + a!.h;
      const bBottom = b!.y + b!.h;

      const overlapsX = a!.x < bRight && aRight > b!.x;
      const overlapsY = a!.y < bBottom && aBottom > b!.y;

      expect(overlapsX && overlapsY).toBe(false);
    });

    it("preventCollision blocks movement (test 7, R2)", () => {
      const preventEngine = createPhysicsEngine({
        cols: 12,
        compactor: verticalCompactor,
        preventCollision: true,
      });

      const layout: Layout = [
        item("a", 0, 0, 2, 2),
        item("b", 2, 0, 2, 2),
      ];

      // Try to move A onto B — should be blocked
      const result = preventEngine.moveItem(layout, "a", 2, 0);
      const a = result.find(l => l.i === "a");

      expect(a).toBeDefined();
      // Item should stay at original position (move was rejected)
      expect(a!.x).toBe(0);
      expect(a!.y).toBe(0);
    });

    it("noCompactor collision triggers position swap (test 8, R4)", () => {
      const freeEngine = createPhysicsEngine({
        cols: 12,
        compactor: noCompactor,
      });

      const layout: Layout = [
        item("a", 0, 0, 2, 2),
        item("b", 0, 2, 2, 2),
      ];

      // Move A down onto B (with no compaction)
      const result = freeEngine.moveItem(layout, "a", 0, 2);
      const a = result.find(l => l.i === "a");
      const b = result.find(l => l.i === "b");

      expect(a).toBeDefined();
      expect(b).toBeDefined();

      // Items should not overlap
      const overlapsX = a!.x < b!.x + b!.w && a!.x + a!.w > b!.x;
      const overlapsY = a!.y < b!.y + b!.h && a!.y + a!.h > b!.y;

      expect(overlapsX && overlapsY).toBe(false);

      // Input should not be mutated
      expect(layout[0]!.x).toBe(0);
      expect(layout[0]!.y).toBe(0);
    });

    it("returns cloned layout when item not found", () => {
      const layout: Layout = [item("a", 0, 0, 2, 2)];
      const result = engine.moveItem(layout, "nonexistent", 5, 5);

      expect(result).not.toBe(layout);
      expect(result).toHaveLength(1);
      expect(result[0]!.i).toBe("a");
    });
  });

  // -------------------------------------------------------------------------
  // resizeItem
  // -------------------------------------------------------------------------

  describe("resizeItem", () => {
    it("basic resize + compact (test 9)", () => {
      const layout: Layout = [
        item("a", 0, 0, 2, 2),
        item("b", 2, 0, 2, 2),
      ];

      const result = engine.resizeItem(layout, "a", 4, 3);
      const a = result.find(l => l.i === "a");

      expect(a).toBeDefined();
      expect(a!.w).toBe(4);
      expect(a!.h).toBe(3);
    });

    it("preventCollision rejects colliding resize (test 10, R2)", () => {
      const preventEngine = createPhysicsEngine({
        cols: 12,
        compactor: verticalCompactor,
        preventCollision: true,
      });

      const layout: Layout = [
        item("a", 0, 0, 2, 2),
        item("b", 3, 0, 2, 2), // Gap of 1 column between A and B
      ];

      // Try to resize A to width 4 — would overlap B at x=3
      const result = preventEngine.resizeItem(layout, "a", 4, 2);
      const a = result.find(l => l.i === "a");

      expect(a).toBeDefined();
      // Resize should be rejected — original dimensions preserved
      expect(a!.w).toBe(2);
      expect(a!.h).toBe(2);
    });

    it("position change triggers moveElement cascade (test 11)", () => {
      const layout: Layout = [
        item("a", 0, 0, 2, 2),
        item("b", 0, 2, 2, 2),
      ];

      // Resize A and also reposition it onto B
      const result = engine.resizeItem(layout, "a", 3, 3, 0, 1);
      const a = result.find(l => l.i === "a");
      const b = result.find(l => l.i === "b");

      expect(a).toBeDefined();
      expect(b).toBeDefined();

      // A should have the new dimensions
      expect(a!.w).toBe(3);
      expect(a!.h).toBe(3);

      // They should not overlap
      const overlapsX = a!.x < b!.x + b!.w && a!.x + a!.w > b!.x;
      const overlapsY = a!.y < b!.y + b!.h && a!.y + a!.h > b!.y;

      expect(overlapsX && overlapsY).toBe(false);
    });
  });

  // -------------------------------------------------------------------------
  // addItem
  // -------------------------------------------------------------------------

  describe("addItem", () => {
    it("deduplicates existing IDs (test 12)", () => {
      const layout: Layout = [
        item("a", 0, 0, 2, 2),
        item("b", 2, 0, 2, 2),
      ];

      // Add a new "a" — should replace the old one
      const result = engine.addItem(layout, item("a", 4, 0, 3, 3));

      // Only one "a" should exist
      const aItems = result.filter(l => l.i === "a");
      expect(aItems).toHaveLength(1);
      expect(aItems[0]!.w).toBe(3);
      expect(aItems[0]!.h).toBe(3);

      // Total should still be 2
      expect(result).toHaveLength(2);
    });

    it("appends and compacts (test 13)", () => {
      const layout: Layout = [
        item("a", 0, 0, 2, 2),
      ];

      const result = engine.addItem(layout, item("c", 0, 10, 2, 2));

      expect(result).toHaveLength(2);

      // New item should be compacted upward
      const c = result.find(l => l.i === "c");
      expect(c).toBeDefined();
      expect(c!.y).toBeLessThanOrEqual(10); // compacted up from y=10
    });

    it("does NOT mutate the input layout", () => {
      const layout: Layout = deepFreeze([item("a", 0, 0, 2, 2)]);

      // Should not throw
      const result = engine.addItem(layout, item("b", 0, 0, 2, 2));
      expect(result).not.toBe(layout);
    });
  });

  // -------------------------------------------------------------------------
  // removeItem
  // -------------------------------------------------------------------------

  describe("removeItem", () => {
    it("removes and compacts to fill gaps (test 14)", () => {
      const layout: Layout = [
        item("a", 0, 0, 2, 2),
        item("b", 0, 2, 2, 2), // directly below A
        item("c", 0, 4, 2, 2), // directly below B
      ];

      // Remove B — C should compact up to fill the gap
      const result = engine.removeItem(layout, "b");

      expect(result).toHaveLength(2);
      expect(result.find(l => l.i === "b")).toBeUndefined();

      const c = result.find(l => l.i === "c");
      expect(c).toBeDefined();
      expect(c!.y).toBe(2); // compacted up from y=4 to y=2
    });

    it("does NOT mutate the input layout", () => {
      const layout: Layout = deepFreeze([
        item("a", 0, 0, 2, 2),
        item("b", 0, 2, 2, 2),
      ]);

      const result = engine.removeItem(layout, "b");
      expect(result).not.toBe(layout);
      expect(layout).toHaveLength(2); // original unchanged
    });
  });

  // -------------------------------------------------------------------------
  // Convenience methods
  // -------------------------------------------------------------------------

  describe("convenience methods", () => {
    it("bottom returns highest occupied row", () => {
      const layout: Layout = [
        item("a", 0, 0, 2, 2),
        item("b", 0, 5, 2, 3),
      ];

      expect(engine.bottom(layout)).toBe(8); // 5 + 3
    });

    it("getItem finds item by id", () => {
      const layout: Layout = [
        item("a", 0, 0, 2, 2),
        item("b", 2, 0, 2, 2),
      ];

      const found = engine.getItem(layout, "b");
      expect(found).toBeDefined();
      expect(found!.i).toBe("b");
      expect(found!.x).toBe(2);
    });

    it("getItem returns undefined for missing id", () => {
      const layout: Layout = [item("a", 0, 0, 2, 2)];
      expect(engine.getItem(layout, "nope")).toBeUndefined();
    });

    it("compact is equivalent to initializeLayout", () => {
      const layout: Layout = [
        item("a", 0, 5, 2, 2),
        item("b", 0, 10, 2, 2),
      ];

      const initialized = engine.initializeLayout(layout);
      const compacted = engine.compact(layout);

      // Should produce the same result
      expect(compacted).toEqual(initialized);
    });
  });

  // -------------------------------------------------------------------------
  // Config exposure
  // -------------------------------------------------------------------------

  describe("config", () => {
    it("exposes compactor, cols, preventCollision", () => {
      expect(engine.compactor).toBe(verticalCompactor);
      expect(engine.cols).toBe(12);
      expect(engine.preventCollision).toBe(false);
    });

    it("reads preventCollision from config", () => {
      const e = createPhysicsEngine({
        cols: 6,
        compactor: verticalCompactor,
        preventCollision: true,
      });

      expect(e.preventCollision).toBe(true);
      expect(e.cols).toBe(6);
    });
  });
});
