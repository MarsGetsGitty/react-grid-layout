import {
  type CollisionResolver,
  type CollisionResolverContext
} from "../types/events.js";
import { type LayoutItem } from "../types/layout.js";
import { trySwap } from "./swap-strategy.js";
import { moveElement } from "../layout/movement.js";
import { getAllCollisions } from "../spatial/collision.js";
import { cloneLayoutItem } from "../layout/utils.js";

import { type Mutable } from "../types/utils.js";

function hasAnyCollisions(layout: LayoutItem[]): boolean {
  return layout.some(item =>
    getAllCollisions(layout, item).some(other => other.i !== item.i)
  );
}

/**
 * A specialized drag collision resolver that orchestrates:
 * 1. Try Swap (1:1 dimension match swap)
 * 2. Try Push (fallback to moveElement with collision resolution)
 * 3. Reject (returns null)
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

  // 2. Fallback: Push items down via moveElement.
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

  // 3. Reject
  return null;
};
