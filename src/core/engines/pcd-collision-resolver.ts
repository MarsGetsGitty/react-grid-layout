import {
  type CollisionResolver,
  type CollisionResolverContext
} from "../types/events.js";
import { type LayoutItem } from "../types/layout.js";
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
 * A specialized drag collision resolver that orchestrates:
 * 1. Try Swap (1:1 dimension match swap)
 * 2. Try Shrink-to-Fit (if autoResize is enabled and cursor is over an empty gap)
 * 3. Try Push (fallback to moveElement with collision resolution)
 * 4. Reject (returns null)
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

  // 1. Try swap — if a single same-dimension collision exists, swap positions
  const swapped = trySwap(layoutArray, movedItem.i, originalPosition);
  if (swapped) {
    return hasAnyCollisions(swapped as LayoutItem[]) ? null : swapped;
  }

  const dragged = layoutArray.find(item => item.i === movedItem.i);
  if (!dragged) return null;

  // Check if there are no collisions (free space move)
  const collisions = getAllCollisions(layoutArray, dragged)
    .filter(item => item.i !== dragged.i);

  if (collisions.length === 0) {
    // No collision — accept move (clone to prevent mutation of caller's array)
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

    return hasAnyCollisions(pushedLayout) ? null : pushedLayout;
  }

  // 4. Reject
  return null;
};
