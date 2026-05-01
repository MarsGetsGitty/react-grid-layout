import type { Layout, LayoutItem } from "../types/index.js";

/**
 * Get the bottom-most Y coordinate of the layout.
 *
 * This is the Y position plus height of the lowest item.
 *
 * @param layout - Layout to measure
 * @returns The bottom Y coordinate (0 if layout is empty)
 */
export function bottom(layout: Layout): number {
  let max = 0;
  for (let i = 0; i < layout.length; i++) {
    const item = layout[i];
    if (item !== undefined) {
      const bottomY = item.y + item.h;
      if (bottomY > max) max = bottomY;
    }
  }
  return max;
}

/**
 * Get a layout item by its ID.
 *
 * @param layout - Layout to search
 * @param id - Item ID to find
 * @returns The layout item, or undefined if not found
 */
export function getLayoutItem(
  layout: Layout,
  id: string
): LayoutItem | undefined {
  for (let i = 0; i < layout.length; i++) {
    const item = layout[i];
    if (item !== undefined && item.i === id) {
      return item;
    }
  }
  return undefined;
}

/**
 * Get all static items from the layout.
 *
 * Static items cannot be moved or resized by the user.
 *
 * @param layout - Layout to filter
 * @returns Array of static layout items
 */
export function getStatics(layout: Layout): LayoutItem[] {
  return layout.filter((l): l is LayoutItem => l.static === true);
}
