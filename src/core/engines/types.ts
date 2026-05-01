/**
 * Collision Strategy Types
 *
 * Function type definitions for pluggable collision resolution.
 * Consumers provide concrete implementations (e.g., trySwap, resolveResizeCollisions)
 * that satisfy these signatures.
 *
 * @module core/engines/types
 */

import type { LayoutItem } from "../types/index.js";

// =============================================================================
// Common Types
// =============================================================================

/** The origin slot a dragged widget came from (grid coordinates). */
export interface DragSlot {
  x: number;
  y: number;
}

// =============================================================================
// Resolver Function Types
// =============================================================================

/**
 * Resolve collisions caused by a drag operation.
 *
 * Given the current layout and the dragged item's origin slot,
 * returns a new layout with the collision resolved (e.g., a swap),
 * or `null` to reject the move (brick-wall behavior).
 *
 * Implementations MUST NOT mutate the input layout.
 *
 * @param layout    - Current layout
 * @param draggedId - The `i` of the widget being dragged
 * @param dragSlot  - The grid slot the dragged widget came from
 * @returns A new layout with the collision resolved, or `null` to reject.
 */
export type DragCollisionResolver = (
  layout: LayoutItem[],
  draggedId: string,
  dragSlot: DragSlot,
) => LayoutItem[] | null;

/**
 * Resolve collisions caused by a resize operation.
 *
 * Given the layout after resize and the item's before/after state,
 * returns a new layout with collisions resolved (e.g., squash + push),
 * or `null` to reject the resize (boundary hit).
 *
 * Implementations MUST NOT mutate the input layout.
 *
 * @param layout    - Current layout (will NOT be mutated)
 * @param resizedId - The `i` of the widget being resized
 * @param oldItem   - Item state BEFORE the resize
 * @param newItem   - Item state AFTER the resize (from RGL callback)
 * @param maxRows   - Maximum rows in the grid (viewport boundary)
 * @param cols      - Number of columns in the grid
 * @returns A new layout with collisions resolved, or `null` to reject.
 */
export type ResizeCollisionResolver = (
  layout: LayoutItem[],
  resizedId: string,
  oldItem: LayoutItem,
  newItem: LayoutItem,
  maxRows: number,
  cols: number,
) => LayoutItem[] | null;
