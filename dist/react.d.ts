import * as react_jsx_runtime from 'react/jsx-runtime';
import React__default from 'react';
import { A as AdaptiveOptionsInput } from './adaptive-metrics-BljnZr6R.js';
import { c as LayoutItem } from './layout-CFHbwcvs.js';
export { d as CollisionResolver, C as CompactType, a as Compactor, D as DroppingPosition, E as EventCallback, G as GridDragEvent, b as GridResizeEvent, L as Layout, P as Position, R as ResizeHandleAxis } from './layout-CFHbwcvs.js';
export { D as DEFAULT_BREAKPOINTS, a as DEFAULT_COLS, b as DefaultBreakpoints, c as DragState, d as DropState, G as GridItem, e as GridItemCallback, f as GridItemProps, R as ResizeHandle, g as ResizeState, U as UseContainerDimensionsOptions, h as UseContainerDimensionsResult, i as UseGridLayoutOptions, j as UseGridLayoutResult, k as UseResponsiveLayoutOptions, l as UseResponsiveLayoutResult, u as useContainerDimensions, m as useGridLayout, n as useResponsiveLayout } from './useResponsiveLayout-CslvggYY.js';
export { G as GridLayout, a as GridLayoutProps, R as ResponsiveGridLayout, b as ResponsiveGridLayoutProps } from './ResponsiveGridLayout-h7qV8U31.js';
export { G as GutterHandle, a as GutterHandleProps, U as UseGridArrangementParams, u as useGridArrangement, b as useGutterHandles } from './useGutterHandles-B7Mpbanu.js';
export { B as Breakpoint, a as Breakpoints, R as ResponsiveLayouts } from './responsive-CAtIWshU.js';
export { b as bottom, c as cloneLayout, a as cloneLayoutItem, g as getCompactor, d as getLayoutItem, h as horizontalCompactor, n as noCompactor, s as setTopLeft, e as setTransform, f as verticalCompactor } from './css-strategies-QLCl-0rx.js';
export { c as calcGridItemPosition, a as calcWH, b as calcXY } from './calculate-znRG1-du.js';

interface ContainerGridProps {
    /** RGL-compatible layout items */
    layout: readonly LayoutItem[];
    /** Called on every tick of a drag/resize */
    onLayoutChange: (layout: readonly LayoutItem[]) => void;
    /** Called when a drag/resize successfully completes */
    onLayoutSettled?: (layout: readonly LayoutItem[]) => void;
    /** When true, drag, resize, and gutters are enabled. */
    isEditMode?: boolean;
    /** When true, external elements can be dropped on the grid. Defaults to isEditMode if not provided. */
    isDroppable?: boolean;
    /** Called when an item is dropped onto the grid */
    onDrop?: (layout: readonly LayoutItem[], item: LayoutItem | undefined, e: Event) => void;
    /** Called when dragging over the grid. Return dimensions or false to reject. */
    onDropDragOver?: (e: DragEvent) => {
        w?: number;
        h?: number;
        dragOffsetX?: number;
        dragOffsetY?: number;
    } | false | void;
    /** Default size for dropped items. */
    droppingItem?: {
        i: string;
        w: number;
        h: number;
    };
    /** When true, widgets will intelligently shrink to fit into available gaps during drag. */
    autoResize?: boolean;
    /**
     * When provided, cols, rowHeight, and maxRows are computed from measured
     * container dimensions. Overrides the explicit cols/rowHeight props.
     * Pass `{}` to use all defaults (targetCellWidth=120, cellAspectRatio=0.75).
     * When absent (undefined), behavior is unchanged — uses explicit props.
     */
    adaptive?: AdaptiveOptionsInput;
    /** Fixed column count. Ignored when `adaptive` is provided. @default 12 */
    cols?: number;
    /** Fixed row height. Ignored when `adaptive` is provided. @default 30 */
    rowHeight?: number;
    margin?: [number, number];
    containerPadding?: [number, number] | null;
    children: React__default.ReactNode;
}
declare function ContainerGrid({ layout, onLayoutChange, onLayoutSettled, isEditMode, isDroppable, onDrop, onDropDragOver, droppingItem, autoResize, adaptive, cols, rowHeight, margin, containerPadding, children }: ContainerGridProps): react_jsx_runtime.JSX.Element;

export { ContainerGrid, type ContainerGridProps, LayoutItem };
