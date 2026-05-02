import { L as Layout, c as LayoutItem, C as CompactType, a as Compactor, P as Position, d as PositionStrategy } from './layout-BOhCYNcp.js';

/**
 * Get the bottom-most Y coordinate of the layout.
 *
 * This is the Y position plus height of the lowest item.
 *
 * @param layout - Layout to measure
 * @returns The bottom Y coordinate (0 if layout is empty)
 */
declare function bottom(layout: Layout): number;
/**
 * Get a layout item by its ID.
 *
 * @param layout - Layout to search
 * @param id - Item ID to find
 * @returns The layout item, or undefined if not found
 */
declare function getLayoutItem(layout: Layout, id: string): LayoutItem | undefined;
/**
 * Get all static items from the layout.
 *
 * Static items cannot be moved or resized by the user.
 *
 * @param layout - Layout to filter
 * @returns Array of static layout items
 */
declare function getStatics(layout: Layout): LayoutItem[];

/**
 * Clone a layout item.
 *
 * Creates a shallow copy with all properties preserved.
 * Boolean properties are normalized (undefined becomes false).
 *
 * @param layoutItem - Item to clone
 * @returns A new layout item with the same properties
 */
declare function cloneLayoutItem(layoutItem: LayoutItem): LayoutItem;
/**
 * Clone an entire layout.
 *
 * Creates a new array with cloned items.
 *
 * @param layout - Layout to clone
 * @returns A new layout with cloned items
 */
declare function cloneLayout(layout: Layout): LayoutItem[];
/**
 * Replace a layout item in a layout.
 *
 * Returns a new layout with the item replaced. Other items are not cloned.
 *
 * @param layout - Layout to modify
 * @param layoutItem - New item (matched by `i` property)
 * @returns New layout with the item replaced
 */
declare function modifyLayout(layout: Layout, layoutItem: LayoutItem): LayoutItem[];
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
declare function withLayoutItem(layout: Layout, itemKey: string, cb: (item: LayoutItem) => LayoutItem): [LayoutItem[], LayoutItem | null];
/**
 * Validate that a layout has the required properties.
 *
 * @param layout - Layout to validate
 * @param contextName - Name for error messages
 * @throws Error if layout is invalid
 */
declare function validateLayout(layout: Layout, contextName?: string): void;

/**
 * Compactor implementations.
 *
 * Compactors are pluggable strategies for removing gaps between grid items.
 * Use the Compactor interface to create custom compaction algorithms.
 */

/**
 * Resolve a compaction collision by moving items.
 *
 * Before moving an item to a position, checks if that movement would
 * cause collisions and recursively moves those items first.
 *
 * Useful for implementing custom compactors.
 *
 * @param layout - Full layout (must be sorted for optimization)
 * @param item - Item being moved (will be mutated)
 * @param moveToCoord - Target coordinate
 * @param axis - Which axis to move on ('x' or 'y')
 * @param hasStatics - Whether layout contains static items (disables early break optimization)
 */
declare function resolveCompactionCollision(layout: Layout, item: LayoutItem, moveToCoord: number, axis: "x" | "y", hasStatics?: boolean): void;
/**
 * Compact a single item vertically (move up).
 *
 * Moves the item as far up as possible without colliding.
 * Useful for implementing custom vertical compactors.
 *
 * @param compareWith - Items to check for collisions
 * @param l - Item to compact (will be mutated)
 * @param fullLayout - Full layout for collision resolution
 * @param maxY - Maximum Y to start from
 * @returns The compacted item
 */
declare function compactItemVertical(compareWith: Layout, l: LayoutItem, fullLayout: Layout, maxY: number): LayoutItem;
/**
 * Compact a single item horizontally (move left).
 *
 * Moves the item as far left as possible without colliding.
 * Wraps to the next row if it overflows.
 * Useful for implementing custom horizontal compactors.
 *
 * @param compareWith - Items to check for collisions
 * @param l - Item to compact (will be mutated)
 * @param cols - Number of columns in the grid
 * @param fullLayout - Full layout for collision resolution
 * @returns The compacted item
 */
declare function compactItemHorizontal(compareWith: Layout, l: LayoutItem, cols: number, fullLayout: Layout): LayoutItem;
/**
 * Vertical compactor - moves items up to fill gaps.
 *
 * Items are sorted by row then column, and each item is moved
 * as far up as possible without overlapping other items.
 *
 * This is the default compaction mode for react-grid-layout.
 */
declare const verticalCompactor: Compactor;
/**
 * Horizontal compactor - moves items left to fill gaps.
 *
 * Items are sorted by column then row, and each item is moved
 * as far left as possible without overlapping other items.
 */
declare const horizontalCompactor: Compactor;
/**
 * No compaction - items stay where placed.
 *
 * Use this for free-form layouts where items can be placed anywhere.
 * Items will not automatically move to fill gaps.
 */
declare const noCompactor: Compactor;
/**
 * Vertical compactor that allows overlapping items.
 *
 * Items compact upward but are allowed to overlap each other.
 * Useful for layered layouts or when collision detection is handled externally.
 */
declare const verticalOverlapCompactor: Compactor;
/**
 * Horizontal compactor that allows overlapping items.
 */
declare const horizontalOverlapCompactor: Compactor;
/**
 * No compaction, with overlapping allowed.
 *
 * Items stay where placed and can overlap each other.
 */
declare const noOverlapCompactor: Compactor;
/**
 * Get a compactor by type.
 *
 * This is a convenience function for backwards compatibility with the
 * string-based compactType API.
 *
 * Note: For 'wrap' mode, import `wrapCompactor` from 'react-grid-layout/extras'
 * and pass it directly to the `compactor` prop. This function returns
 * `noCompactor` for 'wrap' type since the wrap compactor is tree-shakeable.
 *
 * @param compactType - 'vertical', 'horizontal', 'wrap', or null
 * @param allowOverlap - Whether to allow overlapping items
 * @returns The appropriate Compactor
 */
declare function getCompactor(compactType: CompactType, allowOverlap?: boolean, preventCollision?: boolean): Compactor;

/**
 * Generate CSS transform-based positioning styles.
 *
 * Using transforms is more performant than top/left positioning
 * because it doesn't trigger layout recalculations.
 *
 * @param position - Position in pixels
 * @returns CSS style object
 */
declare function setTransform({ top, left, width, height }: Position): Record<string, string>;
/**
 * Generate CSS top/left positioning styles.
 *
 * Use this when transforms are not suitable (e.g., for printing
 * or when transform causes issues with child elements).
 *
 * @param position - Position in pixels
 * @returns CSS style object
 */
declare function setTopLeft({ top, left, width, height }: Position): Record<string, string>;
/**
 * Convert a number to a percentage string.
 *
 * @param num - Number to convert (0-1 range typically)
 * @returns Percentage string (e.g., "50%")
 */
declare function perc(num: number): string;
/**
 * CSS transform-based positioning strategy.
 *
 * Uses CSS transforms for positioning, which is more performant
 * as it doesn't trigger layout recalculations.
 *
 * This is the default strategy.
 */
declare const transformStrategy: PositionStrategy;
/**
 * Absolute (top/left) positioning strategy.
 *
 * Uses CSS top/left for positioning. Use this when CSS transforms
 * cause issues (e.g., printing, certain child element positioning).
 */
declare const absoluteStrategy: PositionStrategy;
/**
 * Create a scaled transform strategy.
 *
 * Use this when the grid container is inside a scaled element
 * (e.g., `transform: scale(0.5)`). The scale factor adjusts
 * drag/resize calculations to account for the parent transform.
 *
 * @param scale - Scale factor (e.g., 0.5 for half size)
 * @returns Position strategy with scaled calculations
 *
 * @example
 * ```tsx
 * <div style={{ transform: 'scale(0.5)' }}>
 *   <GridLayout positionStrategy={createScaledStrategy(0.5)} />
 * </div>
 * ```
 */
declare function createScaledStrategy(scale: number): PositionStrategy;
/** Default position strategy (transform-based) */
declare const defaultPositionStrategy: PositionStrategy;

export { cloneLayoutItem as a, bottom as b, cloneLayout as c, getLayoutItem as d, setTransform as e, verticalCompactor as f, getCompactor as g, horizontalCompactor as h, absoluteStrategy as i, compactItemHorizontal as j, compactItemVertical as k, createScaledStrategy as l, defaultPositionStrategy as m, noCompactor as n, getStatics as o, horizontalOverlapCompactor as p, modifyLayout as q, noOverlapCompactor as r, setTopLeft as s, perc as t, resolveCompactionCollision as u, validateLayout as v, transformStrategy as w, verticalOverlapCompactor as x, withLayoutItem as y };
