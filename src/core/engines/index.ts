/**
 * Collision Strategies — Pluggable collision resolution for drag and resize.
 *
 * @module core/engines
 */

// Types
export type {
  DragSlot,
  DragCollisionResolver,
  ResizeCollisionResolver
} from "./types.js";

// Strategies
export { trySwap } from "./swap-strategy.js";
export {
  resolveResizeCollisions,
  inferResizeHandles
} from "./squash-push-strategy.js";
