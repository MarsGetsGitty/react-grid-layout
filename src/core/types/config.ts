import type { ResizeHandleAxis } from "./layout.js";
import type * as React from "react";

/**
 * Grid measurement configuration.
 * Groups all grid metrics (columns, row height, margins).
 */
export interface GridConfig {
  /** Number of columns in the grid (default: 12) */
  cols: number;

  /** Height of a single row in pixels (default: 150) */
  rowHeight: number;

  /** [horizontal, vertical] margin between items in pixels (default: [10, 10]) */
  margin: readonly [number, number];

  /** [horizontal, vertical] padding inside the container (default: null, uses margin) */
  containerPadding: readonly [number, number] | null;

  /** Maximum number of rows (default: Infinity) */
  maxRows: number;
}

/** Default grid configuration */
export const defaultGridConfig: GridConfig = {
  cols: 12,
  rowHeight: 150,
  margin: [10, 10],
  containerPadding: null,
  maxRows: Infinity
};

/**
 * Drag behavior configuration.
 * Groups all drag-related settings.
 */
export interface DragConfig {
  /** Whether items can be dragged (default: true) */
  enabled: boolean;

  /** Whether items are bounded to the container (default: false) */
  bounded: boolean;

  /** CSS selector for drag handle (e.g., '.drag-handle') */
  handle?: string;

  /** CSS selector for elements that should not trigger drag */
  cancel?: string;

  /**
   * Minimum pixels to move before drag starts.
   * Helps distinguish click from drag (fixes #1341, #1401).
   * @default 3
   */
  threshold: number;

  /**
   * Whether the grid should automatically shrink dragged items to fit into
   * narrower empty gaps instead of pushing existing items down.
   * @default false
   */
  autoResize?: boolean;
}

/** Default drag configuration */
export const defaultDragConfig: DragConfig = {
  enabled: true,
  bounded: false,
  threshold: 3,
  autoResize: false
};

/**
 * Resize behavior configuration.
 * Groups all resize-related settings.
 */
export interface ResizeConfig {
  /** Whether items can be resized (default: true) */
  enabled: boolean;

  /** Which resize handles to show (default: ['se']) */
  handles: readonly ResizeHandleAxis[];

  /**
   * Custom resize handle component.
   * Can be a React node or a function that receives the axis.
   */
  handleComponent?:
    | React.ReactNode
    | ((
        axis: ResizeHandleAxis,
        ref: React.Ref<HTMLElement>
      ) => React.ReactNode);
}

/** Default resize configuration */
export const defaultResizeConfig: ResizeConfig = {
  enabled: true,
  handles: ["se"]
};

/**
 * Drop configuration (for dropping external elements).
 * Groups all drop-related settings.
 */
export interface DropConfig {
  /** Whether external elements can be dropped on the grid (default: false) */
  enabled: boolean;

  /** Default size for dropped items (default: { w: 1, h: 1 }) */
  defaultItem: { w: number; h: number };

  /**
   * Called when dragging over the grid.
   * Return dimensions to override defaultItem, or false to reject the drop.
   * Can also return dragOffsetX/dragOffsetY to specify cursor offset for centering.
   */
  onDragOver?: (
    e: DragEvent
  ) =>
    | { w?: number; h?: number; dragOffsetX?: number; dragOffsetY?: number }
    | false
    | void;
}

/** Default drop configuration */
export const defaultDropConfig: DropConfig = {
  enabled: false,
  defaultItem: { w: 1, h: 1 }
};
