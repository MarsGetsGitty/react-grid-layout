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

import { useState, useRef, useEffect, useCallback } from 'react';
import type { Layout, LayoutItem, CollisionResolver, DragSlot } from '../../core/index.js';
import { resolveResizeCollisions } from '../../core/index.js';
import { pcdCollisionResolver } from '../../core/engines/pcd-collision-resolver.js';

export interface UseGridArrangementParams {
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

export function useGridArrangement({ layout, maxRows, cols, onLayoutChange }: UseGridArrangementParams) {
  // Interaction state
  const [isRglInteracting, setIsRglInteracting] = useState(false);
  
  // Refs for synchronous access during RGL drag cycles
  const isRglInteractingRef = useRef(false);
  const layoutRef = useRef(layout);
  const dragSlotRef = useRef<DragSlot | null>(null);
  // Stable ref for the callback to avoid stale closures
  const onLayoutChangeRef = useRef(onLayoutChange);

  useEffect(() => {
    layoutRef.current = layout;
  }, [layout]);

  useEffect(() => {
    onLayoutChangeRef.current = onLayoutChange;
  }, [onLayoutChange]);

  // ── Layout Change Handler ──────────────────────────────
  const handleLayoutChange = useCallback((newLayout: Layout) => {
    onLayoutChangeRef.current?.(newLayout as LayoutItem[]);
  }, []);

  // ── Collision Resolver ─────────────────────────────────
  const collisionResolver: CollisionResolver = useCallback(
    (tentativeLayout, movedItem, originalPosition, context) => {
      const activeSlot = dragSlotRef.current || originalPosition;
      
      // Inject maxRows into the context so the resolver can enforce
      // vertical boundary containment.
      const enrichedContext = context
        ? { ...context, maxRows }
        : context;

      const resolved = pcdCollisionResolver(
        tentativeLayout,
        movedItem,
        activeSlot,
        enrichedContext
      );

      // If the resolver accepted the move, we update our chain slot
      if (resolved) {
        dragSlotRef.current = { x: movedItem.x, y: movedItem.y };
      }

      return resolved;
    },
    [maxRows]
  );

  // ── Drag Handlers ──────────────────────────────────────
  const handleDragStart = useCallback(
    (_newLayout: Layout, oldItem: LayoutItem | null) => {
      isRglInteractingRef.current = true;
      setIsRglInteracting(true);
      if (oldItem) {
        dragSlotRef.current = { x: oldItem.x, y: oldItem.y };
      }
    },
    []
  );

  const handleDrag = useCallback(
    (_newLayout: Layout, _oldItem: LayoutItem | null, _newItem: LayoutItem | null) => {
      // collisionResolver handles all physics natively now.
    },
    []
  );

  const handleDragStop = useCallback(
    (_newLayout: Layout, _oldItem: LayoutItem | null, _newItem: LayoutItem | null) => {
      isRglInteractingRef.current = false;
      setIsRglInteracting(false);
      dragSlotRef.current = null;
    },
    []
  );

  // ── Resize Handlers ────────────────────────────────────
  const handleResizeStart = useCallback(() => {
    isRglInteractingRef.current = true;
    setIsRglInteracting(true);
  }, []);

  const handleResize = useCallback(
    (newLayout: Layout, oldItem: LayoutItem | null, newItem: LayoutItem | null) => {
      if (!oldItem || !newItem) {
        onLayoutChangeRef.current?.(newLayout as LayoutItem[]);
        return;
      }

      const resolved = resolveResizeCollisions(
        newLayout as LayoutItem[],
        newItem.i,
        oldItem,
        newItem,
        maxRows,
        cols
      );
      if (resolved) {
        onLayoutChangeRef.current?.(resolved);
      }
    },
    [maxRows, cols]
  );

  const handleResizeStop = useCallback(
    (newLayout: Layout, oldItem: LayoutItem | null, newItem: LayoutItem | null) => {
      isRglInteractingRef.current = false;
      setIsRglInteracting(false);

      if (!oldItem || !newItem) {
        onLayoutChangeRef.current?.(newLayout as LayoutItem[]);
        return;
      }

      const resolved = resolveResizeCollisions(
        newLayout as LayoutItem[],
        newItem.i,
        oldItem,
        newItem,
        maxRows,
        cols
      );

      onLayoutChangeRef.current?.(resolved ?? (newLayout as LayoutItem[]));
    },
    [maxRows, cols]
  );

  return {
    isRglInteracting,
    collisionResolver,
    handlers: {
      onLayoutChange: handleLayoutChange,
      onDragStart: handleDragStart,
      onDrag: handleDrag,
      onDragStop: handleDragStop,
      onResizeStart: handleResizeStart,
      onResize: handleResize,
      onResizeStop: handleResizeStop
    }
  };
}
