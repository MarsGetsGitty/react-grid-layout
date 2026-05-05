/**
 * useGridLayoutResize — Resize pipeline for GridLayout
 *
 * Extracted from GridLayout.tsx to isolate the resize start/move/stop
 * lifecycle including directional resizing, collision checking,
 * compaction, and placeholder management.
 *
 * @module react/hooks/useGridLayoutResize
 */

import { useCallback } from "react";
import { deepEqual } from "fast-equals";

import type {
  Layout,
  LayoutItem,
  CompactType,
  GridResizeEvent,
  Mutable,
  Compactor,
  EventCallback
} from "../../core/index.js";
import {
  cloneLayoutItem,
  getLayoutItem,
  moveElement,
  withLayoutItem
} from "../../core/index.js";
import { getAllCollisions } from "../../core/index.js";

// ============================================================================
// Types
// ============================================================================

export interface UseGridLayoutResizeOptions {
  /** Ref to current layout (avoids stale closures) */
  layoutRef: React.RefObject<Layout>;
  /** Ref to the layout item before resize started */
  oldResizeItemRef: React.MutableRefObject<LayoutItem | null>;
  /** Ref to the layout before interaction started */
  oldLayoutRef: React.MutableRefObject<Layout | null>;
  /** Compactor instance */
  compactor: Compactor;
  /** Compact type (vertical, horizontal, null) */
  compactType: CompactType;
  /** Number of grid columns */
  cols: number;
  /** Whether overlaps are allowed */
  allowOverlap: boolean;
  /** Whether to prevent collisions */
  preventCollision: boolean;
  /** Callback to report layout mutations (replaces state setter) */
  onLayoutMutation: (layout: Layout) => void;
  /** Active drag placeholder setter */
  setActiveDrag: React.Dispatch<React.SetStateAction<LayoutItem | null>>;
  /** Resizing state setter */
  setResizing: React.Dispatch<React.SetStateAction<boolean>>;
  /** User callbacks */
  onResizeStartProp: EventCallback;
  onResizeProp: EventCallback;
  onResizeStopProp: EventCallback;
  onLayoutChange: (layout: Layout) => void;
}

export interface UseGridLayoutResizeResult {
  /** GridItem onResizeStart callback */
  onResizeStart: (i: string, w: number, h: number, data: GridResizeEvent) => void;
  /** GridItem onResize callback */
  onResize: (i: string, w: number, h: number, data: GridResizeEvent) => void;
  /** GridItem onResizeStop callback */
  onResizeStop: (i: string, w: number, h: number, data: GridResizeEvent) => void;
}

// ============================================================================
// Hook
// ============================================================================

export function useGridLayoutResize(opts: UseGridLayoutResizeOptions): UseGridLayoutResizeResult {
  const {
    layoutRef,
    oldResizeItemRef,
    oldLayoutRef,
    compactor,
    compactType,
    cols,
    allowOverlap,
    preventCollision,
    onLayoutMutation,
    setActiveDrag,
    setResizing,
    onResizeStartProp,
    onResizeProp,
    onResizeStopProp,
    onLayoutChange,
  } = opts;

  const onResizeStart = useCallback(
    (i: string, _w: number, _h: number, data: GridResizeEvent) => {
      const currentLayout = layoutRef.current;
      const l = getLayoutItem(currentLayout, i);
      if (!l) return;

      oldResizeItemRef.current = cloneLayoutItem(l);
      oldLayoutRef.current = currentLayout;
      setResizing(true);

      onResizeStartProp(currentLayout, l, l, null, data.e, data.node);
    },
    [layoutRef, oldResizeItemRef, oldLayoutRef, setResizing, onResizeStartProp]
  );

  const onResize = useCallback(
    (i: string, w: number, h: number, data: GridResizeEvent) => {
      const currentLayout = layoutRef.current;
      const oldResizeItem = oldResizeItemRef.current;
      const { handle } = data;

      let shouldMoveItem = false;
      let newX: number | undefined;
      let newY: number | undefined;

      const [newLayout, l] = withLayoutItem(currentLayout, i, item => {
        newX = item.x;
        newY = item.y;

        // Handle corner/edge resizing that affects position
        if (["sw", "w", "nw", "n", "ne"].includes(handle)) {
          if (["sw", "nw", "w"].includes(handle)) {
            newX = item.x + (item.w - w);
            w = item.x !== newX && newX < 0 ? item.w : w;
            newX = newX < 0 ? 0 : newX;
          }

          if (["ne", "n", "nw"].includes(handle)) {
            newY = item.y + (item.h - h);
            h = item.y !== newY && newY < 0 ? item.h : h;
            newY = newY < 0 ? 0 : newY;
          }

          shouldMoveItem = true;
        }

        // Check for collisions if preventCollision is enabled
        if (preventCollision && !allowOverlap) {
          const collisions = getAllCollisions(currentLayout, {
            ...item,
            w,
            h,
            x: newX ?? item.x,
            y: newY ?? item.y
          }).filter(layoutItem => layoutItem.i !== item.i);

          if (collisions.length > 0) {
            newY = item.y;
            h = item.h;
            newX = item.x;
            w = item.w;
            shouldMoveItem = false;
          }
        }

        (item as Mutable<LayoutItem>).w = w;
        (item as Mutable<LayoutItem>).h = h;

        return item;
      });

      if (!l) return;

      let finalLayout = newLayout;
      if (shouldMoveItem && newX !== undefined && newY !== undefined) {
        finalLayout = moveElement(
          newLayout,
          l,
          newX,
          newY,
          true,
          preventCollision,
          compactType,
          cols,
          allowOverlap
        );
      }

      const placeholder: LayoutItem = {
        w: l.w,
        h: l.h,
        x: l.x,
        y: l.y,
        i,
        static: true
      };

      onResizeProp(
        finalLayout,
        oldResizeItem,
        l,
        placeholder,
        data.e,
        data.node
      );

      // Use compactor.compact() - it handles allowOverlap internally (#2213)
      onLayoutMutation(compactor.compact(finalLayout, cols));
      setActiveDrag(placeholder);
    },
    [layoutRef, oldResizeItemRef, preventCollision, compactType, cols, allowOverlap, compactor, onLayoutMutation, setActiveDrag, onResizeProp]
  );

  const onResizeStop = useCallback(
    (i: string, _w: number, _h: number, data: GridResizeEvent) => {
      const currentLayout = layoutRef.current;
      const oldResizeItem = oldResizeItemRef.current;
      const l = getLayoutItem(currentLayout, i);

      // Use compactor.compact() - it handles allowOverlap internally (#2213)
      const finalLayout = compactor.compact(currentLayout, cols);

      onResizeStopProp(
        finalLayout,
        oldResizeItem,
        l ?? null,
        null,
        data.e,
        data.node
      );

      const oldLayout = oldLayoutRef.current;
      oldResizeItemRef.current = null;
      oldLayoutRef.current = null;
      setActiveDrag(null);
      setResizing(false);
      onLayoutMutation(finalLayout);

      if (oldLayout && !deepEqual(oldLayout, finalLayout)) {
        onLayoutChange(finalLayout);
      }
    },
    [layoutRef, oldResizeItemRef, oldLayoutRef, cols, compactor, onLayoutMutation, setActiveDrag, setResizing, onResizeStopProp, onLayoutChange]
  );

  return { onResizeStart, onResize, onResizeStop };
}
