/**
 * Compactor implementations.
 *
 * Compactors are pluggable strategies for removing gaps between grid items.
 * Use the Compactor interface to create custom compaction algorithms.
 *
 * The vertical and horizontal compactors use optimized "rising tide" / "sweeping
 * tide" algorithms with O(n log n) complexity (dominated by sorting).
 *
 * Based on the algorithm from PR #2152 by Morris Brodersen (@morris).
 */

import type {
  Compactor,
  CompactType,
  Layout,
  LayoutItem,
  Mutable
} from "../types/index.js";
import { collides } from "../spatial/index.js";
import { cloneLayout } from "../layout/index.js";

// ============================================================================
// Vertical Compaction — "Rising Tide" Algorithm
// ============================================================================

/**
 * Fast vertical compaction using a "rising tide" algorithm.
 *
 * The algorithm works by:
 * 1. Sorting items by (y, x, static) — top-to-bottom, left-to-right
 * 2. Maintaining a "tide" array that tracks the highest occupied row per column
 * 3. For each item, moving it up to meet the tide (closing gaps)
 * 4. Checking for collisions with static items and adjusting as needed
 *
 * Complexity: O(n log n) — dominated by the initial sort.
 *
 * @param layout - The layout to compact (will be modified in place)
 * @param cols - Number of columns in the grid
 * @param allowOverlap - Whether to allow overlapping items
 */
function compactVerticalFast(
  layout: LayoutItem[],
  cols: number,
  allowOverlap: boolean
): void {
  const numItems = layout.length;

  // Sort items by position: top-to-bottom, left-to-right
  // Static items are sorted first at each position to reduce collision checks
  layout.sort((a, b) => {
    if (a.y < b.y) return -1;
    if (a.y > b.y) return 1;
    if (a.x < b.x) return -1;
    if (a.x > b.x) return 1;
    // Static items sorted first to reduce collision checks
    if (a.static && !b.static) return -1;
    if (!a.static && b.static) return 1;
    return 0;
  });

  // "Rising tide" — tracks the highest blocked row per column
  const tide: number[] = new Array(cols).fill(0);

  // Collect static items for collision checking
  const staticItems = layout.filter(item => item.static);
  const numStatics = staticItems.length;
  let staticOffset = 0;

  for (let i = 0; i < numItems; i++) {
    const item = layout[i] as Mutable<LayoutItem>;

    // Clamp x2 to grid bounds
    let x2 = item.x + item.w;
    if (x2 > cols) {
      x2 = cols;
    }

    if (item.static) {
      // Static items don't move; they become part of the tide
      // and don't need collision checks against themselves
      ++staticOffset;
    } else {
      // Find the minimum gap between the item and the tide
      let minGap = Infinity;
      for (let x = item.x; x < x2; ++x) {
        const tideValue = tide[x] ?? 0;
        const gap = item.y - tideValue;
        if (gap < minGap) {
          minGap = gap;
        }
      }

      // Close the gap (move item up to meet the tide)
      if (!allowOverlap || minGap > 0) {
        item.y -= minGap;
      }

      // Handle collisions with static items
      for (let j = staticOffset; !allowOverlap && j < numStatics; ++j) {
        const staticItem = staticItems[j];
        if (staticItem === undefined) continue;

        // Early exit: if static item is below current item, no more collisions possible
        if (staticItem.y >= item.y + item.h) {
          break;
        }

        if (collides(item, staticItem)) {
          // Move current item below the static item
          item.y = staticItem.y + staticItem.h;

          if (j > staticOffset) {
            // Item was moved; need to recheck with earlier static items
            j = staticOffset;
          }
        }
      }

      // Reset moved flag
      item.moved = false;
    }

    // Update tide: mark columns as blocked up to item's bottom
    const t = item.y + item.h;
    for (let x = item.x; x < x2; ++x) {
      const currentTide = tide[x] ?? 0;
      if (currentTide < t) {
        tide[x] = t;
      }
    }
  }
}

// ============================================================================
// Horizontal Compaction — "Sweeping Tide" Algorithm
// ============================================================================

/**
 * Ensure the tide array has enough rows.
 */
function ensureTideRows(tide: number[], neededRows: number): void {
  while (tide.length < neededRows) {
    tide.push(0);
  }
}

/**
 * Find the maximum tide value for a range of rows.
 */
function getMaxTideForItem(tide: number[], y: number, h: number): number {
  let maxTide = 0;
  for (let row = y; row < y + h; row++) {
    const tideValue = tide[row] ?? 0;
    if (tideValue > maxTide) {
      maxTide = tideValue;
    }
  }
  return maxTide;
}

/**
 * Check if an item can be placed at a given position without colliding with static items.
 */
function canPlaceAt(
  item: LayoutItem,
  x: number,
  y: number,
  staticItems: LayoutItem[],
  cols: number
): boolean {
  // Check grid bounds
  if (x + item.w > cols) return false;

  // Check static collisions using the same AABB logic
  for (const staticItem of staticItems) {
    if (
      x < staticItem.x + staticItem.w &&
      x + item.w > staticItem.x &&
      y < staticItem.y + staticItem.h &&
      y + item.h > staticItem.y
    ) {
      return false;
    }
  }
  return true;
}

/**
 * Fast horizontal compaction using a "sweeping tide" algorithm with row wrapping.
 *
 * The algorithm works by:
 * 1. Sorting items by (x, y, static) — left-to-right, top-to-bottom
 * 2. Maintaining a "tide" array that tracks the rightmost occupied column per row
 * 3. For each item, finding the leftmost position it can occupy
 * 4. If the item doesn't fit in its current row, wrapping to the next row
 * 5. Checking for collisions with static items and adjusting as needed
 *
 * Complexity: O(n log n) — dominated by the initial sort.
 *
 * @param layout - The layout to compact (will be modified in place)
 * @param cols - Number of columns in the grid
 * @param allowOverlap - Whether to allow overlapping items
 */
function compactHorizontalFast(
  layout: LayoutItem[],
  cols: number,
  allowOverlap: boolean
): void {
  const numItems = layout.length;
  if (numItems === 0) return;

  // Correct negative positions first (matching legacy behavior)
  for (let i = 0; i < numItems; i++) {
    const item = layout[i] as Mutable<LayoutItem>;
    if (item && !item.static) {
      item.x = Math.max(item.x, 0);
      item.y = Math.max(item.y, 0);
    }
  }

  // Sort items by column then row (same as standard horizontal compactor)
  // Static items are sorted first at each position to reduce collision checks
  layout.sort((a, b) => {
    if (a.x !== b.x) return a.x - b.x;
    if (a.y !== b.y) return a.y - b.y;
    if (a.static !== b.static) return a.static ? -1 : 1;
    return 0;
  });

  // Calculate max row extent for pre-allocation
  let maxRow = 0;
  for (let i = 0; i < numItems; i++) {
    const item = layout[i];
    if (item !== undefined) {
      const bottom = item.y + item.h;
      if (bottom > maxRow) maxRow = bottom;
    }
  }

  // "Sweeping tide" — tracks the rightmost blocked column per row
  // Pre-allocate based on max row extent to avoid repeated reallocations
  const tide: number[] = new Array(maxRow).fill(0);

  // Collect static items for collision checking
  const staticItems = layout.filter(item => item.static);

  // Safety limit for row wrapping (prevents infinite loops)
  const maxRowLimit = Math.max(10_000, numItems * 100);

  for (let i = 0; i < numItems; i++) {
    const item = layout[i] as Mutable<LayoutItem>;

    if (item.static) {
      // Static items don't move; they become part of the tide
      ensureTideRows(tide, item.y + item.h);
      const t = item.x + item.w;
      for (let y = item.y; y < item.y + item.h; y++) {
        if ((tide[y] ?? 0) < t) {
          tide[y] = t;
        }
      }
      continue;
    }

    // For non-static items, find the best position
    let targetY = item.y;
    let targetX = 0;
    let placed = false;

    // Try to place the item, wrapping to lower rows if needed
    while (!placed) {
      ensureTideRows(tide, targetY + item.h);

      // Find the maximum tide across the rows this item spans
      const maxTide = getMaxTideForItem(tide, targetY, item.h);

      // Try to place at the tide position
      targetX = maxTide;

      // Check if item fits within grid bounds
      if (targetX + item.w <= cols) {
        // Check for static item collisions
        if (
          allowOverlap ||
          canPlaceAt(item, targetX, targetY, staticItems, cols)
        ) {
          placed = true;
        } else {
          // Find the rightmost static collision and try past it
          let maxStaticRight = targetX;
          let foundCollision = false;
          for (const staticItem of staticItems) {
            if (
              targetX < staticItem.x + staticItem.w &&
              targetX + item.w > staticItem.x &&
              targetY < staticItem.y + staticItem.h &&
              targetY + item.h > staticItem.y
            ) {
              maxStaticRight = Math.max(
                maxStaticRight,
                staticItem.x + staticItem.w
              );
              foundCollision = true;
            }
          }
          if (foundCollision) {
            targetX = maxStaticRight;
          }

          // After moving past static, check if we still fit
          if (foundCollision && targetX + item.w <= cols) {
            // Verify no more collisions at new position
            if (canPlaceAt(item, targetX, targetY, staticItems, cols)) {
              placed = true;
            } else {
              // Can't fit in this row, wrap to next
              targetY++;
            }
          } else if (foundCollision) {
            // Pushed past grid edge, wrap to next row
            targetY++;
          } else {
            // No collision but can't place — shouldn't happen
            placed = true;
          }
        }
      } else {
        // Doesn't fit in this row, wrap to next
        targetY++;
      }

      // Safety check to prevent infinite loops
      if (targetY > maxRowLimit) {
        if (typeof console !== "undefined" && console.warn) {
          console.warn(
            `Horizontal compactor: Item "${item.i}" exceeded max row limit (${targetY}). ` +
              `This may indicate a layout that cannot be compacted within grid bounds.`
          );
        }
        // Give up and place at current position
        targetX = 0;
        placed = true;
      }
    }

    // Update item position
    item.x = targetX;
    item.y = targetY;
    item.moved = false;

    // Update tide: mark rows as blocked up to item's right edge
    ensureTideRows(tide, targetY + item.h);
    const t = targetX + item.w;
    for (let y = targetY; y < targetY + item.h; y++) {
      if ((tide[y] ?? 0) < t) {
        tide[y] = t;
      }
    }
  }
}

// ============================================================================
// Vertical Compactors
// ============================================================================

/**
 * Vertical compactor — moves items up to fill gaps.
 *
 * Uses an optimized "rising tide" algorithm with O(n log n) complexity.
 * Items are sorted top-to-bottom, left-to-right, and each item is moved
 * as far up as possible without overlapping other items.
 *
 * This is the default compaction mode for react-grid-layout.
 */
export const verticalCompactor: Compactor = {
  type: "vertical",
  allowOverlap: false,

  compact(layout: Layout, cols: number): Layout {
    // Build index map to preserve original array ordering
    const indexMap = new Map<string, number>();
    for (let i = 0; i < layout.length; i++) {
      const item = layout[i];
      if (item) indexMap.set(item.i, i);
    }

    const working = cloneLayout(layout) as LayoutItem[];
    compactVerticalFast(working, cols, false);

    // Restore original array ordering
    const out: LayoutItem[] = new Array(layout.length);
    for (const item of working) {
      const originalIdx = indexMap.get(item.i);
      if (originalIdx !== undefined) {
        out[originalIdx] = item;
      }
    }
    return out;
  }
};

/**
 * Vertical compactor that allows overlapping items.
 *
 * Items are cloned without movement — they stay where placed.
 * MUST clear moved flags for drag-frame consistency.
 */
export const verticalOverlapCompactor: Compactor = {
  ...verticalCompactor,
  allowOverlap: true,

  compact(layout: Layout, _cols: number): Layout {
    const out = cloneLayout(layout);
    for (let i = 0; i < out.length; i++) {
      const item = out[i];
      if (item) item.moved = false;
    }
    return out;
  }
};

// ============================================================================
// Horizontal Compactors
// ============================================================================

/**
 * Horizontal compactor — moves items left to fill gaps.
 *
 * Uses an optimized "sweeping tide" algorithm with O(n log n) complexity.
 * Items are sorted left-to-right, top-to-bottom, and each item is moved
 * as far left as possible without overlapping other items. Wraps to the
 * next row on overflow.
 */
export const horizontalCompactor: Compactor = {
  type: "horizontal",
  allowOverlap: false,

  compact(layout: Layout, cols: number): Layout {
    // Build index map to preserve original array ordering
    const indexMap = new Map<string, number>();
    for (let i = 0; i < layout.length; i++) {
      const item = layout[i];
      if (item) indexMap.set(item.i, i);
    }

    const working = cloneLayout(layout) as LayoutItem[];
    compactHorizontalFast(working, cols, false);

    // Restore original array ordering
    const out: LayoutItem[] = new Array(layout.length);
    for (const item of working) {
      const originalIdx = indexMap.get(item.i);
      if (originalIdx !== undefined) {
        out[originalIdx] = item;
      }
    }
    return out;
  }
};

/**
 * Horizontal compactor that allows overlapping items.
 */
export const horizontalOverlapCompactor: Compactor = {
  ...horizontalCompactor,
  allowOverlap: true,

  compact(layout: Layout, _cols: number): Layout {
    const out = cloneLayout(layout);
    for (let i = 0; i < out.length; i++) {
      const item = out[i];
      if (item) item.moved = false;
    }
    return out;
  }
};

// ============================================================================
// No Compaction
// ============================================================================

/**
 * No compaction — items stay where placed.
 *
 * Use this for free-form layouts where items can be placed anywhere.
 * Items will not automatically move to fill gaps.
 */
export const noCompactor: Compactor = {
  type: null,
  allowOverlap: false,

  compact(layout: Layout, _cols: number): Layout {
    // No compaction — just clone to maintain immutability
    // MUST clear the moved flag so items can be pushed again in subsequent drag frames
    const out = cloneLayout(layout);
    for (let i = 0; i < out.length; i++) {
      const item = out[i];
      if (item) item.moved = false;
    }
    return out;
  }
};

/**
 * No compaction, with overlapping allowed.
 *
 * Items stay where placed and can overlap each other.
 */
export const noOverlapCompactor: Compactor = {
  ...noCompactor,
  allowOverlap: true
};

// ============================================================================
// Factory Function
// ============================================================================

/**
 * Get a compactor by type.
 *
 * This is a convenience function for backwards compatibility with the
 * string-based compactType API.
 *
 * Note: For 'wrap' mode, import `wrapCompactor` from 'react-grid-layout/extras'
 * and pass it directly to the `compactor` prop. This function returns
 * `noCompactor` for 'wrap' type since the wrap compactor is tree-shakeable.
 *
 * @param compactType - 'vertical', 'horizontal', 'wrap', or null
 * @param allowOverlap - Whether to allow overlapping items
 * @returns The appropriate Compactor
 */
export function getCompactor(
  compactType: CompactType,
  allowOverlap: boolean = false,
  preventCollision: boolean = false
): Compactor {
  let baseCompactor: Compactor;

  if (allowOverlap) {
    if (compactType === "vertical") baseCompactor = verticalOverlapCompactor;
    else if (compactType === "horizontal")
      baseCompactor = horizontalOverlapCompactor;
    else baseCompactor = noOverlapCompactor;
  } else {
    if (compactType === "vertical") baseCompactor = verticalCompactor;
    else if (compactType === "horizontal") baseCompactor = horizontalCompactor;
    // For 'wrap' and null, use noCompactor
    // Users wanting wrap mode should import wrapCompactor from extras
    else baseCompactor = noCompactor;
  }

  // Return with preventCollision if specified
  if (preventCollision) {
    return { ...baseCompactor, preventCollision };
  }
  return baseCompactor;
}
