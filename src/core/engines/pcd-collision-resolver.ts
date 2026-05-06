import {
  type CollisionResolver,
  type CollisionResolverContext
} from "../types/events.js";
import { type LayoutItem, type Layout } from "../types/layout.js";
import { trySwap } from "./swap-strategy.js";
import { moveElement } from "../layout/movement.js";
import { getAllCollisions } from "../spatial/collision.js";
import { cloneLayoutItem } from "../layout/utils.js";
import { clamp } from "../math/calculate.js";

import { type Mutable } from "../types/utils.js";

function hasAnyCollisions(layout: LayoutItem[]): boolean {
  return layout.some(item =>
    getAllCollisions(layout, item).some(other => other.i !== item.i)
  );
}

/**
 * Check if a resolved layout has items that were pushed out of bounds
 * by the drag — but were NOT already out of bounds before the drag.
 *
 * Items that were already out of bounds (e.g., from a viewport resize
 * shrinking maxRows while an existing layout is loaded) are NOT treated
 * as violations. This prevents freezing the grid when legacy layouts
 * have items beyond the current viewport.
 */
function hasNewlyInvalidItems(
  resolvedLayout: LayoutItem[],
  previousLayout: LayoutItem[] | Layout,
  maxRows: number
): boolean {
  if (maxRows === Infinity) return false;
  const prevArray = previousLayout as LayoutItem[];
  for (const item of resolvedLayout) {
    if (item.y + item.h > maxRows) {
      const prev = prevArray.find(p => p.i === item.i);
      if (prev && prev.y + prev.h <= maxRows) {
        // This item was in-bounds before the drag but is now out — reject
        return true;
      }
      // Item was already out of bounds — not caused by this drag
    }
  }
  return false;
}

/**
 * A specialized drag collision resolver that orchestrates:
 * 1. Clamp dragged item within vertical boundary (maxRows)
 * 2. Try Swap (1:1 dimension match swap)
 * 3. Try Shrink-to-Fit (if autoResize is enabled and cursor is over an empty gap)
 * 4. Try Push (fallback to moveElement with collision resolution)
 * 5. Reject (returns null)
 *
 * After each resolution strategy, the result is validated against maxRows
 * to ensure no previously-in-bounds items were pushed out of the grid.
 *
 * The tentativeLayout passed by the caller already has the dragged item
 * at its new position. We must account for this when falling back to
 * moveElement, which requires the item to start at its original position
 * so that it detects the move delta and resolves collisions.
 */
export const pcdCollisionResolver: CollisionResolver = (
  tentativeLayout,
  movedItem,
  originalPosition,
  context?: CollisionResolverContext
) => {
  const layoutArray = tentativeLayout as LayoutItem[];

  if (typeof context?.cols !== "number") {
    return null;
  }

  // Normalize optional fields with safe defaults
  const maxRows = context.maxRows ?? Infinity;
  const previousLayout = (context.previousLayout ?? tentativeLayout) as LayoutItem[];

  // ── Step 0: Clamp dragged item within vertical boundary ──
  // This must happen BEFORE any resolution strategy, and must NOT
  // mutate the caller's live layout — only the tentative clone.
  const dragged = layoutArray.find(item => item.i === movedItem.i);
  if (!dragged) return null;

  if (maxRows !== Infinity) {
    if (dragged.h > maxRows) {
      // Item is taller than the entire grid — reject outright
      return null;
    }
    if (dragged.y + dragged.h > maxRows) {
      (dragged as Mutable<LayoutItem>).y = Math.max(0, maxRows - dragged.h);
    }
    if (dragged.y < 0) {
      (dragged as Mutable<LayoutItem>).y = 0;
    }
  }

  // 1. Try swap — if a single same-dimension collision exists, swap positions
  const swapped = trySwap(layoutArray, movedItem.i, originalPosition);
  if (swapped) {
    const swappedArray = swapped as LayoutItem[];
    if (hasAnyCollisions(swappedArray)) return null;
    if (hasNewlyInvalidItems(swappedArray, previousLayout, maxRows)) return null;
    return swapped;
  }

  // Check if there are no collisions (free space move)
  const collisions = getAllCollisions(layoutArray, dragged)
    .filter(item => item.i !== dragged.i);

  if (collisions.length === 0) {
    // No collision at current size — but if autoResize previously shrunk
    // the widget during this drag, try restoring toward original width.
    if (context.dragConfig?.autoResize && context.oldDragItem) {
      const origW = context.oldDragItem.w;
      if (dragged.w < origW) {
        // Find max available width by scanning for the nearest obstacle
        // to the right within the same vertical span.
        let maxW = context.cols - dragged.x;
        for (const obs of layoutArray) {
          if (obs.i === movedItem.i) continue;
          // Skip items outside the vertical span
          if (obs.y >= dragged.y + dragged.h || obs.y + obs.h <= dragged.y) continue;
          // Only obstacles whose left edge is at or beyond our right edge
          if (obs.x >= dragged.x + dragged.w) {
            maxW = Math.min(maxW, obs.x - dragged.x);
          }
        }
        const targetW = Math.min(origW, maxW);
        if (targetW > dragged.w) {
          const restored = layoutArray.map(item => cloneLayoutItem(item));
          const restoredItem = restored.find(item => item.i === movedItem.i);
          if (restoredItem) {
            (restoredItem as Mutable<LayoutItem>).w = targetW;
            return restored;
          }
        }
      }
    }

    // No restoration needed — accept as-is (clone to prevent mutation)
    return layoutArray.map(item => cloneLayoutItem(item));
  }

  // 2. Try Shrink-to-Fit (Smart Grid)
  const cursorPosition = context.cursorPosition;
  if (context.dragConfig?.autoResize && cursorPosition) {
    const cursorOverObstacle = layoutArray.some(item => 
      item.i !== movedItem.i &&
      cursorPosition.x >= item.x && cursorPosition.x < item.x + item.w &&
      cursorPosition.y >= item.y && cursorPosition.y < item.y + item.h
    );

    if (!cursorOverObstacle) {
      // Find items intersecting the vertical span of the dragged widget
      const verticalIntersections = layoutArray.filter(item => 
        item.i !== movedItem.i &&
        item.y < movedItem.y + movedItem.h &&
        item.y + item.h > movedItem.y
      );

      const cursorBlockedByVerticalIntersection = verticalIntersections.some(obs => 
        obs.x <= cursorPosition.x && obs.x + obs.w > cursorPosition.x
      );

      if (!cursorBlockedByVerticalIntersection) {
        let gapStart = 0;
        let gapEnd = context.cols;

        for (const obs of verticalIntersections) {
          if (obs.x + obs.w <= cursorPosition.x) {
            gapStart = Math.max(gapStart, obs.x + obs.w);
          }
          if (obs.x > cursorPosition.x) {
            gapEnd = Math.min(gapEnd, obs.x);
          }
        }

        const minW = movedItem.minW ?? 1;
        const originalW = context.oldDragItem?.w ?? movedItem.w;
        const gapW = gapEnd - gapStart;

        if (gapW >= minW) {
          const targetW = Math.max(minW, Math.min(originalW, gapW));
          
          // Determine the ideal X to stay within the gap and contain the cursor
          let targetX = clamp(movedItem.x, gapStart, gapEnd - targetW);
          if (targetX > cursorPosition.x) targetX = cursorPosition.x;
          if (targetX + targetW <= cursorPosition.x) targetX = cursorPosition.x - targetW + 1;

          const shrinkLayout = layoutArray.map(item => cloneLayoutItem(item));
          const shrinkItem = shrinkLayout.find(item => item.i === movedItem.i);
          if (shrinkItem) {
            shrinkItem.w = targetW;
            shrinkItem.x = targetX;
            
            const remainingCollisions = getAllCollisions(shrinkLayout, shrinkItem)
              .filter(item => item.i !== shrinkItem.i);
            
            if (remainingCollisions.length === 0) {
              if (hasNewlyInvalidItems(shrinkLayout, previousLayout, maxRows)) return null;
              return shrinkLayout; // Success! Shrink-to-fit resolved the collision.
            }
          }
        }
      }
    }
  }

  // 3. Fallback: Push items down via moveElement.
  // Clone the layout and reset the dragged item to its ORIGINAL position.
  // moveElement needs to see the position delta to detect and resolve collisions.
  // Without this reset, moveElement short-circuits (l.y === y && l.x === x).
  const clonedLayout = layoutArray.map(item => cloneLayoutItem(item));

  // Normalize moved flags from prior drag frames so push doesn't get stuck
  for (const item of clonedLayout) {
    (item as Mutable<LayoutItem>).moved = false;
  }

  const clonedPrevItem = clonedLayout.find(item => item.i === movedItem.i);

  if (clonedPrevItem) {
    // Reset to pre-drag position so moveElement detects the delta
    (clonedPrevItem as Mutable<LayoutItem>).x = originalPosition.x;
    (clonedPrevItem as Mutable<LayoutItem>).y = originalPosition.y;

    // noCompactor passes compactType=null; fallback to "vertical" matches
    // moveElement's default sort/collision order which pushes items downward.
    const pushCompactType = context.compactType === "horizontal" ? "horizontal" : "vertical";

    const pushedLayout = moveElement(
      clonedLayout,
      clonedPrevItem,
      movedItem.x,
      movedItem.y,
      true,  // isUserAction
      false, // preventCollision — let moveElement resolve collisions
      pushCompactType,
      context.cols,
      false  // allowOverlap — resolve collisions, don't ignore them
    );

    if (hasAnyCollisions(pushedLayout)) return null;
    if (hasNewlyInvalidItems(pushedLayout, previousLayout, maxRows)) return null;
    return pushedLayout;
  }

  // 4. Reject
  return null;
};
