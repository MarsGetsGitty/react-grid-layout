/**
 * useGridLayoutDrag — Drag pipeline for GridLayout
 *
 * Extracted from GridLayout.tsx to isolate the drag start/move/stop
 * lifecycle including layout mutation, compaction, and placeholder management.
 *
 * @module react/hooks/useGridLayoutDrag
 */

import { useCallback, useRef } from "react";
import { deepEqual } from "fast-equals";

import type {
  Layout,
  LayoutItem,
  CompactType,
  GridDragEvent,
  Compactor,
  EventCallback,
  CollisionResolver,
  DragConfig
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
  /** Drag behavior config */
  dragConfig: DragConfig;
  /**
   * Custom collision resolver. When provided, replaces the default
   * moveElement → compact pipeline on each drag tick.
   * Return a new layout to accept, or null to reject the move.
   */
  collisionResolver?: CollisionResolver;
  /** Callback to report layout mutations (replaces state setter) */
  onLayoutMutation: (layout: Layout) => void;
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
    dragConfig,
    collisionResolver,
    onLayoutMutation,
    setActiveDrag,
    onDragStartProp,
    onDragProp,
    onDragStopProp,
    onLayoutChange,
  } = opts;

  const latestDragLayoutRef = useRef<Layout | null>(null);

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
      oldLayoutRef.current = currentLayout.map(item => cloneLayoutItem(item));
      latestDragLayoutRef.current = currentLayout.map(item => cloneLayoutItem(item));
      setActiveDrag(placeholder);

      onDragStartProp(currentLayout, l, l, null, data.e, data.node);
    },
    [layoutRef, oldDragItemRef, oldLayoutRef, setActiveDrag, onDragStartProp]
  );

  const onDrag = useCallback(
    (i: string, x: number, y: number, data: GridDragEvent) => {
      // Use synchronous latest layout to prevent stale state bugs during rapid flicks
      const currentLayout = latestDragLayoutRef.current ?? layoutRef.current;
      const oldDragItem = oldDragItemRef.current;
      const l = getLayoutItem(currentLayout, i);
      if (!l) return;

      // ── Custom collision resolver path ──
      // When a collisionResolver is provided, it replaces the default
      // moveElement → compact pipeline entirely. The resolver receives
      // the layout with the item at its new grid position and returns
      // a resolved layout (accept) or null (reject — widget stays put).
      if (collisionResolver) {
        // Build a tentative layout with the item at its new position
        const tentativeBase = currentLayout.map(item => cloneLayoutItem(item));
        const tentativeItem = getLayoutItem(tentativeBase, i);
        if (!tentativeItem) return;

        const tentative = moveElement(
          tentativeBase,
          tentativeItem,
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
        const resolved = collisionResolver(tentative, movedItem, originPos, { 
          cols, 
          compactType,
          dragConfig,
          oldDragItem: oldDragItem || l,
          cursorPosition: data.rawPosition,
          previousLayout: currentLayout
        });

        // Placeholder tracks the proposed grid position so the user
        // always sees where the widget WOULD land, even when rejected.
        const placeholder: LayoutItem = {
          w: l.w,
          h: l.h,
          x,
          y,
          i
        };

        if (resolved) {
          // Accept: use resolved layout
          const compacted = compactor.compact(resolved, cols);
          latestDragLayoutRef.current = compacted;
          onLayoutMutation(compacted);

          const acceptedItem = getLayoutItem(compacted, i) ?? movedItem;
          onDragProp(compacted, oldDragItem, acceptedItem, placeholder, data.e, data.node);
        } else {
          // Reject: report last valid layout, not the tentative invalid one
          const eventItem = getLayoutItem(currentLayout, i) ?? l;
          onDragProp(currentLayout, oldDragItem, eventItem, placeholder, data.e, data.node);
        }

        // Always update placeholder so it tracks cursor position.
        // On reject the layout stays at last valid state but the
        // placeholder still shows where the widget is being dragged.
        setActiveDrag(placeholder);
        return;
      }

      const placeholder: LayoutItem = {
        w: l.w,
        h: l.h,
        x: l.x,
        y: l.y,
        i
      };

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
      const compacted = compactor.compact(newLayout, cols);
      latestDragLayoutRef.current = compacted;
      onLayoutMutation(compacted);
      setActiveDrag(placeholder);
    },
    [layoutRef, oldDragItemRef, preventCollision, compactType, cols, allowOverlap, compactor, collisionResolver, onLayoutMutation, setActiveDrag, onDragProp]
  );

  const onDragStop = useCallback(
    (i: string, x: number, y: number, data: GridDragEvent) => {
      if (!activeDrag) return;

      const currentLayout = latestDragLayoutRef.current ?? layoutRef.current;
      const oldDragItem = oldDragItemRef.current;
      const l = getLayoutItem(currentLayout, i);
      if (!l) return;

      let finalLayout: Layout;

      if (collisionResolver) {
        // Custom resolver path — commit the last accepted layout.
        // Do NOT re-resolve at the raw drop position: on a fast flick
        // the cursor can be far from the last valid grid position,
        // which causes teleport/overlap bugs.
        finalLayout = compactor.compact(currentLayout, cols);
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
      latestDragLayoutRef.current = null;
      setActiveDrag(null);
      onLayoutMutation(finalLayout);

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
      onLayoutMutation,
      setActiveDrag,
      onDragStopProp,
      onLayoutChange
    ]
  );

  return { onDragStart, onDrag, onDragStop };
}
