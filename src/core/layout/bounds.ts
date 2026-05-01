import type { LayoutItem, Mutable } from "../types/index.js";
import { getStatics } from "./queries.js";
import { getFirstCollision } from "../spatial/collision.js";

/**
 * Ensure all layout items fit within the grid bounds.
 *
 * - Items overflowing right are moved left
 * - Items overflowing left are moved to x=0 and clamped to grid width
 * - Static items that collide with other statics are moved down
 *
 * **IMPORTANT**: This function mutates the layout items in place for performance.
 * The type signature uses `Mutable<LayoutItem>[]` to make this explicit.
 * Clone the layout first (e.g., with `cloneLayout()`) if you need immutability.
 *
 * @param layout - Layout to correct (items WILL be mutated)
 * @param bounds - Grid bounds
 * @returns The same layout array (for chaining)
 */
export function correctBounds(
  layout: Mutable<LayoutItem>[],
  bounds: { cols: number }
): LayoutItem[] {
  const collidesWith = getStatics(layout);

  for (let i = 0; i < layout.length; i++) {
    const l = layout[i];
    if (l === undefined) continue;

    // Overflows right
    if (l.x + l.w > bounds.cols) {
      l.x = bounds.cols - l.w;
    }

    // Overflows left
    if (l.x < 0) {
      l.x = 0;
      l.w = bounds.cols;
    }

    if (!l.static) {
      collidesWith.push(l);
    } else {
      // Static items that collide with other statics must be moved down
      while (getFirstCollision(collidesWith, l)) {
        l.y++;
      }
    }
  }

  return layout;
}
