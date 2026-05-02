/**
 * useGridLayoutDrag — Drag pipeline for GridLayout
 *
 * Extracted from GridLayout.tsx to isolate the drag start/move/stop
 * lifecycle including layout mutation, compaction, and placeholder management.
 *
 * @module react/hooks/useGridLayoutDrag
 */

import { useCallback } from "react";
import { deepEqual } from "fast-equals";

import type {
  Layout,
  LayoutItem,
  CompactType,
  GridDragEvent,
  Compactor,
  EventCallback,
  CollisionResolver
} from "../../core/index.js";
import {
  cloneLayoutItem,
  getLayoutItem,
  moveElement
} from "../../core/index.js";

// ============================================================================
// Types
// ============================================================================

export interface UseGridLayoutDragOptions {
  /** Ref to current layout (avoids stale closures) */
  layoutRef: React.RefObject<Layout>;
  /** Ref to the layout item before drag started */
  oldDragItemRef: React.MutableRefObject<LayoutItem | null>;
  /** Ref to the layout before interaction started */
  oldLayoutRef: React.MutableRefObject<Layout | null>;
  /** Current active drag placeholder (null when not dragging) */
  activeDrag: LayoutItem | null;
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
  /**
   * Custom collision resolver. When provided, replaces the default
   * moveElement → compact pipeline on each drag tick.
   * Return a new layout to accept, or null to reject the move.
   */
  collisionResolver?: CollisionResolver;
  /** Layout state setter */
  setLayout: React.Dispatch<React.SetStateAction<Layout>>;
  /** Active drag placeholder setter */
  setActiveDrag: React.Dispatch<React.SetStateAction<LayoutItem | null>>;
  /** User callbacks */
  onDragStartProp: EventCallback;
  onDragProp: EventCallback;
  onDragStopProp: EventCallback;
  onLayoutChange: (layout: Layout) => void;
}

export interface UseGridLayoutDragResult {
  /** GridItem onDragStart callback */
  onDragStart: (i: string, x: number, y: number, data: GridDragEvent) => void;
  /** GridItem onDrag callback */
  onDrag: (i: string, x: number, y: number, data: GridDragEvent) => void;
  /** GridItem onDragStop callback */
  onDragStop: (i: string, x: number, y: number, data: GridDragEvent) => void;
}

// ============================================================================
// Hook
// ============================================================================

export function useGridLayoutDrag(opts: UseGridLayoutDragOptions): UseGridLayoutDragResult {
  const {
    layoutRef,
    oldDragItemRef,
    oldLayoutRef,
    activeDrag,
    compactor,
    compactType,
    cols,
    allowOverlap,
    preventCollision,
    collisionResolver,
    setLayout,
    setActiveDrag,
    onDragStartProp,
    onDragProp,
    onDragStopProp,
    onLayoutChange,
  } = opts;

  const onDragStart = useCallback(
    (i: string, _x: number, _y: number, data: GridDragEvent) => {
      const currentLayout = layoutRef.current;
      const l = getLayoutItem(currentLayout, i);
      if (!l) return;

      const placeholder: LayoutItem = {
        w: l.w,
        h: l.h,
        x: l.x,
        y: l.y,
        i
      };

      oldDragItemRef.current = cloneLayoutItem(l);
      oldLayoutRef.current = currentLayout;
      setActiveDrag(placeholder);

      onDragStartProp(currentLayout, l, l, null, data.e, data.node);
    },
    [layoutRef, oldDragItemRef, oldLayoutRef, setActiveDrag, onDragStartProp]
  );

  const onDrag = useCallback(
    (i: string, x: number, y: number, data: GridDragEvent) => {
      const currentLayout = layoutRef.current;
      const oldDragItem = oldDragItemRef.current;
      const l = getLayoutItem(currentLayout, i);
      if (!l) return;

      const placeholder: LayoutItem = {
        w: l.w,
        h: l.h,
        x: l.x,
        y: l.y,
        i
      };

      // ── Custom collision resolver path ──
      // When a collisionResolver is provided, it replaces the default
      // moveElement → compact pipeline entirely. The resolver receives
      // the layout with the item at its new grid position and returns
      // a resolved layout (accept) or null (reject — widget stays put).
      if (collisionResolver) {
        // Build a tentative layout with the item at its new position
        const tentative = moveElement(
          currentLayout,
          l,
          x,
          y,
          true,
          false, // no preventCollision — resolver handles it
          compactType,
          cols,
          true   // allowOverlap — let resolver see the raw position
        );
        const movedItem = getLayoutItem(tentative, i);
        if (!movedItem) return;

        const originPos = oldDragItem
          ? { x: oldDragItem.x, y: oldDragItem.y }
          : { x: l.x, y: l.y };

        const resolved = collisionResolver(tentative, movedItem, originPos);

        onDragProp(tentative, oldDragItem, l, placeholder, data.e, data.node);

        if (resolved) {
          // Accept: use resolved layout
          setLayout(compactor.compact(resolved, cols));
          setActiveDrag(placeholder);
        }
        // null = reject: layout stays at last valid state, ghost follows cursor
        return;
      }

      // ── Default moveElement → compact pipeline ──
      const newLayout = moveElement(
        currentLayout,
        l,
        x,
        y,
        true,
        preventCollision,
        compactType,
        cols,
        allowOverlap
      );

      onDragProp(newLayout, oldDragItem, l, placeholder, data.e, data.node);

      // Use compactor.compact() - it handles allowOverlap internally (#2213)
      setLayout(compactor.compact(newLayout, cols));
      setActiveDrag(placeholder);
    },
    [layoutRef, oldDragItemRef, preventCollision, compactType, cols, allowOverlap, compactor, collisionResolver, setLayout, setActiveDrag, onDragProp]
  );

  const onDragStop = useCallback(
    (i: string, x: number, y: number, data: GridDragEvent) => {
      if (!activeDrag) return;

      const currentLayout = layoutRef.current;
      const oldDragItem = oldDragItemRef.current;
      const l = getLayoutItem(currentLayout, i);
      if (!l) return;

      let finalLayout: Layout;

      if (collisionResolver) {
        // Custom resolver path — run resolver one final time for the drop position
        const tentative = moveElement(
          currentLayout,
          l,
          x,
          y,
          true,
          false,
          compactType,
          cols,
          true
        );
        const movedItem = getLayoutItem(tentative, i);
        const originPos = oldDragItem
          ? { x: oldDragItem.x, y: oldDragItem.y }
          : { x: l.x, y: l.y };

        const resolved = movedItem
          ? collisionResolver(tentative, movedItem, originPos)
          : null;

        // If resolver rejects at drop time, keep the current (last valid) layout
        finalLayout = compactor.compact(resolved ?? currentLayout, cols);
      } else {
        // Default path
        const newLayout = moveElement(
          currentLayout,
          l,
          x,
          y,
          true,
          preventCollision,
          compactType,
          cols,
          allowOverlap
        );
        finalLayout = compactor.compact(newLayout, cols);
      }

      onDragStopProp(finalLayout, oldDragItem, l, null, data.e, data.node);

      const oldLayout = oldLayoutRef.current;
      oldDragItemRef.current = null;
      oldLayoutRef.current = null;
      setActiveDrag(null);
      setLayout(finalLayout);

      if (oldLayout && !deepEqual(oldLayout, finalLayout)) {
        onLayoutChange(finalLayout);
      }
    },
    [
      activeDrag,
      layoutRef,
      oldDragItemRef,
      oldLayoutRef,
      preventCollision,
      compactType,
      cols,
      allowOverlap,
      compactor,
      collisionResolver,
      setLayout,
      setActiveDrag,
      onDragStopProp,
      onLayoutChange
    ]
  );

  return { onDragStart, onDrag, onDragStop };
}
