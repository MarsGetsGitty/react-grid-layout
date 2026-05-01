import type { CompactType, Layout, LayoutItem, Mutable } from "../types/index.js";
import { getAllCollisions, getFirstCollision } from "../spatial/collision.js";
import { sortLayoutItems } from "../spatial/sort.js";
import { cloneLayout } from "./utils.js";

/**
 * Move a layout element to a new position.
 *
 * Handles collision detection and cascading movements.
 * Does not compact the layout - call `compact()` separately.
 *
 * **Note**: This function mutates the `l` parameter directly for performance.
 * The item's x, y, and moved properties will be modified. Callers should
 * ideally pass a cloned item if they need to preserve the original.
 *
 * @param layout - Full layout
 * @param l - Item to move (will be mutated)
 * @param x - New X position (or undefined to keep current)
 * @param y - New Y position (or undefined to keep current)
 * @param isUserAction - True if this is a direct user action (affects collision resolution)
 * @param preventCollision - True to block movement into occupied space (item snaps back). No effect if allowOverlap is true.
 * @param compactType - Compaction type for collision resolution
 * @param cols - Number of columns in the grid
 * @param allowOverlap - True to allow items to stack on top of each other
 * @returns The updated layout
 */
export function moveElement(
  layout: Layout,
  l: LayoutItem,
  x: number | undefined,
  y: number | undefined,
  isUserAction: boolean | undefined,
  preventCollision: boolean | undefined,
  compactType: CompactType,
  cols: number,
  allowOverlap?: boolean
): LayoutItem[] {
  // Static items can't be moved unless explicitly draggable
  if (l.static && l.isDraggable !== true) {
    return [...layout];
  }

  // Short-circuit if position unchanged
  if (l.y === y && l.x === x) {
    return [...layout];
  }

  const oldX = l.x;
  const oldY = l.y;

  // Update position (mutates l directly - see JSDoc note)
  if (typeof x === "number") (l as Mutable<LayoutItem>).x = x;
  if (typeof y === "number") (l as Mutable<LayoutItem>).y = y;
  (l as Mutable<LayoutItem>).moved = true;

  // Sort for proper collision detection order
  let sorted = sortLayoutItems(layout, compactType);
  const movingUp =
    compactType === "vertical" && typeof y === "number"
      ? oldY >= y
      : compactType === "horizontal" && typeof x === "number"
        ? oldX >= x
        : false;

  if (movingUp) {
    sorted = sorted.reverse();
  }

  const collisions = getAllCollisions(sorted, l);
  const hasCollisions = collisions.length > 0;

  // Handle overlap mode - just clone and return
  if (hasCollisions && allowOverlap) {
    return cloneLayout(layout);
  }

  // Handle prevent collision mode - revert position
  // Return same reference to signal no change occurred
  if (hasCollisions && preventCollision) {
    (l as Mutable<LayoutItem>).x = oldX;
    (l as Mutable<LayoutItem>).y = oldY;
    (l as Mutable<LayoutItem>).moved = false;
    return layout as LayoutItem[];
  }

  // Resolve collisions by moving other items
  let resultLayout: LayoutItem[] = [...layout];
  for (let i = 0; i < collisions.length; i++) {
    const collision = collisions[i];
    if (collision === undefined) continue;

    // Skip already-moved items to prevent infinite loops
    if (collision.moved) continue;

    // Static items can't be moved - move the dragged item instead
    if (collision.static) {
      resultLayout = moveElementAwayFromCollision(
        resultLayout,
        collision,
        l,
        isUserAction,
        compactType,
        cols
      );
    } else {
      resultLayout = moveElementAwayFromCollision(
        resultLayout,
        l,
        collision,
        isUserAction,
        compactType,
        cols
      );
    }
  }

  return resultLayout;
}

/**
 * Move an item away from a collision.
 *
 * Attempts to move the item up/left first if there's room,
 * otherwise moves it down/right.
 *
 * @param layout - Full layout
 * @param collidesWith - The item being collided with
 * @param itemToMove - The item to move away
 * @param isUserAction - True if this is a direct user action
 * @param compactType - Compaction type
 * @param cols - Number of columns
 * @returns Updated layout
 */
export function moveElementAwayFromCollision(
  layout: Layout,
  collidesWith: LayoutItem,
  itemToMove: LayoutItem,
  isUserAction: boolean | undefined,
  compactType: CompactType,
  cols: number
): LayoutItem[] {
  const compactH = compactType === "horizontal";
  const compactV = compactType === "vertical";
  const preventCollision = collidesWith.static;

  // Try to move up/left first (only on primary collision from user action)
  if (isUserAction) {
    isUserAction = false; // Only try this once

    // Create a fake item to test if there's room above/left
    const fakeItem: LayoutItem = {
      x: compactH ? Math.max(collidesWith.x - itemToMove.w, 0) : itemToMove.x,
      y: compactV ? Math.max(collidesWith.y - itemToMove.h, 0) : itemToMove.y,
      w: itemToMove.w,
      h: itemToMove.h,
      i: "-1"
    };

    const firstCollision = getFirstCollision(layout, fakeItem);
    const collisionNorth =
      firstCollision !== undefined &&
      firstCollision.y + firstCollision.h > collidesWith.y;
    const collisionWest =
      firstCollision !== undefined &&
      collidesWith.x + collidesWith.w > firstCollision.x;

    // No collision above/left - we can move there
    if (!firstCollision) {
      return moveElement(
        layout,
        itemToMove,
        compactH ? fakeItem.x : undefined,
        compactV ? fakeItem.y : undefined,
        isUserAction,
        preventCollision,
        compactType,
        cols
      );
    }

    // Handle specific collision cases
    if (collisionNorth && compactV) {
      return moveElement(
        layout,
        itemToMove,
        undefined,
        itemToMove.y + 1,
        isUserAction,
        preventCollision,
        compactType,
        cols
      );
    }

    if (collisionNorth && compactType === null) {
      // Swap positions in free-form mode
      (collidesWith as Mutable<LayoutItem>).y = itemToMove.y;
      (itemToMove as Mutable<LayoutItem>).y = itemToMove.y + itemToMove.h;
      return [...layout];
    }

    if (collisionWest && compactH) {
      return moveElement(
        layout,
        collidesWith,
        itemToMove.x,
        undefined,
        isUserAction,
        preventCollision,
        compactType,
        cols
      );
    }
  }

  // Default: move down/right by 1
  const newX = compactH ? itemToMove.x + 1 : undefined;
  const newY = compactV ? itemToMove.y + 1 : undefined;

  if (newX === undefined && newY === undefined) {
    return [...layout];
  }

  return moveElement(
    layout,
    itemToMove,
    newX,
    newY,
    isUserAction,
    preventCollision,
    compactType,
    cols
  );
}
