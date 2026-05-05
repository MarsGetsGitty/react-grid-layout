import * as react_jsx_runtime from 'react/jsx-runtime';
import React__default from 'react';
import { c as LayoutItem } from './config-CJDJz-fI.mjs';
export { d as CollisionResolver, C as CompactType, a as Compactor, D as DroppingPosition, E as EventCallback, G as GridDragEvent, b as GridResizeEvent, L as Layout, P as Position, R as ResizeHandleAxis } from './config-CJDJz-fI.mjs';
export { D as DEFAULT_BREAKPOINTS, a as DEFAULT_COLS, b as DefaultBreakpoints, c as DragState, d as DropState, G as GridItem, e as GridItemCallback, f as GridItemProps, R as ResizeHandle, g as ResizeState, U as UseContainerWidthOptions, h as UseContainerWidthResult, i as UseGridLayoutOptions, j as UseGridLayoutResult, k as UseResponsiveLayoutOptions, l as UseResponsiveLayoutResult, u as useContainerWidth, m as useGridLayout, n as useResponsiveLayout } from './useResponsiveLayout-Ne-7a2-p.mjs';
export { G as GridLayout, a as GridLayoutProps, R as ResponsiveGridLayout, b as ResponsiveGridLayoutProps } from './ResponsiveGridLayout-C_be9OPh.mjs';
export { G as GutterHandle, a as GutterHandleProps, U as UseGridArrangementParams, u as useGridArrangement, b as useGutterHandles } from './useGutterHandles-_fPHRAsM.mjs';
export { B as Breakpoint, a as Breakpoints, R as ResponsiveLayouts } from './responsive-DnuY7vut.mjs';
export { b as bottom, c as cloneLayout, a as cloneLayoutItem, g as getCompactor, d as getLayoutItem, h as horizontalCompactor, n as noCompactor, s as setTopLeft, e as setTransform, f as verticalCompactor } from './css-strategies-DTFS90uR.mjs';
export { c as calcGridItemPosition, a as calcWH, b as calcXY } from './calculate-DX3KSdw7.mjs';

interface ContainerGridProps {
    /** RGL-compatible layout items */
    layout: readonly LayoutItem[];
    /** Called on every tick of a drag/resize */
    onLayoutChange: (layout: readonly LayoutItem[]) => void;
    /** Called when a drag/resize successfully completes */
    onLayoutSettled?: (layout: readonly LayoutItem[]) => void;
    /** When true, drag, resize, and gutters are enabled. */
    isEditMode?: boolean;
    cols?: number;
    rowHeight?: number;
    margin?: [number, number];
    containerPadding?: [number, number] | null;
    children: React__default.ReactNode;
}
declare function ContainerGrid({ layout, onLayoutChange, onLayoutSettled, isEditMode, cols, rowHeight, margin, containerPadding, children }: ContainerGridProps): react_jsx_runtime.JSX.Element;

export { ContainerGrid, type ContainerGridProps, LayoutItem };
