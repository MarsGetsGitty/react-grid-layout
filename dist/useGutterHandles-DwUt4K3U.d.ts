import * as react_jsx_runtime from 'react/jsx-runtime';
import { MouseEvent } from 'react';
import { c as LayoutItem, d as CollisionResolver, L as Layout, e as GridConfig } from './config-CJDJz-fI.js';

interface GutterHandleProps {
    type: "horizontal" | "vertical";
    left: number;
    top: number;
    width: number;
    height: number;
    isActive: boolean;
    onMouseDown: (e: MouseEvent) => void;
}
declare function GutterHandle({ type, left, top, width, height, isActive, onMouseDown, }: GutterHandleProps): react_jsx_runtime.JSX.Element;

/**
 * useGridArrangement — Orchestrates drag/resize collision resolution.
 *
 * Provides a complete set of RGL event handlers that integrate the
 * pcdCollisionResolver (swap-then-push) for drags and the
 * squash-push engine for resizes.
 *
 * This hook is pure library code — it does NOT mutate state directly.
 * Instead, it calls optional callback props so the consumer decides
 * what to do with the resolved layouts.
 *
 * @module react/hooks/useGridArrangement
 */

interface UseGridArrangementParams {
    /** Current layout state (read-only input). */
    layout: readonly LayoutItem[];
    /** Maximum visible rows (for resize boundary enforcement). */
    maxRows: number;
    /** Number of grid columns. */
    cols: number;
    /**
     * Called whenever the layout changes (drag, resize, or RGL internal sync).
     * The consumer is responsible for updating their own state.
     */
    onLayoutChange?: (layout: readonly LayoutItem[]) => void;
}
declare function useGridArrangement({ layout, maxRows, cols, onLayoutChange }: UseGridArrangementParams): {
    isRglInteracting: boolean;
    collisionResolver: CollisionResolver;
    handlers: {
        onLayoutChange: (newLayout: Layout) => void;
        onDragStart: (_newLayout: Layout, oldItem: LayoutItem | null) => void;
        onDrag: (_newLayout: Layout, _oldItem: LayoutItem | null, _newItem: LayoutItem | null) => void;
        onDragStop: (_newLayout: Layout, _oldItem: LayoutItem | null, _newItem: LayoutItem | null) => void;
        onResizeStart: () => void;
        onResize: (newLayout: Layout, oldItem: LayoutItem | null, newItem: LayoutItem | null) => void;
        onResizeStop: (newLayout: Layout, oldItem: LayoutItem | null, newItem: LayoutItem | null) => void;
    };
};

declare function useGutterHandles(layout: readonly LayoutItem[], onGutterResize: (layout: readonly LayoutItem[]) => void, containerWidth: number, gridConfig: GridConfig, isRglInteracting: boolean, isEditMode?: boolean): {
    gutterElements: (react_jsx_runtime.JSX.Element | null)[] | null;
    isDraggingGutter: boolean;
};

export { GutterHandle as G, type UseGridArrangementParams as U, type GutterHandleProps as a, useGutterHandles as b, useGridArrangement as u };
