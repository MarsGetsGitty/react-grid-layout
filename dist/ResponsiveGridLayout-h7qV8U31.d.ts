import React__default, { CSSProperties, ReactElement } from 'react';
import { e as GridConfig, f as DragConfig, g as ResizeConfig, h as DropConfig, i as PositionStrategy, a as Compactor, j as LayoutConstraint, d as CollisionResolver, L as Layout, c as LayoutItem } from './layout-CFHbwcvs.js';
import { B as Breakpoint, a as Breakpoints, R as ResponsiveLayouts } from './responsive-CAtIWshU.js';

/**
 * GridLayout component
 *
 * A reactive, fluid grid layout with draggable, resizable components.
 *
 * Behavior is delegated to extracted hooks:
 *   - useGridLayoutDrag  — drag start/move/stop pipeline
 *   - useGridLayoutResize — resize pipeline with directional handling
 *   - useGridLayoutDrop  — external HTML5 drag-and-drop
 */

type EventCallback = (layout: Layout, oldItem: LayoutItem | null, newItem: LayoutItem | null, placeholder: LayoutItem | null, event: Event, element: HTMLElement | null) => void;
interface GridLayoutProps {
    /** Child elements to render in the grid */
    children: React__default.ReactNode;
    /** Width of the container in pixels */
    width: number;
    /** Grid measurement configuration. @see GridConfig */
    gridConfig?: Partial<GridConfig>;
    /** Drag behavior configuration. @see DragConfig */
    dragConfig?: Partial<DragConfig>;
    /** Resize behavior configuration. @see ResizeConfig */
    resizeConfig?: Partial<ResizeConfig>;
    /** External drop configuration. @see DropConfig */
    dropConfig?: Partial<DropConfig>;
    /** CSS positioning strategy. @see PositionStrategy */
    positionStrategy?: PositionStrategy;
    /** Layout compaction strategy. @see Compactor */
    compactor?: Compactor;
    /** Layout constraints for position and size limiting. @see LayoutConstraint */
    constraints?: LayoutConstraint[];
    /**
     * Custom collision resolver for drag operations.
     * When provided, replaces the default moveElement → compact pipeline.
     * Return a new layout to accept, or null to reject the move.
     * @see CollisionResolver
     */
    collisionResolver?: CollisionResolver;
    /**
     * When true, drag shows a ghost at the cursor and dims the real widget
     * at its grid position. Requires a collision resolver for best results.
     */
    ghostDrag?: boolean;
    /** Layout definition */
    layout?: Layout;
    /** Item to use when dropping from outside */
    droppingItem?: LayoutItem;
    /** Whether to auto-size the container height */
    autoSize?: boolean;
    /** Additional class name */
    className?: string;
    /** Additional styles */
    style?: CSSProperties;
    /** Ref to the container element */
    innerRef?: React__default.Ref<HTMLDivElement>;
    /** Called when layout changes */
    onLayoutChange?: (layout: Layout) => void;
    /** Called when drag starts */
    onDragStart?: EventCallback;
    /** Called during drag */
    onDrag?: EventCallback;
    /** Called when drag stops */
    onDragStop?: EventCallback;
    /** Called when resize starts */
    onResizeStart?: EventCallback;
    /** Called during resize */
    onResize?: EventCallback;
    /** Called when resize stops */
    onResizeStop?: EventCallback;
    /** Called when an item is dropped from outside */
    onDrop?: (layout: Layout, item: LayoutItem | undefined, e: Event) => void;
    /** Called when dragging over the grid */
    onDropDragOver?: (e: React__default.DragEvent) => {
        w?: number;
        h?: number;
        dragOffsetX?: number;
        dragOffsetY?: number;
    } | false | void;
}
/**
 * GridLayout - A reactive, fluid grid layout with draggable, resizable components.
 */
declare function GridLayout(props: GridLayoutProps): ReactElement;

/**
 * ResponsiveGridLayout component
 *
 * A responsive grid layout that automatically adjusts to container width.
 */

interface ResponsiveGridLayoutProps<B extends Breakpoint = string> extends Omit<GridLayoutProps, "gridConfig" | "layout" | "onLayoutChange"> {
    /** Current breakpoint (optional, auto-detected from width) */
    breakpoint?: B;
    /** Breakpoint definitions (name → min-width) */
    breakpoints?: Breakpoints<B>;
    /** Column counts per breakpoint */
    cols?: Breakpoints<B>;
    /** Layouts for each breakpoint */
    layouts?: ResponsiveLayouts<B>;
    /** Row height (default: 150) */
    rowHeight?: number;
    /** Maximum rows (default: Infinity) */
    maxRows?: number;
    /** Margin between items - can be fixed or per-breakpoint */
    margin?: readonly [number, number] | Partial<Record<B, readonly [number, number]>>;
    /** Container padding - can be fixed or per-breakpoint */
    containerPadding?: readonly [number, number] | Partial<Record<B, readonly [number, number] | null>> | null;
    /** Compactor for layout compaction */
    compactor?: Compactor;
    /** Called when breakpoint changes */
    onBreakpointChange?: (newBreakpoint: B, cols: number) => void;
    /** Called when layout changes */
    onLayoutChange?: (layout: Layout, layouts: ResponsiveLayouts<B>) => void;
    /** Called when width changes */
    onWidthChange?: (containerWidth: number, margin: readonly [number, number], cols: number, containerPadding: readonly [number, number] | null) => void;
}
/**
 * ResponsiveGridLayout - A responsive grid layout that adjusts to container width.
 */
declare function ResponsiveGridLayout<B extends Breakpoint = string>(props: ResponsiveGridLayoutProps<B>): ReactElement;

export { GridLayout as G, ResponsiveGridLayout as R, type GridLayoutProps as a, type ResponsiveGridLayoutProps as b };
