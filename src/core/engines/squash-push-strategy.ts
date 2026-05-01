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
 *     a. Calculate overlap between resized widget and each collider
 *     b. SQUASH: reduce collider size toward its min, absorbing overlap
 *     c. PUSH: slide collider along the axis for remaining overlap
 *     d. BOUNDARY CHECK: reject if collider exits viewport
 *     e. RECURSE: if pushing created new collisions, repeat for those
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

// ── Overlap Calculation ──────────────────────────────────

function calculateOverlap(
  source: LayoutItem,
  target: LayoutItem,
  axis: "vertical" | "horizontal",
): number {
  if (axis === "vertical") {
    const sourceBottom = source.y + source.h;
    const targetBottom = target.y + target.h;
    const overlapTop = Math.max(source.y, target.y);
    const overlapBottom = Math.min(sourceBottom, targetBottom);
    return Math.max(0, overlapBottom - overlapTop);
  } else {
    const sourceRight = source.x + source.w;
    const targetRight = target.x + target.w;
    const overlapLeft = Math.max(source.x, target.x);
    const overlapRight = Math.min(sourceRight, targetRight);
    return Math.max(0, overlapRight - overlapLeft);
  }
}

// ── Single-Axis Collision Resolution ─────────────────────

/**
 * Resolve all collisions caused by `source` along a single axis.
 * Mutates `layout` items in place (caller must clone first).
 *
 * @returns true if all collisions resolved within bounds, false if boundary hit.
 */
function resolveAxisCollisions(
  layout: LayoutItem[],
  source: LayoutItem,
  axis: "vertical" | "horizontal",
  direction: 1 | -1,
  maxRows: number,
  cols: number,
  visited: Set<string>,
): boolean {
  const collisions = getAllCollisions(layout, source)
    .filter(item => item.i !== source.i && !visited.has(item.i));

  if (collisions.length === 0) return true;

  for (const target of collisions) {
    visited.add(target.i);

    let overlap = calculateOverlap(source, target, axis);
    if (overlap <= 0) continue;

    // ── Phase 1: Squash ──────────────────────────────
    if (axis === "vertical") {
      const minH = target.minH ?? 1;
      const squashable = target.h - minH;
      const squashAmount = Math.min(overlap, squashable);

      if (squashAmount > 0) {
        target.h -= squashAmount;
        if (direction > 0) {
          // South resize: squash eats the top of target
          target.y += squashAmount;
        }
        // North resize: squash eats the bottom (y stays, h shrinks)
        overlap -= squashAmount;
      }
    } else {
      const minW = target.minW ?? 1;
      const squashable = target.w - minW;
      const squashAmount = Math.min(overlap, squashable);

      if (squashAmount > 0) {
        target.w -= squashAmount;
        if (direction > 0) {
          // East resize: squash eats the left of target
          target.x += squashAmount;
        }
        // West resize: squash eats the right (x stays, w shrinks)
        overlap -= squashAmount;
      }
    }

    // ── Phase 2: Push ────────────────────────────────
    if (overlap > 0) {
      if (axis === "vertical") {
        target.y += direction * overlap;
      } else {
        target.x += direction * overlap;
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
    if (!resolveAxisCollisions(layout, target, axis, direction, maxRows, cols, visited)) {
      return false;
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
  const { vertical, horizontal } = inferResizeHandles(oldItem, newItem);

  // No detectable resize delta — nothing to resolve
  if (!vertical && !horizontal) return layout;

  // Deep clone the layout so we can mutate safely
  const cloned: LayoutItem[] = layout.map(item => ({ ...item }));

  const resized = cloned.find(item => item.i === resizedId);
  if (!resized) return null;

  // Resolve vertical axis first (if applicable)
  if (vertical) {
    const direction: 1 | -1 = vertical === "s" ? 1 : -1;
    const visited = new Set<string>([resizedId]);

    if (!resolveAxisCollisions(cloned, resized, "vertical", direction, maxRows, cols, visited)) {
      return null; // Boundary hit — reject entire resize
    }
  }

  // Resolve horizontal axis second (if applicable)
  if (horizontal) {
    const direction: 1 | -1 = horizontal === "e" ? 1 : -1;
    const visited = new Set<string>([resizedId]);

    if (!resolveAxisCollisions(cloned, resized, "horizontal", direction, maxRows, cols, visited)) {
      return null; // Boundary hit — reject entire resize
    }
  }

  return cloned;
}
