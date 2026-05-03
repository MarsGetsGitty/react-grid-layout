/**
 * Compactor moved-flag regression tests
 *
 * Verifies that ALL compactors (including overlap variants) correctly
 * clear the `moved` flag after compaction. This prevents drag-frame
 * freeze bugs where moveElement skips items that still have moved=true
 * from a prior drag tick.
 */

import {
  noCompactor,
  verticalCompactor,
  horizontalCompactor,
  verticalOverlapCompactor,
  horizontalOverlapCompactor,
  noOverlapCompactor,
} from "../../src/core/index.js";
import type { Layout, LayoutItem } from "../../src/core/index.js";

// =============================================================================
// Helpers
// =============================================================================

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

// =============================================================================
// Tests
// =============================================================================

describe("Compactor moved-flag clearing", () => {
  const layoutWithMovedTrue: Layout = [
    item("a", 0, 0, 2, 2, { moved: true }),
    item("b", 2, 0, 2, 2, { moved: true }),
    item("c", 4, 0, 2, 2, { moved: true }),
  ];

  describe("noCompactor", () => {
    it("clones layout and clears moved flags", () => {
      const result = noCompactor.compact(layoutWithMovedTrue, 12);

      // All items should have moved=false
      for (const resultItem of result) {
        expect(resultItem.moved).toBe(false);
      }

      // Should be clones, not same references
      expect(result).not.toBe(layoutWithMovedTrue);
      expect(result[0]).not.toBe(layoutWithMovedTrue[0]);
    });

    it("preserves positions without compaction", () => {
      const layout: Layout = [
        item("a", 5, 10, 2, 2, { moved: true }),
        item("b", 0, 0, 2, 2, { moved: true }),
      ];

      const result = noCompactor.compact(layout, 12);

      const a = result.find(l => l.i === "a");
      const b = result.find(l => l.i === "b");
      expect(a?.x).toBe(5);
      expect(a?.y).toBe(10);
      expect(b?.x).toBe(0);
      expect(b?.y).toBe(0);
    });
  });

  describe("verticalOverlapCompactor", () => {
    it("clears moved flags", () => {
      const result = verticalOverlapCompactor.compact(layoutWithMovedTrue, 12);

      for (const resultItem of result) {
        expect(resultItem.moved).toBe(false);
      }
    });

    it("returns cloned items", () => {
      const result = verticalOverlapCompactor.compact(layoutWithMovedTrue, 12);

      expect(result).not.toBe(layoutWithMovedTrue);
      expect(result[0]).not.toBe(layoutWithMovedTrue[0]);
    });
  });

  describe("horizontalOverlapCompactor", () => {
    it("clears moved flags", () => {
      const result = horizontalOverlapCompactor.compact(layoutWithMovedTrue, 12);

      for (const resultItem of result) {
        expect(resultItem.moved).toBe(false);
      }
    });

    it("returns cloned items", () => {
      const result = horizontalOverlapCompactor.compact(layoutWithMovedTrue, 12);

      expect(result).not.toBe(layoutWithMovedTrue);
      expect(result[0]).not.toBe(layoutWithMovedTrue[0]);
    });
  });

  describe("noOverlapCompactor", () => {
    it("clears moved flags (inherits from noCompactor)", () => {
      const result = noOverlapCompactor.compact(layoutWithMovedTrue, 12);

      for (const resultItem of result) {
        expect(resultItem.moved).toBe(false);
      }
    });
  });

  describe("verticalCompactor", () => {
    it("clears moved flags", () => {
      const result = verticalCompactor.compact(layoutWithMovedTrue, 12);

      for (const resultItem of result) {
        expect(resultItem.moved).toBe(false);
      }
    });
  });

  describe("horizontalCompactor", () => {
    it("clears moved flags", () => {
      const result = horizontalCompactor.compact(layoutWithMovedTrue, 12);

      for (const resultItem of result) {
        expect(resultItem.moved).toBe(false);
      }
    });
  });

  // ===========================================================================
  // Regression: repeated drag frames with noCompactor
  // ===========================================================================

  describe("repeated drag-frame regression", () => {
    it("allows pushed widgets to move across repeated drag frames with noCompactor", () => {
      // Simulate: drag frame 1 pushes b down. Frame 2, a moves further,
      // b should still be pushable (not frozen by moved=true).

      // Frame 1: a at (0,0), b at (0,2). a drags to (0,2) — pushes b to (0,4)
      const frame1Layout: Layout = [
        item("a", 0, 2, 2, 2),           // a at target position
        item("b", 0, 4, 2, 2, { moved: true }), // b was pushed down
      ];

      // Compact with noCompactor (simulates end of frame 1)
      const afterFrame1 = noCompactor.compact(frame1Layout, 12);

      // b.moved should be cleared so frame 2 can push it again
      const b1 = afterFrame1.find(l => l.i === "b");
      expect(b1?.moved).toBe(false);

      // Frame 2: a drags further to (0,4) — should push b again
      const frame2Layout: Layout = [
        item("a", 0, 4, 2, 2),
        item("b", 0, 4, 2, 2, { moved: false }), // cleared by compactor
      ];

      // After compaction, b should still be pushable
      const afterFrame2 = noCompactor.compact(frame2Layout, 12);
      const b2 = afterFrame2.find(l => l.i === "b");
      expect(b2?.moved).toBe(false);
    });
  });
});
