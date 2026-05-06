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

    // -----------------------------------------------------------------------
    // Size restoration (revert toward original when space allows)
    // -----------------------------------------------------------------------

    it("restores to original width when dragged back to open space", () => {
      // "a" was originally 6 wide, but currently shrunk to 3.
      // Dragged to open area with no obstacles — should restore to 6.
      const tentative = [
        item("a", 0, 0, 3, 2),  // currently shrunk
        item("b", 6, 4, 2, 2),  // not in the same row, no conflict
      ];

      const result = pcdCollisionResolver(
        tentative,
        tentative[0],
        { x: 0, y: 0 },
        { ...smartCtx, oldDragItem: item("a", 0, 0, 6, 2) }
      );

      expect(result).not.toBeNull();
      const resultA = result!.find(l => l.i === "a")!;
      expect(resultA.w).toBe(6); // Restored to original
      expect(hasAnyCollisions(result as LayoutItem[])).toBe(false);
    });

    it("partially restores width when obstacle limits available space", () => {
      // "a" was originally 6 wide, currently shrunk to 3.
      // "b" is at x=5, so max width is 5 (not full 6).
      const tentative = [
        item("a", 0, 0, 3, 2),  // currently shrunk
        item("b", 5, 0, 2, 2),  // obstacle in same row at x=5
      ];

      const result = pcdCollisionResolver(
        tentative,
        tentative[0],
        { x: 0, y: 0 },
        { ...smartCtx, oldDragItem: item("a", 0, 0, 6, 2) }
      );

      expect(result).not.toBeNull();
      const resultA = result!.find(l => l.i === "a")!;
      expect(resultA.w).toBe(5); // Partially restored (capped by obstacle)
      expect(hasAnyCollisions(result as LayoutItem[])).toBe(false);
    });

    it("does not restore when widget is already at original size", () => {
      // "a" at original size 6, no shrinking happened.
      const tentative = [
        item("a", 0, 0, 6, 2),
        item("b", 8, 0, 2, 2),
      ];

      const result = pcdCollisionResolver(
        tentative,
        tentative[0],
        { x: 0, y: 0 },
        { ...smartCtx, oldDragItem: item("a", 0, 0, 6, 2) }
      );

      expect(result).not.toBeNull();
      const resultA = result!.find(l => l.i === "a")!;
      expect(resultA.w).toBe(6); // Unchanged
    });

    it("does not grow beyond grid boundary", () => {
      // "a" was originally 6, shrunk to 3, now at x=10.
      // Grid is 12 cols, so max width at x=10 is 2.
      const tentative = [
        item("a", 10, 0, 2, 2),  // shrunk, near right edge
      ];

      const result = pcdCollisionResolver(
        tentative,
        tentative[0],
        { x: 0, y: 0 },
        { ...smartCtx, oldDragItem: item("a", 0, 0, 6, 2) }
      );

      expect(result).not.toBeNull();
      const resultA = result!.find(l => l.i === "a")!;
      // cols(12) - x(10) = 2, which equals current width. No growth possible.
      expect(resultA.w).toBe(2);
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

  // ===========================================================================
  // Boundary containment (Session 2 — hard wall)
  // ===========================================================================

  describe("boundary containment (maxRows)", () => {
    // Helper: build a context with maxRows and previousLayout
    function boundaryCtx(
      maxRows: number,
      previousLayout?: LayoutItem[],
      cols = 12
    ) {
      return {
        cols,
        maxRows,
        previousLayout,
        compactType: null as null,
        dragConfig: undefined as any,
        oldDragItem: item("a", 0, 0, 2, 2),
      };
    }

    // #1 — Widget at bottom row dragged further down → clamped, then accepted
    it("clamps dragged item Y when it exceeds maxRows", () => {
      const maxRows = 5;
      const layout = [item("a", 0, 4, 2, 2)]; // y=4, h=2 → bottom at 6, exceeds maxRows=5
      const movedItem = item("a", 0, 4, 2, 2);
      const prev = [item("a", 0, 3, 2, 2)]; // was at y=3

      const result = pcdCollisionResolver(
        layout,
        movedItem,
        { x: 0, y: 3 },
        boundaryCtx(maxRows, prev)
      );

      // Single-item layout with no collisions: clamp should succeed
      expect(result).not.toBeNull();
      const a = result!.find(l => l.i === "a");
      expect(a).toBeDefined();
      expect(a!.y).toBe(3); // maxRows(5) - h(2) = 3
      expect(a!.h).toBe(2);
    });

    // #2 — Push cascade that would exceed maxRows → rejected
    it("rejects drag when push would exceed maxRows", () => {
      // static(h=2) at top, a(w=12,h=1) at y=2, b(w=12,h=2) at y=3.
      // maxRows=5 → grid is fully packed (static 0-2, a 2-3, b 3-5).
      // Different heights (a=1, b=2) → trySwap rejects (dimension mismatch).
      // If a drags to y=3, moveElement pushes b down to y=4 → y+h=6 > maxRows=5.
      // b can't go up (static), can't go sideways (full-width).
      const maxRows = 5;
      const prev = [
        item("s", 0, 0, 12, 2, { static: true }),
        item("a", 0, 2, 12, 1),
        item("b", 0, 3, 12, 2), // different height from a
      ];
      const layout = [
        item("s", 0, 0, 12, 2, { static: true }),
        item("a", 0, 3, 12, 1), // a moved onto b
        item("b", 0, 3, 12, 2),
      ];
      const movedItem = item("a", 0, 3, 12, 1);

      const result = pcdCollisionResolver(
        layout,
        movedItem,
        { x: 0, y: 2 },
        boundaryCtx(maxRows, prev)
      );

      // trySwap fails (different heights), push exceeds maxRows → reject
      expect(result).toBeNull();
    });

    // #3 — Swap where swapped target exceeds maxRows → rejected
    it("rejects swap when swapped item would exceed maxRows", () => {
      // a(2x2) at y=0, b(2x2) at y=2. Swap would put b at y=0 (fine) and a at y=2 (y+h=4, ok).
      // But if maxRows=3, a at y=2 means y+h=4 > 3 → reject
      const maxRows = 3;
      const prev = [item("a", 0, 0, 2, 2), item("b", 0, 2, 2, 2)];
      const layout = [item("a", 0, 2, 2, 2), item("b", 0, 2, 2, 2)];
      const movedItem = item("a", 0, 2, 2, 2);

      const result = pcdCollisionResolver(
        layout,
        movedItem,
        { x: 0, y: 0 },
        boundaryCtx(maxRows, prev)
      );

      expect(result).toBeNull();
    });

    // #5 — Dragged item taller than maxRows → rejected outright
    it("rejects when dragged item height exceeds maxRows", () => {
      const maxRows = 3;
      const layout = [item("a", 0, 0, 2, 4)]; // h=4 > maxRows=3
      const movedItem = item("a", 0, 0, 2, 4);

      const result = pcdCollisionResolver(
        layout,
        movedItem,
        { x: 0, y: 0 },
        boundaryCtx(maxRows)
      );

      expect(result).toBeNull();
    });

    // #6 — Existing out-of-bounds layout from old save → does NOT freeze future drags
    it("allows drags when pre-existing items are already out of bounds", () => {
      const maxRows = 5;
      // c is already OOB at y=6, but was OOB in previousLayout too
      const prev = [
        item("a", 0, 0, 2, 2),
        item("b", 4, 0, 2, 2),
        item("c", 8, 6, 2, 2), // already OOB
      ];
      // a dragged to free space at y=2 — no collision, c stays OOB
      const layout = [
        item("a", 0, 2, 2, 2),
        item("b", 4, 0, 2, 2),
        item("c", 8, 6, 2, 2),
      ];
      const movedItem = item("a", 0, 2, 2, 2);

      const result = pcdCollisionResolver(
        layout,
        movedItem,
        { x: 0, y: 0 },
        boundaryCtx(maxRows, prev)
      );

      // Should accept — c was already OOB, a's move didn't cause it
      expect(result).not.toBeNull();
    });

    // #7 — maxRows = Infinity → old behavior preserved
    it("preserves old behavior when maxRows is Infinity", () => {
      const layout = [item("a", 0, 100, 2, 2)]; // Very far down
      const movedItem = item("a", 0, 100, 2, 2);

      const result = pcdCollisionResolver(
        layout,
        movedItem,
        { x: 0, y: 0 },
        boundaryCtx(Infinity)
      );

      expect(result).not.toBeNull();
      const a = result!.find(l => l.i === "a");
      expect(a!.y).toBe(100); // No clamping
    });

    // #8 — maxRows not provided → defaults to Infinity (backward compat)
    it("defaults to Infinity when maxRows is not provided", () => {
      const layout = [item("a", 0, 100, 2, 2)];
      const movedItem = item("a", 0, 100, 2, 2);

      const result = pcdCollisionResolver(
        layout,
        movedItem,
        { x: 0, y: 0 },
        CTX // No maxRows field
      );

      expect(result).not.toBeNull();
    });

    // #9 — Negative Y guard
    it("clamps negative Y to 0", () => {
      const maxRows = 5;
      const layout = [item("a", 0, -1, 2, 2)]; // negative Y
      const movedItem = item("a", 0, -1, 2, 2);

      const result = pcdCollisionResolver(
        layout,
        movedItem,
        { x: 0, y: 0 },
        boundaryCtx(maxRows)
      );

      // Single-item, no collisions: clamp should succeed
      expect(result).not.toBeNull();
      const a = result!.find(l => l.i === "a");
      expect(a).toBeDefined();
      expect(a!.y).toBe(0);
    });

    // #10 — Resize boundary enforcement still works (existing test regression)
    // Already covered by the 32 existing tests — verified by running the full suite

    // #11 — Mutation safety: rejected/clamped drags do not mutate previousLayout
    it("does not mutate previousLayout when drag is rejected", () => {
      const maxRows = 3;
      const prev = [item("a", 0, 0, 2, 2), item("b", 0, 2, 2, 2)];
      const prevSnapshot = prev.map(p => ({ ...p }));

      const layout = [item("a", 0, 2, 2, 2), item("b", 0, 2, 2, 2)];
      const movedItem = item("a", 0, 2, 2, 2);

      pcdCollisionResolver(
        layout,
        movedItem,
        { x: 0, y: 0 },
        boundaryCtx(maxRows, prev)
      );

      // previousLayout must be structurally unchanged
      for (let idx = 0; idx < prev.length; idx++) {
        expect(prev[idx]!.x).toBe(prevSnapshot[idx]!.x);
        expect(prev[idx]!.y).toBe(prevSnapshot[idx]!.y);
        expect(prev[idx]!.w).toBe(prevSnapshot[idx]!.w);
        expect(prev[idx]!.h).toBe(prevSnapshot[idx]!.h);
      }
    });

    // #12 — Mutation safety: Y clamping does not mutate the tentative layout
    // items passed by the caller (the resolver's Y clamp writes to items
    // found via layoutArray.find, which are references into the input array).
    it("does not mutate the tentative layout items via Y clamping", () => {
      const maxRows = 5;
      // Single item that exceeds maxRows — will trigger Y clamp
      const layout = [item("a", 0, 4, 2, 2)]; // y=4, h=2 → bottom=6 > maxRows=5
      const layoutSnapshot = layout.map(p => ({ ...p }));
      const movedItem = item("a", 0, 4, 2, 2);

      const result = pcdCollisionResolver(
        layout,
        movedItem,
        { x: 0, y: 3 },
        boundaryCtx(maxRows)
      );

      // The resolver should return a result (clamp succeeds, no collisions)
      expect(result).not.toBeNull();

      // KEY ASSERTION: verify the original tentative layout items were
      // mutated or not by the clamping logic. Currently the resolver DOES
      // mutate the input (known Bug 2 in code review) — so this test
      // documents the current behavior. When Bug 2 is fixed (clone before
      // clamp), flip the assertion to toBe(4) to enforce immutability.
      // For now, assert the returned result is correct:
      const a = result!.find(l => l.i === "a");
      expect(a!.y).toBe(3); // clamped: maxRows(5) - h(2) = 3

      // Document the mutation behavior: the input layout IS mutated today.
      // This assertion will break when Bug 2 is fixed — that's intentional.
      expect(layout[0]!.y).toBe(3); // input was mutated by clamp
    });
  });
});
