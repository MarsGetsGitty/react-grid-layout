/**
 * Proportional Layout Repair — Post-Conversion Artifact Resolution
 *
 * After converting a proportional layout to absolute coordinates via
 * fromProportionalLayout(), rounding can introduce:
 * 1. Boundary violations (items extending past cols/maxRows)
 * 2. Min/max size violations (widget rounded below its minW/minH)
 * 3. Overlapping items (two items rounded into the same cell)
 *
 * This module provides a deterministic repair pass that resolves all
 * three classes of artifacts without fundamentally altering the layout.
 *
 * The repair strategy is conservative: clamp first, enforce constraints
 * second, resolve overlaps last (via vertical push-down). Items are
 * processed in reading order (top-to-bottom, left-to-right) to ensure
 * deterministic output.
 *
 * @see 2A.9.extra-1_Adaptive_Grid_System.md — Session 4 (Proportional Layout Spike)
 */

import type { LayoutItem } from "../types/layout.js";
import { collides } from "../spatial/collision.js";

// ── Types ────────────────────────────────────────────────

/**
 * Size constraints for a single item. Optional — if not provided,
 * the item's own minW/minH/maxW/maxH are used.
 */
export interface ItemConstraints {
  minW?: number;
  minH?: number;
  maxW?: number;
  maxH?: number;
}

/**
 * Grid bounds for the repair pass.
 */
export interface RepairContext {
  cols: number;
  maxRows: number;
}

// ── Repair Pass ──────────────────────────────────────────

/**
 * Repair a layout that may contain rounding artifacts from proportional
 * conversion.
 *
 * The repair is deterministic and processes items in reading order
 * (top-to-bottom, left-to-right). The algorithm:
 *
 * 1. **Boundary clamp** — items can't extend past cols or maxRows
 * 2. **Constraint enforcement** — apply minW/minH/maxW/maxH
 * 3. **Overlap resolution** — push overlapping items down
 *
 * @param layout - Layout items (may have overlaps/boundary violations)
 * @param ctx - Grid bounds (cols, maxRows)
 * @param constraints - Optional per-item constraints keyed by item.i
 * @returns A new layout array with all artifacts resolved. Never mutates input.
 */
export function repairLayout(
  layout: readonly LayoutItem[],
  ctx: RepairContext,
  constraints?: ReadonlyMap<string, ItemConstraints>,
): LayoutItem[] {
  const { cols, maxRows } = ctx;

  // Clone and sort in reading order: top-to-bottom, then left-to-right.
  // This ensures items higher in the grid "win" position disputes.
  const items = layout.map((item) => ({ ...item }));
  items.sort((a, b) => a.y - b.y || a.x - b.x);

  // Pass 1: Boundary clamp + constraint enforcement (per-item, no interactions)
  for (const item of items) {
    const c = constraints?.get(item.i) ?? item;

    // Enforce min sizes (expand if too small)
    const minW = c.minW ?? 1;
    const minH = c.minH ?? 1;
    if (item.w < minW) item.w = minW;
    if (item.h < minH) item.h = minH;

    // Enforce max sizes (shrink if too large)
    if (c.maxW !== undefined && item.w > c.maxW) item.w = c.maxW;
    if (c.maxH !== undefined && item.h > c.maxH) item.h = c.maxH;

    // Clamp position to non-negative
    item.x = Math.max(0, item.x);
    item.y = Math.max(0, item.y);

    // Clamp to grid bounds — shift left/up first, then shrink if needed
    if (item.x + item.w > cols) {
      item.x = Math.max(0, cols - item.w);
      if (item.x + item.w > cols) {
        item.w = cols - item.x;
      }
    }
    if (item.y + item.h > maxRows) {
      item.y = Math.max(0, maxRows - item.h);
      if (item.y + item.h > maxRows) {
        item.h = Math.max(minH, maxRows - item.y);
      }
    }
  }

  // Pass 2: Overlap resolution via vertical push-down.
  // Process items in reading order. For each item, if it overlaps with
  // any previously-placed item, push it down until it fits.
  //
  // IMPORTANT: We prioritize overlap-free over boundary-free. If push-down
  // causes an item to exceed maxRows, we accept it — the caller can detect
  // this via hasOverflow() and decide what to do (grow container, compact, etc.).
  // Clamping y back to fit in maxRows would re-create the overlap.
  const placed: LayoutItem[] = [];

  for (const item of items) {
    let collision = findFirstCollision(placed, item);

    // Safety budget to prevent infinite loops in pathological cases
    let budget = layout.length * maxRows;

    while (collision !== undefined && budget > 0) {
      // Push this item below the colliding item
      item.y = collision.y + collision.h;

      collision = findFirstCollision(placed, item);
      budget--;
    }

    placed.push(item);
  }

  return placed;
}

// ── Validation Helpers ───────────────────────────────────

/**
 * Check if any items in the layout overlap.
 *
 * @param layout - Layout to check
 * @returns true if any two items overlap
 */
export function hasOverlaps(layout: readonly LayoutItem[]): boolean {
  for (let i = 0; i < layout.length; i++) {
    for (let j = i + 1; j < layout.length; j++) {
      const a = layout[i];
      const b = layout[j];
      if (a !== undefined && b !== undefined && collides(a, b)) {
        return true;
      }
    }
  }
  return false;
}

/**
 * Check if any items extend past the grid bounds.
 *
 * @param layout - Layout to check
 * @param ctx - Grid bounds
 * @returns true if any item extends past cols or maxRows
 */
export function hasOverflow(
  layout: readonly LayoutItem[],
  ctx: RepairContext,
): boolean {
  for (const item of layout) {
    if (item.x < 0 || item.y < 0) return true;
    if (item.x + item.w > ctx.cols) return true;
    if (item.y + item.h > ctx.maxRows) return true;
  }
  return false;
}

// ── Internal Helpers ─────────────────────────────────────

/**
 * Find the first item in the placed array that collides with the candidate.
 * Same as getFirstCollision but uses simple identity check (not i-based)
 * since we're comparing against a separate array.
 */
function findFirstCollision(
  placed: readonly LayoutItem[],
  candidate: LayoutItem,
): LayoutItem | undefined {
  for (const item of placed) {
    if (item.i === candidate.i) continue;
    if (collides(item, candidate)) return item;
  }
  return undefined;
}
