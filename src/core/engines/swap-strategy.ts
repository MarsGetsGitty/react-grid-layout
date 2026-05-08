/**
 * swapStrategy — Dimension-Aware Widget Swapping
 *
 * Pure function: given a layout, the dragged widget ID, and the slot
 * it came from, returns a new layout with a swap applied — or null
 * if no valid swap target exists.
 *
 * Rules:
 *  1. Exactly ONE widget must overlap the dragged widget (multi-collision = brick wall).
 *  2. The overlapping widget must have the EXACT same w and h (dimension match).
 *  3. If both conditions pass, the target teleports to the drag origin slot.
 *
 * @see smart_physics_engine_design.md §2
 * @module core/engines/swap-strategy
 */

import { getAllCollisions } from "../spatial/collision.js";
import type { LayoutItem } from "../types/index.js";
import type { DragSlot } from "./types.js";

/**
 * Attempt a dimension-aware swap during drag.
 *
 * @param layout   - Current layout (will NOT be mutated)
 * @param draggedId - The `i` of the widget being dragged
 * @param dragSlot  - The grid slot the dragged widget came from
 * @returns A new layout array with the swap applied, or `null` if no valid swap.
 */
export function trySwap(
  layout: LayoutItem[],
  draggedId: string,
  dragSlot: DragSlot,
): { layout: LayoutItem[], swappedItemId: string } | null {
  const dragged = layout.find(item => item.i === draggedId);
  if (!dragged) return null;

  // Find all widgets currently overlapping the dragged widget (excluding itself)
  const collisions = getAllCollisions(layout, dragged)
    .filter(item => item.i !== draggedId);

  // Rule 1: Exactly one collision target
  if (collisions.length !== 1) return null;

  const target = collisions[0];
  if (!target) return null;

  // Rule 2: Dimension match — both widgets must have the same w and h.
  // Without this guard, dragging a small widget onto a large one (or vice
  // versa) would "teleport" the target into a slot that doesn't fit,
  // causing the "absorb" bug where widgets overlap and appear stuck.
  if (target.w !== dragged.w || target.h !== dragged.h) return null;

  // Rule 3: Try the swap and verify it doesn't create cascading collisions
  const tentativeLayout = layout.map(item => {
    if (item.i === target.i) {
      return { ...item, x: dragSlot.x, y: dragSlot.y };
    }
    return item;
  });

  const swappedTarget = tentativeLayout.find(item => item.i === target.i)!;
  const secondaryCollisions = getAllCollisions(tentativeLayout, swappedTarget)
    .filter(item => item.i !== target.i && item.i !== draggedId);

  if (secondaryCollisions.length > 0) return null;

  return { layout: tentativeLayout, swappedItemId: target.i };
}
