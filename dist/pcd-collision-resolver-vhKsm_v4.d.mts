import { d as CollisionResolver } from './layout-CFHbwcvs.mjs';

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
declare const pcdCollisionResolver: CollisionResolver;

export { pcdCollisionResolver as p };
