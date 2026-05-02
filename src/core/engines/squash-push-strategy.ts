/**
 * squashPushStrategy — Recursive Squash-then-Push Resize Collision Resolution
 *
 * Pure function: given a layout after a resize operation, resolves all
 * collisions by first squashing overlapping widgets (reducing their size
 * toward minH/minW), then pushing them along the resize axis, and finally
 * checking boundary constraints. If any widget would leave the viewport,
 * the entire operation is rejected (returns null).
 *
 * Algorithm:
 *  1. Infer resize direction from oldItem vs newItem deltas
 *  2. For each axis with a delta, run recursive collision resolution:
 *     a. Calculate directional penetration depth (minimum displacement
 *        in the push direction to fully separate source and target)
 *     b. SQUASH: reduce target size toward its min, absorbing penetration
 *     c. PUSH: slide target along the axis for remaining penetration
 *     d. BOUNDARY CHECK: reject if target exits viewport
 *     e. RECURSE: if pushing created new collisions, repeat for those
 *
 * Collision filtering uses swept active-edge interval overlap to ensure
 * only targets in the path of the expanding/moving edge are processed.
 * This prevents "backfire" — accidentally pushing wrong-side widgets.
 *
 * Cycle prevention relies on monotonic push direction under the
 * directional separation invariant, with depth and work-budget guards
 * as safety valves for malformed layouts or zero/invalid dimensions.
 *
 * @see smart_physics_engine_design.md §3
 * @module core/engines/squash-push-strategy
 */

import { getAllCollisions } from "../spatial/collision.js";
import type { LayoutItem } from "../types/index.js";

// ── Direction Inference ──────────────────────────────────

interface ResizeAxes {
  vertical: "n" | "s" | null;
  horizontal: "w" | "e" | null;
}

/**
 * Infer which resize handle is being used by comparing the item
 * state before and after the resize. Each handle produces a unique
 * delta signature, so inference is deterministic.
 */
export function inferResizeHandles(
  oldItem: LayoutItem,
  newItem: LayoutItem,
): ResizeAxes {
  let vertical: "n" | "s" | null = null;
  let horizontal: "w" | "e" | null = null;

  // Vertical axis
  if (newItem.y < oldItem.y) {
    vertical = "n"; // y decreased → north handle (widget grew upward)
  } else if (newItem.h > oldItem.h) {
    vertical = "s"; // h increased with same y → south handle
  } else if (newItem.h < oldItem.h && newItem.y > oldItem.y) {
    vertical = "n"; // h decreased and y increased → north handle (shrinking from top)
  }

  // Horizontal axis
  if (newItem.x < oldItem.x) {
    horizontal = "w"; // x decreased → west handle (widget grew leftward)
  } else if (newItem.w > oldItem.w) {
    horizontal = "e"; // w increased with same x → east handle
  } else if (newItem.w < oldItem.w && newItem.x > oldItem.x) {
    horizontal = "w"; // w decreased and x increased → west handle
  }

  return { vertical, horizontal };
}

// ── Penetration Depth ────────────────────────────────────

/**
 * Calculate the minimum displacement in the push direction needed to
 * fully separate the target from the source.
 *
 * Unlike intersection area (which underestimates when the target is
 * fully contained), penetration depth always gives the exact clearance
 * distance for the given push direction.
 *
 * Assumptions (must hold for correctness):
 *  1. Push direction is constant throughout the resolution chain.
 *  2. Both source and target have strictly positive size on the axis.
 */
function penetrationDepth(
  source: LayoutItem,
  target: LayoutItem,
  axis: "vertical" | "horizontal",
  direction: 1 | -1,
): number {
  if (axis === "vertical") {
    if (direction > 0) {
      // South: target must clear source's bottom edge
      return Math.max(0, (source.y + source.h) - target.y);
    } else {
      // North: target must clear source's top edge
      return Math.max(0, (target.y + target.h) - source.y);
    }
  } else {
    if (direction > 0) {
      // East: target must clear source's right edge
      return Math.max(0, (source.x + source.w) - target.x);
    } else {
      // West: target must clear source's left edge
      return Math.max(0, (target.x + target.w) - source.x);
    }
  }
}

// ── Work Budget ──────────────────────────────────────────

/**
 * Mutable work budget shared across all recursive branches.
 * Prevents excessive repeated work in dense diamond-shaped cascades
 * where removing the visited set allows the same downstream node
 * to be processed through multiple paths.
 */
interface WorkBudget {
  remaining: number;
}

// ── Single-Axis Collision Resolution ─────────────────────

/**
 * Resolve all collisions caused by `source` along a single axis.
 * Mutates `layout` items in place (caller must clone first).
 *
 * @param sweptLo - Lower bound of the source's swept active-edge band
 * @param sweptHi - Upper bound of the source's swept active-edge band
 * @returns true if all collisions resolved within bounds, false if
 *          boundary hit or work budget exhausted.
 *
 * Monotonicity argument (cycle avoidance):
 *  Under the directional separation invariant, each push moves the target
 *  strictly further in the push direction, so the chain of positions is
 *  monotonically increasing and cycles cannot form. However, pure-squash
 *  steps (where the target shrinks but does not translate) do not advance
 *  the active edge, so this argument is not a complete formal proof.
 *  The depth and work-budget guards remain necessary for safety in:
 *   - Malformed layouts with zero or negative dimensions
 *   - Dense repeated cascades (diamond-shaped collision graphs)
 *   - Any edge case where the separation invariant is violated
 */
function resolveAxisCollisions(
  layout: LayoutItem[],
  source: LayoutItem,
  axis: "vertical" | "horizontal",
  direction: 1 | -1,
  maxRows: number,
  cols: number,
  depth: number,
  budget: WorkBudget,
  sweptLo: number,
  sweptHi: number,
): boolean {
  // Safety valves: depth prevents stack overflow, budget prevents
  // excessive work in dense diamond cascades
  if (depth > layout.length || budget.remaining <= 0) return false;

  // Empty or reversed swept interval means no edge movement occurred
  // (e.g. pure squash with no translation). Nothing to resolve.
  if (sweptLo >= sweptHi) return true;

  // Find all collisions, then filter to only targets that intersect
  // the swept active-edge band. This prevents the "backfire" bug where
  // a south resize accidentally pushes a widget overlapping the top.
  const collisions = getAllCollisions(layout, source)
    .filter(item => {
      if (item.i === source.i) return false;

      // Swept active-edge interval overlap:
      // Only process targets whose bounding box intersects [sweptLo, sweptHi)
      if (axis === "vertical") {
        return item.y < sweptHi && item.y + item.h > sweptLo;
      } else {
        return item.x < sweptHi && item.x + item.w > sweptLo;
      }
    });

  if (collisions.length === 0) return true;

  for (const target of collisions) {
    if (budget.remaining <= 0) return false;
    budget.remaining--;

    // Directional penetration depth: the exact displacement needed to
    // fully separate target from source in the push direction.
    // Unlike intersection area, this is correct even when the target
    // is fully contained inside the source ("swallow" case).
    let displacement = penetrationDepth(source, target, axis, direction);
    if (displacement <= 0) continue;

    // Snapshot target's active edge BEFORE mutation (for recursive swept-edge)
    const oldTargetEdge = direction > 0
      ? (axis === "vertical" ? target.y + target.h : target.x + target.w)
      : (axis === "vertical" ? target.y : target.x);

    // ── Phase 1: Squash ──────────────────────────────
    if (axis === "vertical") {
      const minH = target.minH ?? 1;
      const squashable = target.h - minH;
      const squashAmount = Math.min(displacement, squashable);

      if (squashAmount > 0) {
        target.h -= squashAmount;
        if (direction > 0) {
          // South resize: squash eats the top of target
          target.y += squashAmount;
        }
        // North resize: squash eats the bottom (y stays, h shrinks)
        displacement -= squashAmount;
      }
    } else {
      const minW = target.minW ?? 1;
      const squashable = target.w - minW;
      const squashAmount = Math.min(displacement, squashable);

      if (squashAmount > 0) {
        target.w -= squashAmount;
        if (direction > 0) {
          // East resize: squash eats the left of target
          target.x += squashAmount;
        }
        // West resize: squash eats the right (x stays, w shrinks)
        displacement -= squashAmount;
      }
    }

    // ── Phase 2: Push ────────────────────────────────
    if (displacement > 0) {
      if (axis === "vertical") {
        target.y += direction * displacement;
      } else {
        target.x += direction * displacement;
      }
    }

    // ── Phase 3: Boundary Check ──────────────────────
    if (axis === "vertical") {
      if (target.y + target.h > maxRows || target.y < 0) {
        return false; // Hit viewport boundary — abort everything
      }
    } else {
      if (target.x + target.w > cols || target.x < 0) {
        return false; // Hit viewport boundary — abort everything
      }
    }

    // ── Phase 4: Recurse (chain reaction) ────────────
    // Compute the swept-edge band for the pushed target: the interval
    // between the target's old active edge and its new active edge.
    // This ensures recursive calls only process widgets in the path
    // of the target's movement, not stale overlaps on the wrong side.
    const newTargetEdge = direction > 0
      ? (axis === "vertical" ? target.y + target.h : target.x + target.w)
      : (axis === "vertical" ? target.y : target.x);

    const nextLo = Math.min(oldTargetEdge, newTargetEdge);
    const nextHi = Math.max(oldTargetEdge, newTargetEdge);

    // Skip recursion when the target's active edge didn't move
    // (pure squash, no translation). The inner guard also checks
    // this, but skipping the call avoids unnecessary depth/budget cost.
    if (nextLo < nextHi) {
      if (!resolveAxisCollisions(
        layout, target, axis, direction, maxRows, cols,
        depth + 1, budget, nextLo, nextHi,
      )) {
        return false;
      }
    }
  }

  return true;
}

// ── Public API ───────────────────────────────────────────

/**
 * Resolve all collisions caused by a resize operation.
 *
 * @param layout     - Current layout (will NOT be mutated)
 * @param resizedId  - The `i` of the widget being resized
 * @param oldItem    - Item state BEFORE the resize
 * @param newItem    - Item state AFTER the resize (from RGL callback)
 * @param maxRows    - Maximum rows in the grid (viewport boundary)
 * @param cols       - Number of columns in the grid
 * @returns A new layout with collisions resolved, or `null` if boundary hit.
 */
export function resolveResizeCollisions(
  layout: LayoutItem[],
  resizedId: string,
  oldItem: LayoutItem,
  newItem: LayoutItem,
  maxRows: number,
  cols: number,
): LayoutItem[] | null {
  // Clone layout items first, defensively applying newItem geometry to the
  // resized widget. This must happen BEFORE the no-op check because
  // bottom/right shrinks (h decreases with same y, w decreases with same x)
  // produce no inferred handle but still need the new geometry applied.
  const cloned: LayoutItem[] = layout.map(item =>
    item.i === resizedId ? { ...item, ...newItem } : { ...item },
  );

  const resized = cloned.find(item => item.i === resizedId);
  if (!resized) return null;

  const { vertical, horizontal } = inferResizeHandles(oldItem, newItem);

  // Boundary check on the resized source itself — if it is already
  // out of bounds, reject immediately. This runs before the no-op
  // check so that even non-collision shrinks with invalid geometry
  // are caught.
  if (
    resized.x < 0 ||
    resized.y < 0 ||
    resized.x + resized.w > cols ||
    resized.y + resized.h > maxRows
  ) {
    return null;
  }

  // No collision-causing resize delta — return the cloned layout
  // (which already contains the applied newItem geometry).
  if (!vertical && !horizontal) {
    return cloned;
  }

  // (Boundary check already performed above, before no-op return.)

  // Work budget: caps total collision-resolution steps to prevent
  // runaway processing in dense diamond cascades. The n² base may
  // not suffice for every valid layout, so we use a larger multiplier
  // with a minimum floor.
  const budgetLimit = Math.max(100, layout.length * layout.length * 4);

  // Resolve vertical axis first (if applicable)
  if (vertical) {
    const direction: 1 | -1 = vertical === "s" ? 1 : -1;
    const budget: WorkBudget = { remaining: budgetLimit };

    // Compute the swept active-edge interval for the initial resize.
    // Only targets intersecting this band are candidates for resolution.
    let sweptLo: number;
    let sweptHi: number;
    if (direction > 0) {
      // South: bottom edge swept from old bottom to new bottom
      sweptLo = oldItem.y + oldItem.h;
      sweptHi = resized.y + resized.h;
    } else {
      // North: top edge swept from new top to old top
      sweptLo = resized.y;
      sweptHi = oldItem.y;
    }

    // Skip resolution when swept interval is empty or reversed.
    // This happens on shrink-from-north/shrink-from-west where the
    // active edge moved inward — shrinking should not push anything.
    if (sweptLo < sweptHi) {
      if (!resolveAxisCollisions(
        cloned, resized, "vertical", direction, maxRows, cols,
        0, budget, sweptLo, sweptHi,
      )) {
        return null; // Boundary hit — reject entire resize
      }
    }
  }

  // Resolve horizontal axis second (if applicable)
  if (horizontal) {
    const direction: 1 | -1 = horizontal === "e" ? 1 : -1;
    const budget: WorkBudget = { remaining: budgetLimit };

    let sweptLo: number;
    let sweptHi: number;
    if (direction > 0) {
      // East: right edge swept from old right to new right
      sweptLo = oldItem.x + oldItem.w;
      sweptHi = resized.x + resized.w;
    } else {
      // West: left edge swept from new left to old left
      sweptLo = resized.x;
      sweptHi = oldItem.x;
    }

    // Same empty/reversed interval guard as vertical axis
    if (sweptLo < sweptHi) {
      if (!resolveAxisCollisions(
        cloned, resized, "horizontal", direction, maxRows, cols,
        0, budget, sweptLo, sweptHi,
      )) {
        return null; // Boundary hit — reject entire resize
      }
    }
  }

  return cloned;
}
