/**
 * Proportional Layout Conversion — Pure Functions
 *
 * Converts between absolute grid coordinates ({x, y, w, h} in integer grid units)
 * and proportional fractions ({xF, yF, wF, hF} as 0..1 floats relative to grid size).
 *
 * Proportional layouts are screen-independent: a widget at wF=0.5 is always
 * half the grid width regardless of the actual column count. This enables
 * cross-screen portability — layouts saved on a 24-col monitor render correctly
 * on a 12-col laptop.
 *
 * Design decisions:
 * - Full proportional (Approach A): both x/w AND y/h are fractional.
 *   This ensures vertical portability across different maxRows.
 * - Reference for vertical: maxRows from adaptive metrics (Option 1).
 *   "What you see is what you save."
 * - Conversion is pure — no overlap resolution. Use repairLayout() after
 *   fromProportionalLayout() to fix rounding artifacts.
 *
 * @see 2A.9.extra-1_Adaptive_Grid_System.md — Session 4 (Proportional Layout Spike)
 */

import type { LayoutItem } from "../types/layout.js";

// ── Types ────────────────────────────────────────────────

/**
 * Proportional coordinates — all values are fractions in the range [0, 1].
 *
 * - xF: horizontal position as fraction of total cols
 * - yF: vertical position as fraction of total rows (maxRows)
 * - wF: width as fraction of total cols
 * - hF: height as fraction of total rows (maxRows)
 */
export interface ProportionalCoords {
  xF: number;
  yF: number;
  wF: number;
  hF: number;
}

/**
 * Proportional layout item — a LayoutItem's identity + proportional coords.
 */
export interface ProportionalLayoutItem extends ProportionalCoords {
  /** Item identifier (same as LayoutItem.i) */
  i: string;
}

/**
 * Grid context for conversion. Defines the grid dimensions to convert
 * between absolute and proportional coordinates.
 */
export interface GridContext {
  /** Number of columns in the grid */
  cols: number;
  /** Number of rows in the grid (from adaptive metrics or manual config) */
  maxRows: number;
}

// ── Single-Item Conversion ───────────────────────────────

/**
 * Convert a single layout item to proportional coordinates.
 *
 * @param item - Layout item with absolute grid coordinates
 * @param ctx - Grid context (cols, maxRows) for the current grid
 * @returns Proportional coordinates (xF, yF, wF, hF) in [0, 1]
 *
 * @example
 * ```ts
 * toProportional({ i: "a", x: 6, y: 3, w: 6, h: 3 }, { cols: 12, maxRows: 12 })
 * // → { xF: 0.5, yF: 0.25, wF: 0.5, hF: 0.25 }
 * ```
 */
export function toProportional(
  item: Pick<LayoutItem, "x" | "y" | "w" | "h">,
  ctx: GridContext,
): ProportionalCoords {
  const { cols, maxRows } = ctx;

  // Guard: avoid division by zero. If cols or maxRows is 0, fractions
  // would be Infinity/NaN. Return 0/0/1/1 as a safe fallback.
  if (cols <= 0 || maxRows <= 0) {
    return { xF: 0, yF: 0, wF: 1, hF: 1 };
  }

  return {
    xF: item.x / cols,
    yF: item.y / maxRows,
    wF: item.w / cols,
    hF: item.h / maxRows,
  };
}

/**
 * Convert proportional coordinates back to absolute grid coordinates.
 *
 * Rounds to nearest integer. Clamps w/h to minimum 1, and ensures
 * x+w ≤ cols and y+h ≤ maxRows.
 *
 * @param frac - Proportional coordinates
 * @param ctx - Target grid context (may differ from the original)
 * @returns Absolute coordinates { x, y, w, h } as integers
 *
 * @example
 * ```ts
 * fromProportional({ xF: 0.5, yF: 0.25, wF: 0.5, hF: 0.25 }, { cols: 24, maxRows: 17 })
 * // → { x: 12, y: 4, w: 12, h: 4 }
 * ```
 */
export function fromProportional(
  frac: ProportionalCoords,
  ctx: GridContext,
): { x: number; y: number; w: number; h: number } {
  const { cols, maxRows } = ctx;

  // Guard: degenerate grids
  if (cols <= 0 || maxRows <= 0) {
    return { x: 0, y: 0, w: 1, h: 1 };
  }

  // Round to nearest integer, then enforce minimum size
  let w = Math.max(1, Math.round(frac.wF * cols));
  let h = Math.max(1, Math.round(frac.hF * maxRows));
  let x = Math.round(frac.xF * cols);
  let y = Math.round(frac.yF * maxRows);

  // Clamp position to non-negative
  x = Math.max(0, x);
  y = Math.max(0, y);

  // Clamp to grid bounds — item can't extend past edges
  if (x + w > cols) {
    // Try shifting left first, then shrink if still overflows
    x = Math.max(0, cols - w);
    if (x + w > cols) {
      w = cols - x;
    }
  }
  if (y + h > maxRows) {
    y = Math.max(0, maxRows - h);
    if (y + h > maxRows) {
      h = maxRows - y;
    }
  }

  return { x, y, w, h };
}

// ── Layout-Level Conversion ──────────────────────────────

/**
 * Convert an entire layout to proportional coordinates.
 *
 * @param layout - Array of layout items with absolute coordinates
 * @param ctx - Grid context for the current grid
 * @returns Array of proportional layout items (with identifiers preserved)
 */
export function toProportionalLayout(
  layout: readonly LayoutItem[],
  ctx: GridContext,
): ProportionalLayoutItem[] {
  return layout.map((item) => ({
    i: item.i,
    ...toProportional(item, ctx),
  }));
}

/**
 * Convert an entire proportional layout back to absolute coordinates.
 *
 * Preserves all non-coordinate properties from the original layout items
 * (minW, minH, maxW, maxH, static, etc.) when an originals map is provided.
 *
 * @param proportional - Array of proportional layout items
 * @param ctx - Target grid context (may differ from original)
 * @param originals - Optional map of original LayoutItems keyed by `i`,
 *   used to carry forward non-coordinate properties (minW, minH, etc.)
 * @returns Array of LayoutItems with absolute coordinates
 */
export function fromProportionalLayout(
  proportional: readonly ProportionalLayoutItem[],
  ctx: GridContext,
  originals?: ReadonlyMap<string, LayoutItem>,
): LayoutItem[] {
  return proportional.map((pItem) => {
    const coords = fromProportional(pItem, ctx);
    const original = originals?.get(pItem.i);

    if (original) {
      // Carry forward all non-coordinate properties
      return { ...original, ...coords };
    }

    return { i: pItem.i, ...coords };
  });
}

/**
 * Compute the total occupied rows in a layout (max y + h across all items).
 * Useful as a fallback reference when maxRows is Infinity.
 *
 * @param layout - Layout to measure
 * @returns The bottom edge of the lowest item, or 0 for empty layouts
 */
export function totalOccupiedRows(layout: readonly LayoutItem[]): number {
  let max = 0;
  for (const item of layout) {
    const bottom = item.y + item.h;
    if (bottom > max) max = bottom;
  }
  return max;
}
