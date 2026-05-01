import type { LayoutConstraint } from "./strategies.js";

/**
 * Axis identifiers for resize handles.
 * - Cardinal: 'n', 's', 'e', 'w' (north, south, east, west)
 * - Diagonal: 'ne', 'nw', 'se', 'sw'
 */
export type ResizeHandleAxis =
  | "s"
  | "w"
  | "e"
  | "n"
  | "sw"
  | "nw"
  | "se"
  | "ne";

/**
 * A single item in the grid layout.
 *
 * Position (x, y) is in grid units, not pixels.
 * Size (w, h) is in grid units.
 */
export interface LayoutItem {
  /** Unique identifier for this item */
  i: string;

  /** X position in grid units (0-indexed from left) */
  x: number;

  /** Y position in grid units (0-indexed from top) */
  y: number;

  /** Width in grid units */
  w: number;

  /** Height in grid units */
  h: number;

  /** Minimum width in grid units */
  minW?: number;

  /** Minimum height in grid units */
  minH?: number;

  /** Maximum width in grid units */
  maxW?: number;

  /** Maximum height in grid units */
  maxH?: number;

  /**
   * If true, item cannot be dragged or resized, and other items
   * will move around it during compaction.
   */
  static?: boolean;

  /**
   * If false, item cannot be dragged (but may still be resizable).
   * Overrides grid-level isDraggable for this item.
   */
  isDraggable?: boolean;

  /**
   * If false, item cannot be resized (but may still be draggable).
   * Overrides grid-level isResizable for this item.
   */
  isResizable?: boolean;

  /**
   * Which resize handles to show for this item.
   * Overrides grid-level resizeHandles for this item.
   */
  resizeHandles?: ResizeHandleAxis[];

  /**
   * If true, item is constrained to the grid container bounds.
   * Overrides grid-level isBounded for this item.
   */
  isBounded?: boolean;

  /**
   * Internal flag set during drag/resize operations to indicate
   * the item has moved from its original position.
   * @internal
   */
  moved?: boolean;

  /**
   * Per-item layout constraints.
   * Applied in addition to grid-level constraints.
   */
  constraints?: LayoutConstraint[];
}

/**
 * A layout is a readonly array of layout items.
 * Layouts should be treated as immutable.
 */
export type Layout = readonly LayoutItem[];
