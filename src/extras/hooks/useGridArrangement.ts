import { useState, useRef, useEffect, useCallback } from 'react';
import type { Dispatch, SetStateAction } from 'react';
import type { Layout, LayoutItem, CollisionResolver, DragSlot } from '../../core/index.js';
import { resolveResizeCollisions } from '../../core/index.js';
import { pcdCollisionResolver } from '../../core/engines/pcd-collision-resolver.js';

export interface UseGridArrangementParams {
  layout: LayoutItem[];
  setLayout: Dispatch<SetStateAction<LayoutItem[]>>;
  maxRows: number;
  cols: number;
}

export function useGridArrangement({ layout, setLayout, maxRows, cols }: UseGridArrangementParams) {
  // Interaction state
  const [isRglInteracting, setIsRglInteracting] = useState(false);
  
  // Refs for synchronous access during RGL drag cycles
  const isRglInteractingRef = useRef(false);
  const layoutRef = useRef(layout);
  const dragSlotRef = useRef<DragSlot | null>(null);

  useEffect(() => {
    layoutRef.current = layout;
  }, [layout]);

  // ── Layout Change Handler ──────────────────────────────
  const handleLayoutChange = useCallback((newLayout: Layout) => {
    setLayout(newLayout as LayoutItem[]);
  }, [setLayout]);

  // ── Collision Resolver ─────────────────────────────────
  const collisionResolver: CollisionResolver = useCallback(
    (tentativeLayout, movedItem, originalPosition, context) => {
      const activeSlot = dragSlotRef.current || originalPosition;
      
      const resolved = pcdCollisionResolver(
        tentativeLayout,
        movedItem,
        activeSlot,
        context
      );

      // If the resolver accepted the move, we update our chain slot
      if (resolved) {
        dragSlotRef.current = { x: movedItem.x, y: movedItem.y };
      }

      return resolved;
    },
    []
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
        setLayout(newLayout as LayoutItem[]);
        return;
      }

      setLayout(prev => {
        const resolved = resolveResizeCollisions(
          newLayout as LayoutItem[],
          newItem.i,
          oldItem,
          newItem,
          maxRows,
          cols
        );
        return resolved ?? prev;
      });
    },
    [maxRows, cols, setLayout]
  );

  const handleResizeStop = useCallback(
    (newLayout: Layout, oldItem: LayoutItem | null, newItem: LayoutItem | null) => {
      isRglInteractingRef.current = false;
      setIsRglInteracting(false);

      if (!oldItem || !newItem) {
        setLayout(newLayout as LayoutItem[]);
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

      setLayout(resolved ?? (newLayout as LayoutItem[]));
    },
    [maxRows, cols, setLayout]
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
