/**
 * useGridItemDrag — Drag behavior for GridItem
 *
 * Extracted from GridItem.tsx to isolate drag logic (threshold tracking,
 * pixel→grid conversion, constraint application, bounded clamping).
 *
 * @module react/hooks/useGridItemDrag
 */

import { useRef, useState, useCallback } from "react";
import type { DraggableEventHandler } from "react-draggable";

import type {
  LayoutConstraint,
  ConstraintContext,
  LayoutItem as LayoutItemType,
  PositionStrategy,
  GridDragEvent
} from "../../core/index.js";
import type { PositionParams } from "../../core/index.js";
import {
  calcGridItemWHPx,
  calcGridColWidth,
  calcXYRaw,
  clamp
} from "../../core/index.js";
import {
  applyPositionConstraints
} from "../../core/index.js";

// ============================================================================
// Types
// ============================================================================

type PartialPosition = { top: number; left: number };

export interface UseGridItemDragOptions {
  /** Unique identifier for the grid item */
  i: string;
  /** Grid width/height in grid units */
  w: number;
  h: number;
  /** Position parameters for pixel↔grid conversions */
  positionParams: PositionParams;
  /** Container width in pixels */
  containerWidth: number;
  /** Row height in pixels */
  rowHeight: number;
  /** Margin between items [x, y] */
  margin: readonly [number, number];
  /** Scale factor for transforms */
  transformScale: number;
  /** Whether the item is bounded within the container */
  isBounded: boolean;
  /** Drag threshold in pixels before drag starts */
  dragThreshold: number;
  /** Custom position strategy */
  positionStrategy?: PositionStrategy;
  /** Layout constraints */
  constraints: LayoutConstraint[];
  /** The layout item (for constraints) */
  effectiveLayoutItem: LayoutItemType;
  /** Get fresh constraint context with current layout */
  getConstraintContext: () => ConstraintContext;
  /** Callbacks from parent */
  onDragStartProp?: (
    i: string,
    x: number,
    y: number,
    data: GridDragEvent
  ) => void;
  onDragProp?: (
    i: string,
    x: number,
    y: number,
    data: GridDragEvent
  ) => void;
  onDragStopProp?: (
    i: string,
    x: number,
    y: number,
    data: GridDragEvent
  ) => void;
}

export interface UseGridItemDragResult {
  /** Whether the item is currently being dragged */
  dragging: boolean;
  /** Current drag position in pixels (for ghost/position calculation) */
  dragPositionRef: React.RefObject<PartialPosition>;
  /** DraggableCore onStart handler */
  onDragStart: DraggableEventHandler;
  /** DraggableCore onDrag handler */
  onDrag: DraggableEventHandler;
  /** DraggableCore onStop handler */
  onDragStop: DraggableEventHandler;
  /** Ref to latest onDragStart (for drop effect) */
  onDragStartRef: React.RefObject<DraggableEventHandler | null>;
  /** Ref to latest onDrag (for drop effect) */
  onDragRef: React.RefObject<DraggableEventHandler | null>;
}

// ============================================================================
// Hook
// ============================================================================

export function useGridItemDrag(opts: UseGridItemDragOptions): UseGridItemDragResult {
  const {
    i,
    w,
    h,
    positionParams,
    containerWidth,
    rowHeight,
    margin,
    transformScale,
    isBounded,
    dragThreshold,
    positionStrategy,
    constraints,
    effectiveLayoutItem,
    getConstraintContext,
    onDragStartProp,
    onDragProp,
    onDragStopProp,
  } = opts;

  // State
  const [dragging, setDragging] = useState(false);

  // Refs for position tracking (avoid state for React 18 batching)
  const dragPositionRef = useRef<PartialPosition>({ left: 0, top: 0 });

  // Drag threshold tracking (#2217)
  const dragPendingRef = useRef(false);
  const initialDragClientRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const thresholdExceededRef = useRef(false);

  // Refs to callbacks for use in dropping item effect (#2210)
  const onDragStartRef = useRef<DraggableEventHandler | null>(null);
  const onDragRef = useRef<DraggableEventHandler | null>(null);

  // ── Handlers ───────────────────────────────────────────

  const onDragStart: DraggableEventHandler = useCallback(
    (e, { node }) => {
      if (!onDragStartProp) return;

      const { offsetParent } = node;
      if (!offsetParent) return;

      const parentRect = offsetParent.getBoundingClientRect();
      const clientRect = node.getBoundingClientRect();

      const cLeft = clientRect.left / transformScale;
      const pLeft = parentRect.left / transformScale;
      const cTop = clientRect.top / transformScale;
      const pTop = parentRect.top / transformScale;

      // Use custom positionStrategy.calcDragPosition() if provided (#2217)
      let newPosition: PartialPosition;
      if (positionStrategy?.calcDragPosition) {
        const mouseEvent = e as unknown as MouseEvent;
        newPosition = positionStrategy.calcDragPosition(
          mouseEvent.clientX,
          mouseEvent.clientY,
          mouseEvent.clientX - clientRect.left,
          mouseEvent.clientY - clientRect.top
        );
      } else {
        newPosition = {
          left: cLeft - pLeft + offsetParent.scrollLeft,
          top: cTop - pTop + offsetParent.scrollTop
        };
      }

      dragPositionRef.current = newPosition;

      // Threshold support (#2217)
      if (dragThreshold > 0) {
        const mouseEvent = e as unknown as MouseEvent;
        initialDragClientRef.current = {
          x: mouseEvent.clientX,
          y: mouseEvent.clientY
        };
        dragPendingRef.current = true;
        thresholdExceededRef.current = false;
        setDragging(true);
        return;
      }

      setDragging(true);

      // Calculate raw position and apply constraints
      const rawPos = calcXYRaw(positionParams, newPosition.top, newPosition.left);
      const { x: newX, y: newY } = applyPositionConstraints(
        constraints,
        effectiveLayoutItem,
        rawPos.x,
        rawPos.y,
        getConstraintContext()
      );

      onDragStartProp(i, newX, newY, {
        e: e as unknown as Event,
        node,
        newPosition,
        rawPosition: rawPos
      });
    },
    [
      onDragStartProp,
      transformScale,
      positionParams,
      positionStrategy,
      dragThreshold,
      constraints,
      effectiveLayoutItem,
      getConstraintContext,
      i
    ]
  );

  const onDrag: DraggableEventHandler = useCallback(
    (e, { node, deltaX, deltaY }) => {
      if (!onDragProp || !dragging) return;

      const mouseEvent = e as unknown as MouseEvent;

      // Threshold support (#2217)
      if (dragPendingRef.current && !thresholdExceededRef.current) {
        const dx = mouseEvent.clientX - initialDragClientRef.current.x;
        const dy = mouseEvent.clientY - initialDragClientRef.current.y;
        const distance = Math.hypot(dx, dy);

        if (distance < dragThreshold) {
          return;
        }

        // Threshold exceeded
        thresholdExceededRef.current = true;
        dragPendingRef.current = false;

        if (onDragStartProp) {
          const rawPos = calcXYRaw(
            positionParams,
            dragPositionRef.current.top,
            dragPositionRef.current.left
          );
          const { x: startX, y: startY } = applyPositionConstraints(
            constraints,
            effectiveLayoutItem,
            rawPos.x,
            rawPos.y,
            getConstraintContext()
          );
          onDragStartProp(i, startX, startY, {
            e: e as unknown as Event,
            node,
            newPosition: dragPositionRef.current,
            rawPosition: rawPos
          });
        }
      }

      let top = dragPositionRef.current.top + deltaY;
      let left = dragPositionRef.current.left + deltaX;

      // Pixel-level boundary calculations
      if (isBounded) {
        const { offsetParent } = node;
        if (offsetParent) {
          const bottomBoundary =
            offsetParent.clientHeight -
            calcGridItemWHPx(h, rowHeight, margin[1]);
          top = clamp(top, 0, bottomBoundary);

          const colWidth = calcGridColWidth(positionParams);
          const rightBoundary =
            containerWidth - calcGridItemWHPx(w, colWidth, margin[0]);
          left = clamp(left, 0, rightBoundary);
        }
      }

      const newPosition: PartialPosition = { top, left };
      dragPositionRef.current = newPosition;

      // Calculate raw position and apply constraints
      const rawPos = calcXYRaw(positionParams, top, left);
      const { x: newX, y: newY } = applyPositionConstraints(
        constraints,
        effectiveLayoutItem,
        rawPos.x,
        rawPos.y,
        getConstraintContext()
      );

      onDragProp(i, newX, newY, {
        e: e as unknown as Event,
        node,
        newPosition,
        rawPosition: rawPos
      });
    },
    [
      onDragProp,
      onDragStartProp,
      dragging,
      dragThreshold,
      isBounded,
      h,
      rowHeight,
      margin,
      positionParams,
      containerWidth,
      w,
      i,
      constraints,
      effectiveLayoutItem,
      getConstraintContext
    ]
  );

  const onDragStop: DraggableEventHandler = useCallback(
    (e, { node }) => {
      if (!onDragStopProp || !dragging) return;

      // Reset threshold tracking (#2217)
      const wasPending = dragPendingRef.current;
      dragPendingRef.current = false;
      thresholdExceededRef.current = false;
      initialDragClientRef.current = { x: 0, y: 0 };

      if (wasPending) {
        setDragging(false);
        dragPositionRef.current = { left: 0, top: 0 };
        return;
      }

      const { left, top } = dragPositionRef.current;
      const newPosition: PartialPosition = { top, left };

      setDragging(false);
      dragPositionRef.current = { left: 0, top: 0 };

      // Calculate raw position and apply constraints
      const rawPos = calcXYRaw(positionParams, top, left);
      const { x: newX, y: newY } = applyPositionConstraints(
        constraints,
        effectiveLayoutItem,
        rawPos.x,
        rawPos.y,
        getConstraintContext()
      );

      onDragStopProp(i, newX, newY, {
        e: e as unknown as Event,
        node,
        newPosition,
        rawPosition: rawPos
      });
    },
    [
      onDragStopProp,
      dragging,
      positionParams,
      constraints,
      effectiveLayoutItem,
      getConstraintContext,
      i
    ]
  );

  // Update callback refs for use in dropping item effect (#2210)
  onDragStartRef.current = onDragStart;
  onDragRef.current = onDrag;

  return {
    dragging,
    dragPositionRef,
    onDragStart,
    onDrag,
    onDragStop,
    onDragStartRef,
    onDragRef,
  };
}
