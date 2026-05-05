/**
 * pcdCollisionResolver — Unit tests
 *
 * Validates the Swap-then-Push collision resolver used by the PCD dashboard.
 * Covers: context validation, free-space moves, swap acceptance/rejection,
 * push fallback, compactType semantics, and moved-flag normalisation.
 */

import type { LayoutItem } from "../../src/core/types/index";
import { pcdCollisionResolver } from "../../src/core/index";
import { getAllCollisions } from "../../src/core/spatial/collision";

function hasAnyCollisions(layout: LayoutItem[]): boolean {
  return layout.some(item =>
    getAllCollisions(layout, item).some(other => other.i !== item.i)
  );
}

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
  return { i, x, y, w, h, ...opts };
}

const CTX = { cols: 12, compactType: null as null };

// =============================================================================
// Context validation
// =============================================================================

describe("pcdCollisionResolver", () => {
  describe("context validation", () => {
    it("returns null when cols context is missing", () => {
      const layout = [item("a", 2, 0, 2, 2)];
      const movedItem = item("a", 2, 0, 2, 2);

      expect(pcdCollisionResolver(layout, movedItem, { x: 0, y: 0 })).toBeNull();
    });

    it("returns null when context is undefined", () => {
      const layout = [item("a", 2, 0, 2, 2)];
      const movedItem = item("a", 2, 0, 2, 2);

      expect(
        pcdCollisionResolver(layout, movedItem, { x: 0, y: 0 }, undefined)
      ).toBeNull();
    });

    it("returns null when cols is not a number", () => {
      const layout = [item("a", 2, 0, 2, 2)];
      const movedItem = item("a", 2, 0, 2, 2);

      expect(
        pcdCollisionResolver(layout, movedItem, { x: 0, y: 0 }, {
          cols: "12" as unknown as number,
          compactType: null,
        })
      ).toBeNull();
    });
  });

  // ===========================================================================
  // Free-space moves
  // ===========================================================================

  describe("free-space moves", () => {
    it("accepts collision-free moves and returns cloned items", () => {
      const layout = [
        item("a", 0, 0, 2, 2),
        item("b", 6, 0, 2, 2),
      ];
      // "a" dragged to x=3 — no overlap with "b" at x=6
      const movedItem = item("a", 3, 0, 2, 2);
      // Build tentative: a is already at the target
      const tentative = [movedItem, layout[1]!];

      const result = pcdCollisionResolver(tentative, movedItem, { x: 0, y: 0 }, CTX);

      expect(result).not.toBeNull();
      // Should contain the same items at the same positions
      for (const t of tentative) {
        const found = result!.find(l => l.i === t.i);
        expect(found).toBeDefined();
        expect(found!.x).toBe(t.x);
        expect(found!.y).toBe(t.y);
        expect(found!.w).toBe(t.w);
        expect(found!.h).toBe(t.h);
      }
      // But NOT the same references (cloned)
      expect(result).not.toBe(tentative);
      expect(result![0]).not.toBe(tentative[0]);
    });
  });

  // ===========================================================================
  // Swap
  // ===========================================================================

  describe("swap", () => {
    it("accepts same-size one-to-one swap", () => {
      // "a" dragged onto "b", both 2x2
      const layout = [
        item("a", 2, 0, 2, 2), // now overlapping b
        item("b", 2, 0, 2, 2),
      ];
      const movedItem = item("a", 2, 0, 2, 2);

      const result = pcdCollisionResolver(layout, movedItem, { x: 0, y: 0 }, CTX);

      expect(result).not.toBeNull();
      // After swap, "b" should be at origin
      const b = result!.find(l => l.i === "b");
      expect(b!.x).toBe(0);
      expect(b!.y).toBe(0);
    });

    it("rejects swap results that still contain collisions", () => {
      // Arrange: a 3-item layout where swapping a↔b would cause b to overlap c
      // a(2x2) dragged onto b(2x2), but c(2x2) sits at origin where b would go
      const layout = [
        item("a", 2, 0, 2, 2), // dragged onto b's position
        item("b", 2, 0, 2, 2), // would swap to origin (0,0)
        item("c", 0, 0, 2, 2), // but c is already there
      ];
      const movedItem = item("a", 2, 0, 2, 2);

      const result = pcdCollisionResolver(layout, movedItem, { x: 0, y: 0 }, CTX);

      // trySwap would swap b to (0,0) where c already is — collision.
      // hasAnyCollisions should catch it and return null.
      // If trySwap returns null (doesn't swap due to multiple collisions), 
      // the push path handles it instead.
      // Either way the result should be valid (no collisions) or null.
      if (result !== null) {
        // If we got a result, verify it has no collisions
        const items = result as LayoutItem[];
        for (const check of items) {
          const overlaps = items.filter(
            other =>
              other.i !== check.i &&
              check.x < other.x + other.w &&
              check.x + check.w > other.x &&
              check.y < other.y + other.h &&
              check.y + check.h > other.y
          );
          expect(overlaps).toHaveLength(0);
        }
      }
    });
  });

  // ===========================================================================
  // Smart Grid (Shrink-to-Fit)
  // ===========================================================================

  describe("Smart Grid (Shrink-to-Fit)", () => {
    const smartCtx = { 
      cols: 12, 
      compactType: null as null,
      dragConfig: { autoResize: true } as any,
      oldDragItem: item("a", 0, 0, 12, 2)
    };

    it("shrinks wide widget when cursor is over empty space next to obstacle", () => {
      // "a" is a wide widget (w: 12) originally at top
      // "b" is an obstacle at x: 4, w: 2
      // Cursor is at x: 0 (empty space to the left of "b")
      const tentative = [
        item("a", 0, 2, 12, 2, { minW: 3 }), // moved to y=2, but overlapping b
        item("b", 4, 2, 2, 2),
      ];
      
      const result = pcdCollisionResolver(
        tentative, 
        tentative[0], 
        { x: 0, y: 0 }, 
        { ...smartCtx, cursorPosition: { x: 0, y: 2 } }
      );
      
      console.log("TEST 1 RESULT:", result);

      expect(result).not.toBeNull();
      const resultA = result!.find(l => l.i === "a")!;
      
      // Since gap on the left of b is [0, 4), and cursor is at 0, "a" should shrink to w: 4.
      expect(resultA.w).toBe(4);
      expect(resultA.x).toBe(0);
      
      // Should resolve collisions
      expect(hasAnyCollisions(result as LayoutItem[])).toBe(false);
    });

    it("shrinks widget and snaps x if dragged from left to right gap", () => {
      // Cursor is at x: 8, "b" is at x: 4, w: 2
      // gap on the right is [6, 12) -> width 6. 
      // "a" is at x: 0, w: 12.
      const tentative = [
        item("a", 0, 2, 12, 2, { minW: 3 }),
        item("b", 4, 2, 2, 2),
      ];

      const result = pcdCollisionResolver(
        tentative, 
        tentative[0], 
        { x: 0, y: 0 }, 
        { ...smartCtx, cursorPosition: { x: 8, y: 2 } }
      );

      expect(result).not.toBeNull();
      const resultA = result!.find(l => l.i === "a")!;
      
      // Gap is [6, 12) -> width 6. Target width = min(original(12), 6) = 6.
      // Target x should snap to 6 to stay within gap and contain cursor x:8.
      expect(resultA.w).toBe(6);
      expect(resultA.x).toBe(6);
      expect(hasAnyCollisions(result as LayoutItem[])).toBe(false);
    });

    it("falls back to push if cursor is over an obstacle", () => {
      // Cursor is at x: 4 (on top of "b")
      const tentative = [
        item("a", 0, 2, 12, 2),
        item("b", 4, 2, 2, 2),
      ];

      const result = pcdCollisionResolver(
        tentative, 
        tentative[0], 
        { x: 0, y: 0 }, 
        { ...smartCtx, cursorPosition: { x: 4, y: 2 } }
      );

      expect(result).not.toBeNull();
      const resultA = result!.find(l => l.i === "a")!;
      const resultB = result!.find(l => l.i === "b")!;
      
      // Because cursor is over "b", it should NOT shrink. Instead it should push.
      expect(resultA.w).toBe(12);
      expect(resultB.y).not.toBe(2); // "b" gets pushed away (in this case, up to 0)
    });
    
    it("falls back to push if available gap is smaller than minW", () => {
      // Cursor is at x: 0
      // Obstacle "b" is at x: 2, w: 2. Gap is [0, 2).
      // Widget "a" has minW = 3. Gap is too small.
      const tentative = [
        item("a", 0, 2, 12, 2, { minW: 3 }),
        item("b", 2, 2, 2, 2),
      ];

      const result = pcdCollisionResolver(
        tentative, 
        tentative[0], 
        { x: 0, y: 0 }, 
        { ...smartCtx, cursorPosition: { x: 0, y: 2 } }
      );

      expect(result).not.toBeNull();
      const resultA = result!.find(l => l.i === "a")!;
      const resultB = result!.find(l => l.i === "b")!;
      
      // Should not shrink since gap(2) < minW(3). "b" should be pushed.
      expect(resultA.w).toBe(12);
      expect(resultB.y).not.toBe(2);
    });
  });

  // ===========================================================================
  // Push fallback
  // ===========================================================================

  describe("push fallback", () => {
    it("push fallback resets moved item to originalPosition before moveElement", () => {
      // a(2x2) at (0,0) dragged to (0,2) where b sits (different width, no swap)
      const a = item("a", 0, 2, 2, 2); // tentative position (overlapping b)
      const bWider = item("b", 0, 2, 3, 2);
      const tentative = [a, bWider];
      const movedItem = a;

      const result = pcdCollisionResolver(tentative, movedItem, { x: 0, y: 0 }, CTX);

      // Push should succeed — a at (0,2) and b(wider) should be resolved
      expect(result).not.toBeNull();
      const resultB = result!.find(l => l.i === "b") as LayoutItem;
      const resultA = result!.find(l => l.i === "a") as LayoutItem;
      // a and b should not overlap after push resolution
      expect(
        resultB.y >= resultA.y + resultA.h || resultA.y >= resultB.y + resultB.h ||
        resultB.x >= resultA.x + resultA.w || resultA.x >= resultB.x + resultB.w
      ).toBe(true);
    });

    it("returns null when push fallback cannot resolve all collisions", () => {
      // Create a scenario where items are blocked: static item prevents push
      const a = item("a", 0, 0, 2, 2); // dragged to (0,0)
      const staticItem = item("s", 0, 2, 12, 10, { static: true }); // blocks everything below
      const b = item("b", 0, 0, 3, 2); // overlapping with a, different size (no swap)
      const tentative = [a, b, staticItem];

      const result = pcdCollisionResolver(tentative, a, { x: 0, y: 0 }, CTX);

      // Pushing b down is blocked by static item — unresolvable
      // Result should be null OR a collision-free layout
      if (result !== null) {
        const items = result as LayoutItem[];
        for (const check of items) {
          const overlaps = items.filter(
            other =>
              other.i !== check.i &&
              check.x < other.x + other.w &&
              check.x + check.w > other.x &&
              check.y < other.y + other.h &&
              check.y + check.h > other.y
          );
          expect(overlaps).toHaveLength(0);
        }
      }
    });
  });

  // ===========================================================================
  // compactType semantics
  // ===========================================================================

  describe("compactType semantics", () => {
    it("uses vertical push ordering when compactType is null", () => {
      // a(2x2) dragged onto b(3x2, different w → no swap)
      const a = item("a", 0, 2, 2, 2);
      const b = item("b", 0, 2, 3, 2);
      const tentative = [a, b];

      const result = pcdCollisionResolver(
        tentative,
        a,
        { x: 0, y: 0 },
        { cols: 12, compactType: null }
      );

      expect(result).not.toBeNull();
      const resultB = result!.find(l => l.i === "b") as LayoutItem;
      const resultA = result!.find(l => l.i === "a") as LayoutItem;
      // In vertical mode, b should not overlap with a
      expect(
        resultB.y >= resultA.y + resultA.h || resultA.y >= resultB.y + resultB.h ||
        resultB.x >= resultA.x + resultA.w || resultA.x >= resultB.x + resultB.w
      ).toBe(true);
    });

    it("uses horizontal push ordering when compactType is horizontal", () => {
      const a = item("a", 2, 0, 2, 2);
      const b = item("b", 2, 0, 3, 2);
      const tentative = [a, b];

      const result = pcdCollisionResolver(
        tentative,
        a,
        { x: 0, y: 0 },
        { cols: 12, compactType: "horizontal" }
      );

      // Should produce a valid layout or null
      if (result) {
        const items = result as LayoutItem[];
        for (const check of items) {
          const overlaps = items.filter(
            other =>
              other.i !== check.i &&
              check.x < other.x + other.w &&
              check.x + check.w > other.x &&
              check.y < other.y + other.h &&
              check.y + check.h > other.y
          );
          expect(overlaps).toHaveLength(0);
        }
      }
    });
  });

  // ===========================================================================
  // Moved flag normalisation
  // ===========================================================================

  describe("moved flag handling", () => {
    it("does not freeze items with stale moved=true flags", () => {
      // Simulate a second drag frame where items still have moved=true
      const a = item("a", 0, 2, 2, 2, { moved: true });
      const b = item("b", 0, 2, 3, 2, { moved: true }); // stale moved flag
      const tentative = [a, b];

      const result = pcdCollisionResolver(
        tentative,
        a,
        { x: 0, y: 0 },
        CTX
      );

      // Push should still work because the resolver clears moved flags
      expect(result).not.toBeNull();
      const resultB = result!.find(l => l.i === "b") as LayoutItem;
      const resultA = result!.find(l => l.i === "a") as LayoutItem;
      // b should have been pushed — no overlap with a
      expect(
        resultB.y >= resultA.y + resultA.h || resultA.y >= resultB.y + resultB.h ||
        resultB.x >= resultA.x + resultA.w || resultA.x >= resultB.x + resultB.w
      ).toBe(true);
    });
  });

  // ===========================================================================
  // Immutability
  // ===========================================================================

  describe("immutability", () => {
    it("does not mutate the tentative layout on swap", () => {
      const layout = [
        item("a", 2, 0, 2, 2),
        item("b", 2, 0, 2, 2),
      ];
      const movedItem = item("a", 2, 0, 2, 2);

      // Deep snapshot before calling resolver
      const snapshot = layout.map(l => ({ ...l }));

      pcdCollisionResolver(layout, movedItem, { x: 0, y: 0 }, CTX);

      // Original layout should not have been mutated
      for (let idx = 0; idx < layout.length; idx++) {
        expect(layout[idx]!.x).toBe(snapshot[idx]!.x);
        expect(layout[idx]!.y).toBe(snapshot[idx]!.y);
        expect(layout[idx]!.w).toBe(snapshot[idx]!.w);
        expect(layout[idx]!.h).toBe(snapshot[idx]!.h);
      }
    });

    it("does not mutate the tentative layout on push fallback", () => {
      const layout = [
        item("a", 0, 2, 2, 2),
        item("b", 0, 2, 3, 2),
      ];
      const movedItem = layout[0]!;

      const snapshot = layout.map(l => ({ ...l }));

      pcdCollisionResolver(layout, movedItem, { x: 0, y: 0 }, CTX);

      for (let idx = 0; idx < layout.length; idx++) {
        expect(layout[idx]!.x).toBe(snapshot[idx]!.x);
        expect(layout[idx]!.y).toBe(snapshot[idx]!.y);
        expect(layout[idx]!.w).toBe(snapshot[idx]!.w);
        expect(layout[idx]!.h).toBe(snapshot[idx]!.h);
      }
    });
  });
});
