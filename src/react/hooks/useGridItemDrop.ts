/**
 * useGridItemDrop — External drop-in behavior for GridItem
 *
 * Extracted from GridItem.tsx to isolate the dropping item effect.
 * Simulates drag events for externally dropped items using refs
 * to avoid callback dependency changes (#2210).
 *
 * @module react/hooks/useGridItemDrop
 */

import { useRef, useEffect } from "react";
import type { DraggableEventHandler } from "react-draggable";
import type { DroppingPosition } from "../../core/index.js";

// ============================================================================
// Types
// ============================================================================

type PartialPosition = { top: number; left: number };

export interface UseGridItemDropOptions {
  /** Unique identifier for the grid item */
  i: string;
  /** Whether the item is currently being dragged */
  dragging: boolean;
  /** Current position of a dropping element */
  droppingPosition?: DroppingPosition;
  /** Ref to current drag position */
  dragPositionRef: React.RefObject<PartialPosition>;
  /** Ref to latest onDragStart handler */
  onDragStartRef: React.RefObject<DraggableEventHandler | null>;
  /** Ref to latest onDrag handler */
  onDragRef: React.RefObject<DraggableEventHandler | null>;
  /** Ref to the DOM element */
  elementRef: React.RefObject<HTMLDivElement | null>;
}

// ============================================================================
// Hook
// ============================================================================

export function useGridItemDrop(opts: UseGridItemDropOptions): void {
  const {
    i,
    dragging,
    droppingPosition,
    dragPositionRef,
    onDragStartRef,
    onDragRef,
    elementRef,
  } = opts;

  // Previous dropping position for comparison
  const prevDroppingPositionRef = useRef<DroppingPosition | undefined>(undefined);

  // Dropping Item Support - uses refs to avoid callback dependency changes (#2210)
  // The effect only depends on droppingPosition and dragging state.
  // Callbacks are accessed via refs to get the latest version without triggering re-runs.
  useEffect(() => {
    if (!droppingPosition) return;

    const node = elementRef.current;
    if (!node) return;

    const prevDroppingPosition = prevDroppingPositionRef.current || {
      left: 0,
      top: 0
    };

    const shouldDrag =
      dragging &&
      (droppingPosition.left !== prevDroppingPosition.left ||
        droppingPosition.top !== prevDroppingPosition.top);

    if (!dragging) {
      // Start drag - simulate the draggable callback data
      const fakeData = {
        node,
        deltaX: droppingPosition.left,
        deltaY: droppingPosition.top,
        lastX: 0,
        lastY: 0,
        x: droppingPosition.left,
        y: droppingPosition.top
      };
      // Use ref to get latest callback without dependency
      onDragStartRef.current?.(
        droppingPosition.e as unknown as MouseEvent,
        fakeData
      );
    } else if (shouldDrag) {
      // Continue drag
      const deltaX = droppingPosition.left - dragPositionRef.current.left;
      const deltaY = droppingPosition.top - dragPositionRef.current.top;

      const fakeData = {
        node,
        deltaX,
        deltaY,
        lastX: dragPositionRef.current.left,
        lastY: dragPositionRef.current.top,
        x: droppingPosition.left,
        y: droppingPosition.top
      };
      // Use ref to get latest callback without dependency
      onDragRef.current?.(
        droppingPosition.e as unknown as MouseEvent,
        fakeData
      );
    }

    prevDroppingPositionRef.current = droppingPosition;
  }, [droppingPosition, dragging, i, dragPositionRef, onDragStartRef, onDragRef, elementRef]);
}
