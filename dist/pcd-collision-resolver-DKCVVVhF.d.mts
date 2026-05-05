import { d as CollisionResolver } from './config-CJDJz-fI.mjs';

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
declare const pcdCollisionResolver: CollisionResolver;

export { pcdCollisionResolver as p };
