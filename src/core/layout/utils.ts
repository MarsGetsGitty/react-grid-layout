import type { Layout, LayoutItem } from "../types/index.js";
import { getLayoutItem } from "./queries.js";

/**
 * Clone a layout item.
 *
 * Creates a shallow copy with all properties preserved.
 * Boolean properties are normalized (undefined becomes false).
 *
 * @param layoutItem - Item to clone
 * @returns A new layout item with the same properties
 */
export function cloneLayoutItem(layoutItem: LayoutItem): LayoutItem {
  return {
    i: layoutItem.i,
    x: layoutItem.x,
    y: layoutItem.y,
    w: layoutItem.w,
    h: layoutItem.h,
    minW: layoutItem.minW,
    maxW: layoutItem.maxW,
    minH: layoutItem.minH,
    maxH: layoutItem.maxH,
    moved: Boolean(layoutItem.moved),
    static: Boolean(layoutItem.static),
    isDraggable: layoutItem.isDraggable,
    isResizable: layoutItem.isResizable,
    resizeHandles: layoutItem.resizeHandles,
    constraints: layoutItem.constraints,
    isBounded: layoutItem.isBounded
  };
}

/**
 * Clone an entire layout.
 *
 * Creates a new array with cloned items.
 *
 * @param layout - Layout to clone
 * @returns A new layout with cloned items
 */
export function cloneLayout(layout: Layout): LayoutItem[] {
  const newLayout: LayoutItem[] = new Array(layout.length);
  for (let i = 0; i < layout.length; i++) {
    const item = layout[i];
    if (item !== undefined) {
      newLayout[i] = cloneLayoutItem(item);
    }
  }
  return newLayout;
}

/**
 * Replace a layout item in a layout.
 *
 * Returns a new layout with the item replaced. Other items are not cloned.
 *
 * @param layout - Layout to modify
 * @param layoutItem - New item (matched by `i` property)
 * @returns New layout with the item replaced
 */
export function modifyLayout(
  layout: Layout,
  layoutItem: LayoutItem
): LayoutItem[] {
  const newLayout: LayoutItem[] = new Array(layout.length);
  for (let i = 0; i < layout.length; i++) {
    const item = layout[i];
    if (item !== undefined) {
      if (layoutItem.i === item.i) {
        newLayout[i] = layoutItem;
      } else {
        newLayout[i] = item;
      }
    }
  }
  return newLayout;
}

/**
 * Apply a transformation to a layout item.
 *
 * Finds the item by key, clones it, applies the callback, and returns
 * a new layout with the modified item.
 *
 * @param layout - Layout to modify
 * @param itemKey - Key of the item to modify
 * @param cb - Callback that receives the cloned item and returns the modified item
 * @returns Tuple of [new layout, modified item or null if not found]
 */
export function withLayoutItem(
  layout: Layout,
  itemKey: string,
  cb: (item: LayoutItem) => LayoutItem
): [LayoutItem[], LayoutItem | null] {
  let item = getLayoutItem(layout, itemKey);
  if (!item) {
    return [[...layout], null];
  }

  // Clone, then modify via callback
  item = cb(cloneLayoutItem(item));
  const newLayout = modifyLayout(layout, item);

  return [newLayout, item];
}

/**
 * Validate that a layout has the required properties.
 *
 * @param layout - Layout to validate
 * @param contextName - Name for error messages
 * @throws Error if layout is invalid
 */
export function validateLayout(
  layout: Layout,
  contextName: string = "Layout"
): void {
  const requiredProps = ["x", "y", "w", "h"] as const;

  if (!Array.isArray(layout)) {
    throw new Error(`${contextName} must be an array!`);
  }

  for (let i = 0; i < layout.length; i++) {
    const item = layout[i];
    if (item === undefined) continue;

    for (const key of requiredProps) {
      const value = item[key];
      if (typeof value !== "number" || Number.isNaN(value)) {
        throw new Error(
          `ReactGridLayout: ${contextName}[${i}].${key} must be a number! ` +
            `Received: ${String(value)} (${typeof value})`
        );
      }
    }

    if (item.i !== undefined && typeof item.i !== "string") {
      throw new Error(
        `ReactGridLayout: ${contextName}[${i}].i must be a string! ` +
          `Received: ${String(item.i)} (${typeof item.i})`
      );
    }
  }
}
