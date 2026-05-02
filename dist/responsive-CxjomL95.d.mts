import { R as ResizeHandleAxis, L as Layout } from './layout-5DuzMw4J.mjs';
import * as React from 'react';

/**
 * Grid measurement configuration.
 * Groups all grid metrics (columns, row height, margins).
 */
interface GridConfig {
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
declare const defaultGridConfig: GridConfig;
/**
 * Drag behavior configuration.
 * Groups all drag-related settings.
 */
interface DragConfig {
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
}
/** Default drag configuration */
declare const defaultDragConfig: DragConfig;
/**
 * Resize behavior configuration.
 * Groups all resize-related settings.
 */
interface ResizeConfig {
    /** Whether items can be resized (default: true) */
    enabled: boolean;
    /** Which resize handles to show (default: ['se']) */
    handles: readonly ResizeHandleAxis[];
    /**
     * Custom resize handle component.
     * Can be a React node or a function that receives the axis.
     */
    handleComponent?: React.ReactNode | ((axis: ResizeHandleAxis, ref: React.Ref<HTMLElement>) => React.ReactNode);
}
/** Default resize configuration */
declare const defaultResizeConfig: ResizeConfig;
/**
 * Drop configuration (for dropping external elements).
 * Groups all drop-related settings.
 */
interface DropConfig {
    /** Whether external elements can be dropped on the grid (default: false) */
    enabled: boolean;
    /** Default size for dropped items (default: { w: 1, h: 1 }) */
    defaultItem: {
        w: number;
        h: number;
    };
    /**
     * Called when dragging over the grid.
     * Return dimensions to override defaultItem, or false to reject the drop.
     * Can also return dragOffsetX/dragOffsetY to specify cursor offset for centering.
     */
    onDragOver?: (e: DragEvent) => {
        w?: number;
        h?: number;
        dragOffsetX?: number;
        dragOffsetY?: number;
    } | false | void;
}
/** Default drop configuration */
declare const defaultDropConfig: DropConfig;

/**
 * Breakpoint name (e.g., 'lg', 'md', 'sm', 'xs', 'xxs').
 */
type Breakpoint = string;
/**
 * Map of breakpoint name to pixel width.
 * Generic type B allows custom breakpoint strings.
 */
type Breakpoints<B extends Breakpoint = Breakpoint> = Record<B, number>;
/**
 * Map of breakpoint name to number of columns.
 * Generic type B allows custom breakpoint strings.
 */
type BreakpointCols<B extends Breakpoint = Breakpoint> = Record<B, number>;
/**
 * Map of breakpoint name to layout.
 * Generic type B allows custom breakpoint strings.
 */
type ResponsiveLayouts<B extends Breakpoint = Breakpoint> = Partial<Record<B, Layout>>;
/**
 * Callback when breakpoint changes.
 */
type OnBreakpointChangeCallback<B extends Breakpoint = Breakpoint> = (newBreakpoint: B, cols: number) => void;

export { type Breakpoint as B, type DragConfig as D, type GridConfig as G, type OnBreakpointChangeCallback as O, type ResponsiveLayouts as R, type Breakpoints as a, type ResizeConfig as b, type DropConfig as c, type BreakpointCols as d, defaultDragConfig as e, defaultDropConfig as f, defaultGridConfig as g, defaultResizeConfig as h };
