/**
 * Collision Strategies Test Suite
 *
 * Tests for trySwap (drag) and resolveResizeCollisions (resize)
 * collision resolution strategies.
 */

import type { LayoutItem } from "../../src/core/types/index";
import { trySwap } from "../../src/core/engines/swap-strategy";
import {
  resolveResizeCollisions,
  inferResizeHandles
} from "../../src/core/engines/squash-push-strategy";

// =============================================================================
// Helpers
// =============================================================================

/** Create a minimal LayoutItem for testing */
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

// =============================================================================
// trySwap
// =============================================================================

describe("trySwap", () => {
  it("returns swapped layout when exactly one same-dimension collision exists", () => {
    // Simulate: "a" has been dragged to overlap "b", origin was (0,0)
    const layout = [
      item("a", 3, 0, 3, 2), // now overlapping b
      item("b", 3, 0, 3, 2),
    ];

    const result = trySwap(layout, "a", { x: 0, y: 0 });

    expect(result).not.toBeNull();
    // Target "b" should have moved to origin slot
    const b = result!.find(l => l.i === "b");
    expect(b!.x).toBe(0);
    expect(b!.y).toBe(0);
    // "a" stays where it was dragged
    const a = result!.find(l => l.i === "a");
    expect(a!.x).toBe(3);
    expect(a!.y).toBe(0);
  });

  it("returns null when zero collisions (no swap target)", () => {
    const layout = [
      item("a", 0, 0, 3, 2),
      item("b", 6, 0, 3, 2), // far away, no overlap
    ];

    const result = trySwap(layout, "a", { x: 0, y: 0 });
    expect(result).toBeNull();
  });

  it("returns null when multiple collisions (brick wall)", () => {
    const layout = [
      item("a", 1, 0, 3, 2), // overlaps both b and c
      item("b", 0, 0, 3, 2),
      item("c", 3, 0, 3, 2),
    ];

    const result = trySwap(layout, "a", { x: 6, y: 0 });
    expect(result).toBeNull();
  });

  it("returns null when dimension mismatch", () => {
    const layout = [
      item("a", 0, 0, 3, 2), // 3x2
      item("b", 0, 0, 4, 2), // 4x2 — different width
    ];

    const result = trySwap(layout, "a", { x: 6, y: 0 });
    expect(result).toBeNull();
  });

  it("returns null when dragged item not found", () => {
    const layout = [item("a", 0, 0, 3, 2)];
    const result = trySwap(layout, "nonexistent", { x: 0, y: 0 });
    expect(result).toBeNull();
  });

  it("does not mutate input layout", () => {
    const layout = [
      item("a", 3, 0, 3, 2),
      item("b", 3, 0, 3, 2),
    ];
    const originalB = { ...layout[1] };

    trySwap(layout, "a", { x: 0, y: 0 });

    // Original layout items should be unchanged
    expect(layout[1].x).toBe(originalB.x);
    expect(layout[1].y).toBe(originalB.y);
  });
});

// =============================================================================
// inferResizeHandles
// =============================================================================

describe("inferResizeHandles", () => {
  it("infers 's' when h increases with same y", () => {
    const old = item("a", 0, 0, 3, 2);
    const now = item("a", 0, 0, 3, 4);
    const { vertical, horizontal } = inferResizeHandles(old, now);
    expect(vertical).toBe("s");
    expect(horizontal).toBeNull();
  });

  it("infers 'n' when y decreases", () => {
    const old = item("a", 0, 2, 3, 2);
    const now = item("a", 0, 1, 3, 3);
    const { vertical, horizontal } = inferResizeHandles(old, now);
    expect(vertical).toBe("n");
    expect(horizontal).toBeNull();
  });

  it("infers 'e' when w increases with same x", () => {
    const old = item("a", 0, 0, 3, 2);
    const now = item("a", 0, 0, 5, 2);
    const { vertical, horizontal } = inferResizeHandles(old, now);
    expect(vertical).toBeNull();
    expect(horizontal).toBe("e");
  });

  it("infers 'w' when x decreases", () => {
    const old = item("a", 3, 0, 3, 2);
    const now = item("a", 1, 0, 5, 2);
    const { vertical, horizontal } = inferResizeHandles(old, now);
    expect(vertical).toBeNull();
    expect(horizontal).toBe("w");
  });

  it("infers combined axes for corner handles", () => {
    const old = item("a", 0, 0, 3, 2);
    const now = item("a", 0, 0, 5, 4);
    const { vertical, horizontal } = inferResizeHandles(old, now);
    expect(vertical).toBe("s");
    expect(horizontal).toBe("e");
  });

  it("returns null for both axes when no change", () => {
    const old = item("a", 0, 0, 3, 2);
    const now = item("a", 0, 0, 3, 2);
    const { vertical, horizontal } = inferResizeHandles(old, now);
    expect(vertical).toBeNull();
    expect(horizontal).toBeNull();
  });
});

// =============================================================================
// resolveResizeCollisions
// =============================================================================

// IMPORTANT: The `layout` parameter must contain the item at its NEW (post-resize)
// dimensions, since RGL calls onResize with the layout already updated. The
// oldItem/newItem params are used only for direction inference.

describe("resolveResizeCollisions", () => {
  it("squashes neighbor toward minH when south resize overlaps", () => {
    // Layout has "a" already at its new size (h=4), overlapping "b"
    const layout = [
      item("a", 0, 0, 3, 4),                // already resized south
      item("b", 0, 2, 3, 3, { minH: 1 }),   // overlaps a at y=2
    ];
    const oldA = item("a", 0, 0, 3, 2);
    const newA = item("a", 0, 0, 3, 4);

    const result = resolveResizeCollisions(layout, "a", oldA, newA, 10, 12);

    expect(result).not.toBeNull();
    const b = result!.find(l => l.i === "b");
    // b should be pushed/squashed so it starts at or below a's bottom (y=4)
    expect(b!.y).toBeGreaterThanOrEqual(4);
    expect(b!.h).toBeGreaterThanOrEqual(1);
  });

  it("pushes neighbor when squash alone is not enough", () => {
    // "a" grew to h=3, overlapping "b" which can't squash (already at minH)
    const layout = [
      item("a", 0, 0, 3, 3),                // already resized south
      item("b", 0, 2, 3, 2, { minH: 2 }),   // overlaps, can't shrink
    ];
    const oldA = item("a", 0, 0, 3, 2);
    const newA = item("a", 0, 0, 3, 3);

    const result = resolveResizeCollisions(layout, "a", oldA, newA, 10, 12);

    expect(result).not.toBeNull();
    const b = result!.find(l => l.i === "b");
    expect(b!.y).toBe(3); // pushed down by 1
    expect(b!.h).toBe(2); // size unchanged
  });

  it("returns null when pushed neighbor hits viewport boundary", () => {
    // "a" grew to h=4, "b" at minH can't squash, push would exit viewport
    const layout = [
      item("a", 0, 0, 3, 4),                // already resized south
      item("b", 0, 2, 3, 2, { minH: 2 }),   // overlaps, can't shrink
    ];
    const oldA = item("a", 0, 0, 3, 2);
    const newA = item("a", 0, 0, 3, 4);

    // maxRows=5 means b pushed to y=4, bottom=6 → exceeds 5
    const result = resolveResizeCollisions(layout, "a", oldA, newA, 5, 12);

    expect(result).toBeNull();
  });

  it("handles north resize (negative direction)", () => {
    // "a" grew upward: y went from 2→1, h from 2→3, now overlapping "b"
    const layout = [
      item("a", 0, 1, 3, 3),                // already resized north
      item("b", 0, 0, 3, 2, { minH: 1 }),   // above, overlaps at y=0..2
    ];
    const oldA = item("a", 0, 2, 3, 2);
    const newA = item("a", 0, 1, 3, 3);

    const result = resolveResizeCollisions(layout, "a", oldA, newA, 10, 12);

    expect(result).not.toBeNull();
    const b = result!.find(l => l.i === "b");
    // b should be squashed or pushed upward so its bottom <= a.y (1)
    expect(b!.y + b!.h).toBeLessThanOrEqual(1);
  });

  it("handles east resize on horizontal axis", () => {
    // "a" grew to w=5, overlapping "b" to the right
    const layout = [
      item("a", 0, 0, 5, 2),                // already resized east
      item("b", 3, 0, 3, 2, { minW: 1 }),   // overlaps at x=3..6
    ];
    const oldA = item("a", 0, 0, 3, 2);
    const newA = item("a", 0, 0, 5, 2);

    const result = resolveResizeCollisions(layout, "a", oldA, newA, 10, 12);

    expect(result).not.toBeNull();
    const b = result!.find(l => l.i === "b");
    expect(b!.x).toBeGreaterThanOrEqual(5); // pushed right of a's new right edge
  });

  it("handles chain reactions (push A into B)", () => {
    // "a" grew to h=3, pushing "b" into "c"
    const layout = [
      item("a", 0, 0, 3, 3),                // already resized south
      item("b", 0, 2, 3, 2, { minH: 2 }),   // overlaps a
      item("c", 0, 4, 3, 2, { minH: 2 }),   // adjacent to b
    ];
    const oldA = item("a", 0, 0, 3, 2);
    const newA = item("a", 0, 0, 3, 3);

    const result = resolveResizeCollisions(layout, "a", oldA, newA, 10, 12);

    expect(result).not.toBeNull();
    const b = result!.find(l => l.i === "b");
    const c = result!.find(l => l.i === "c");
    expect(b!.y).toBe(3); // pushed by 1
    expect(c!.y).toBe(5); // chain-pushed by 1
  });

  it("returns cloned layout with newItem applied when no resize delta detected", () => {
    const layout = [
      item("a", 0, 0, 3, 2),
      item("b", 0, 2, 3, 2),
    ];
    const oldA = item("a", 0, 0, 3, 2);
    const newA = item("a", 0, 0, 3, 2); // no change

    const result = resolveResizeCollisions(layout, "a", oldA, newA, 10, 12);

    // Returns a new array (clone), not the original reference
    expect(result).not.toBe(layout);
    expect(result).toEqual(layout);
  });

  it("does not mutate input layout", () => {
    const layout = [
      item("a", 0, 0, 3, 4),                // already resized
      item("b", 0, 2, 3, 3, { minH: 1 }),   // overlaps
    ];
    const originalB = { ...layout[1] };
    const oldA = item("a", 0, 0, 3, 2);
    const newA = item("a", 0, 0, 3, 4);

    resolveResizeCollisions(layout, "a", oldA, newA, 10, 12);

    expect(layout[1].y).toBe(originalB.y);
    expect(layout[1].h).toBe(originalB.h);
  });

  // ===========================================================================
  // Ship-gate tests (required before merge)
  // ===========================================================================

  it("1. south fast resize swallowing a smaller widget clears fully", () => {
    // "a" resizes from h=3 to h=10, completely swallowing "b" (h=2)
    const layout = [
      item("a", 0, 0, 6, 10),
      item("b", 0, 3, 6, 2, { minH: 1 }),
    ];
    const oldA = item("a", 0, 0, 6, 3);
    const newA = item("a", 0, 0, 6, 10);

    const result = resolveResizeCollisions(layout, "a", oldA, newA, 20, 12);

    expect(result).not.toBeNull();
    const b = result!.find(l => l.i === "b");
    // b must be fully clear of a's bottom edge (y=10)
    expect(b!.y).toBeGreaterThanOrEqual(10);
  });

  it("2. north resize with stale wrong-side overlap does not push wrong-side widget", () => {
    // "x" overlaps "a"'s bottom edge (stale). "a" resizes north. "x" should NOT move.
    const layout = [
      item("x", 0, 4, 6, 2),
      item("a", 0, 1, 6, 5),
    ];
    const oldA = item("a", 0, 2, 6, 4);
    const newA = item("a", 0, 1, 6, 5);

    const result = resolveResizeCollisions(layout, "a", oldA, newA, 10, 12);

    expect(result).not.toBeNull();
    const x = result!.find(l => l.i === "x");
    expect(x!.y).toBe(4);
    expect(x!.h).toBe(2);
  });

  it("3. diamond cascade: A hits B and C, both hit D — no residual overlap", () => {
    const layout = [
      item("a", 0, 0, 12, 4),
      item("b", 0, 2, 6, 2, { minH: 2 }),
      item("c", 6, 2, 6, 2, { minH: 2 }),
      item("d", 0, 4, 12, 2, { minH: 2 }),
    ];
    const oldA = item("a", 0, 0, 12, 2);
    const newA = item("a", 0, 0, 12, 4);

    const result = resolveResizeCollisions(layout, "a", oldA, newA, 20, 12);

    expect(result).not.toBeNull();
    const b = result!.find(l => l.i === "b")!;
    const c = result!.find(l => l.i === "c")!;
    const d = result!.find(l => l.i === "d")!;

    expect(b.y).toBeGreaterThanOrEqual(4);
    expect(c.y).toBeGreaterThanOrEqual(4);
    expect(d.y).toBeGreaterThanOrEqual(b.y + b.h);
    expect(d.y).toBeGreaterThanOrEqual(c.y + c.h);
  });

  it("4a. bottom shrink returns the new (smaller) geometry", () => {
    const layout = [
      item("a", 0, 0, 3, 4),
      item("b", 0, 4, 3, 2),
    ];
    const oldA = item("a", 0, 0, 3, 4);
    const newA = item("a", 0, 0, 3, 2);

    const result = resolveResizeCollisions(layout, "a", oldA, newA, 10, 12);

    expect(result).not.toBeNull();
    const a = result!.find(l => l.i === "a");
    expect(a!.h).toBe(2);
    expect(a!.y).toBe(0);
  });

  it("4b. right shrink returns the new (smaller) geometry", () => {
    const layout = [
      item("a", 0, 0, 6, 2),
      item("b", 6, 0, 3, 2),
    ];
    const oldA = item("a", 0, 0, 6, 2);
    const newA = item("a", 0, 0, 3, 2);

    const result = resolveResizeCollisions(layout, "a", oldA, newA, 10, 12);

    expect(result).not.toBeNull();
    const a = result!.find(l => l.i === "a");
    expect(a!.w).toBe(3);
    expect(a!.x).toBe(0);
  });

  it("5. recursive pure-squash does not process stale overlaps", () => {
    // "b" can fully squash (h=3 → minH=1). After squash, b's active edge
    // doesn't move enough to sweep into "c". c should stay put.
    const layout = [
      item("a", 0, 0, 6, 4),
      item("b", 0, 2, 6, 3, { minH: 1 }),
      item("c", 0, 5, 6, 2),
    ];
    const oldA = item("a", 0, 0, 6, 2);
    const newA = item("a", 0, 0, 6, 4);

    const result = resolveResizeCollisions(layout, "a", oldA, newA, 20, 12);

    expect(result).not.toBeNull();
    const b = result!.find(l => l.i === "b")!;
    const c = result!.find(l => l.i === "c")!;

    expect(b.y).toBeGreaterThanOrEqual(4);
    expect(c.y).toBe(5);
    expect(c.h).toBe(2);
  });

  it("6. resized source out of bounds returns null", () => {
    const layout = [item("a", 0, 0, 3, 2)];
    const oldA = item("a", 0, 0, 3, 2);
    const newA = item("a", 0, 0, 15, 2); // exceeds cols=12

    const result = resolveResizeCollisions(layout, "a", oldA, newA, 10, 12);

    expect(result).toBeNull();
  });

  it("7. target pushed out of bounds returns null", () => {
    const layout = [
      item("a", 0, 0, 6, 8),
      item("b", 0, 6, 6, 2, { minH: 2 }),
      item("c", 0, 8, 6, 2, { minH: 2 }),
    ];
    const oldA = item("a", 0, 0, 6, 6);
    const newA = item("a", 0, 0, 6, 8);

    // c would be pushed to y=10, bottom=12, exceeding maxRows=10
    const result = resolveResizeCollisions(layout, "a", oldA, newA, 10, 12);

    expect(result).toBeNull();
  });
});
