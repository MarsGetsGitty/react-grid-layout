import type { Layout, LayoutItem, ResizeHandleAxis } from "./layout.js";
import type { Position, PartialPosition } from "./events.js";
import type * as React from "react";

/**
 * Type of compaction to apply to the layout.
 * - 'vertical': Items compact upward (default)
 * - 'horizontal': Items compact leftward
 * - 'wrap': Items arranged in wrapped-paragraph style (like words in text)
 * - null: No compaction (free-form positioning)
 */
export type CompactType = "horizontal" | "vertical" | "wrap" | null;

/**
 * Interface for layout compaction strategies.
 *
 * Implement this interface to create custom compaction algorithms.
 *
 * @example
 * ```typescript
 * const myCompactor: Compactor = {
 *   type: 'vertical',
 *   allowOverlap: false,
 *   compact(layout, cols) {
 *     // Custom compaction logic
 *     return compactedLayout;
 *   }
 * };
 * ```
 */
export interface Compactor {
  /** Compaction type identifier */
  readonly type: CompactType;

  /**
   * Whether items can overlap (stack on top of each other).
   *
   * When true:
   * - Items can be placed on top of other items
   * - Dragging into another item does NOT push it away
   * - Compaction is skipped after drag/resize
   */
  readonly allowOverlap: boolean;

  /**
   * Whether to block movement that would cause collision.
   *
   * When true (and allowOverlap is false):
   * - Dragging into another item is blocked (item snaps back)
   * - Other items are NOT pushed away
   * - Only affects drag/resize, not compaction
   *
   * Has no effect when allowOverlap is true.
   */
  readonly preventCollision?: boolean;

  /**
   * Compact the layout.
   *
   * @param layout - The layout to compact
   * @param cols - Number of columns in the grid
   * @returns The compacted layout
   */
  compact(layout: Layout, cols: number): Layout;
}

/**
 * Interface for CSS positioning strategies.
 *
 * Implement this interface to customize how items are positioned in the DOM.
 * Built-in strategies: transformStrategy, absoluteStrategy.
 *
 * @example
 * ```typescript
 * // Use transform-based positioning (default, better performance)
 * <GridLayout positionStrategy={transformStrategy} />
 *
 * // Use top/left positioning (for environments where transforms cause issues)
 * <GridLayout positionStrategy={absoluteStrategy} />
 *
 * // Use scaled transforms (for scaled containers)
 * <GridLayout positionStrategy={createScaledStrategy(0.5)} />
 * ```
 */
export interface PositionStrategy {
  /** Strategy type identifier */
  readonly type: "transform" | "absolute";

  /** Scale factor for drag/resize calculations */
  readonly scale: number;

  /**
   * Convert pixel position to CSS style object.
   *
   * @param pos - Position in pixels
   * @returns CSS properties for positioning the element
   */
  calcStyle(pos: Position): React.CSSProperties;

  /**
   * Calculate position during drag operations, accounting for transforms and scale.
   *
   * This method is optional. When not provided, react-draggable uses its built-in
   * parent-relative coordinate calculation. Only override this when you need custom
   * coordinate handling, such as for scaled containers.
   *
   * @param clientX - Mouse client X position
   * @param clientY - Mouse client Y position
   * @param offsetX - Offset from element origin X
   * @param offsetY - Offset from element origin Y
   * @returns Adjusted left/top position
   */
  calcDragPosition?(
    clientX: number,
    clientY: number,
    offsetX: number,
    offsetY: number
  ): PartialPosition;
}

/**
 * Context provided to constraint functions during drag/resize operations.
 */
export interface ConstraintContext {
  /** Number of columns in the grid */
  cols: number;

  /** Maximum number of rows (Infinity if unbounded) */
  maxRows: number;

  /** Container width in pixels */
  containerWidth: number;

  /** Container height in pixels (may be 0 if auto-height) */
  containerHeight: number;

  /** Row height in pixels */
  rowHeight: number;

  /** Margin between items [x, y] in pixels */
  margin: readonly [number, number];

  /** Container padding [x, y] in pixels (resolved — never null) */
  containerPadding: readonly [number, number];

  /** Current layout state */
  layout: Layout;
}

/**
 * Interface for layout constraints.
 *
 * Implement this interface to create custom position/size constraints.
 * Built-in constraints: gridBounds, minMaxSize, containerBounds, boundedX, boundedY.
 *
 * @example
 * ```typescript
 * // Grid-level constraints
 * <GridLayout constraints={[gridBounds, minMaxSize, aspectRatio(16/9)]} />
 *
 * // Per-item constraints
 * const layout = [
 *   { i: 'video', x: 0, y: 0, w: 4, h: 2, constraints: [aspectRatio(16/9)] }
 * ];
 * ```
 */
export interface LayoutConstraint {
  /** Constraint identifier for debugging */
  readonly name: string;

  /**
   * Constrain position during drag operations.
   * Called after grid unit conversion, before layout update.
   *
   * @param item - The item being dragged
   * @param x - Proposed x position in grid units
   * @param y - Proposed y position in grid units
   * @param context - Grid context (cols, maxRows, etc.)
   * @returns Constrained x, y position
   */
  constrainPosition?(
    item: LayoutItem,
    x: number,
    y: number,
    context: ConstraintContext
  ): { x: number; y: number };

  /**
   * Constrain size during resize operations.
   * Called after grid unit conversion, before layout update.
   *
   * @param item - The item being resized
   * @param w - Proposed width in grid units
   * @param h - Proposed height in grid units
   * @param handle - Which resize handle is being used
   * @param context - Grid context (cols, maxRows, etc.)
   * @returns Constrained w, h size
   */
  constrainSize?(
    item: LayoutItem,
    w: number,
    h: number,
    handle: ResizeHandleAxis,
    context: ConstraintContext
  ): { w: number; h: number };
}
