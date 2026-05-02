/**
 * useGridItemResize — Resize behavior for GridItem
 *
 * Extracted from GridItem.tsx to isolate resize logic (direction inference,
 * size constraint application, pixel→grid conversion).
 *
 * @module react/hooks/useGridItemResize
 */

import { useRef, useState, useCallback } from "react";

import type {
  Position,
  ResizeHandleAxis,
  LayoutConstraint,
  ConstraintContext,
  LayoutItem as LayoutItemType
} from "../../core/index.js";
import type { PositionParams } from "../../core/index.js";
import {
  calcGridItemPosition,
  calcWHRaw
} from "../../core/index.js";
import {
  applySizeConstraints
} from "../../core/index.js";
import {
  resizeItemInDirection
} from "../../core/index.js";

// ============================================================================
// Types
// ============================================================================

// Internal callback data type with typed handle
interface ResizeCallbackData {
  node: HTMLElement;
  size: { width: number; height: number };
  handle: ResizeHandleAxis;
}

// react-resizable callback type (handle is string)
export type ReactResizableCallback = (
  e: React.SyntheticEvent,
  data: {
    node: HTMLElement;
    size: { width: number; height: number };
    handle: string;
  }
) => void;

export interface UseGridItemResizeOptions {
  /** Unique identifier for the grid item */
  i: string;
  /** Grid position/size in grid units */
  x: number;
  y: number;
  w: number;
  h: number;
  /** Position parameters for pixel↔grid conversions */
  positionParams: PositionParams;
  /** Container width in pixels */
  containerWidth: number;
  /** Layout constraints */
  constraints: LayoutConstraint[];
  /** The layout item (for constraints) */
  effectiveLayoutItem: LayoutItemType;
  /** Get fresh constraint context with current layout */
  getConstraintContext: () => ConstraintContext;
  /** Callbacks from parent */
  onResizeStartProp?: (
    i: string,
    w: number,
    h: number,
    data: { e: Event; node: HTMLElement; size: Position; handle: ResizeHandleAxis }
  ) => void;
  onResizeProp?: (
    i: string,
    w: number,
    h: number,
    data: { e: Event; node: HTMLElement; size: Position; handle: ResizeHandleAxis }
  ) => void;
  onResizeStopProp?: (
    i: string,
    w: number,
    h: number,
    data: { e: Event; node: HTMLElement; size: Position; handle: ResizeHandleAxis }
  ) => void;
}

export interface UseGridItemResizeResult {
  /** Whether the item is currently being resized */
  resizing: boolean;
  /** Current resize position in pixels */
  resizePositionRef: React.RefObject<Position>;
  /** react-resizable onResizeStart handler */
  handleResizeStart: ReactResizableCallback;
  /** react-resizable onResize handler */
  handleResize: ReactResizableCallback;
  /** react-resizable onResizeStop handler */
  handleResizeStop: ReactResizableCallback;
}

// ============================================================================
// Hook
// ============================================================================

export function useGridItemResize(opts: UseGridItemResizeOptions): UseGridItemResizeResult {
  const {
    i,
    x,
    y,
    w,
    h,
    positionParams,
    containerWidth,
    constraints,
    effectiveLayoutItem,
    getConstraintContext,
    onResizeStartProp,
    onResizeProp,
    onResizeStopProp,
  } = opts;

  // State
  const [resizing, setResizing] = useState(false);
  const resizePositionRef = useRef<Position>({
    top: 0,
    left: 0,
    width: 0,
    height: 0
  });

  // ── Core Handler ───────────────────────────────────────

  const onResizeHandler = useCallback(
    (
      e: React.SyntheticEvent,
      { node, size, handle: resizeHandle }: ResizeCallbackData,
      position: Position,
      handlerName: "onResizeStart" | "onResize" | "onResizeStop"
    ) => {
      const handler =
        handlerName === "onResizeStart"
          ? onResizeStartProp
          : handlerName === "onResize"
            ? onResizeProp
            : onResizeStopProp;

      if (!handler) return;

      // Sizing based on resize direction
      let updatedSize: Position;
      if (node) {
        updatedSize = resizeItemInDirection(
          resizeHandle,
          position,
          size as Position,
          containerWidth
        );
      } else {
        updatedSize = {
          ...size,
          top: position.top,
          left: position.left
        } as Position;
      }

      resizePositionRef.current = updatedSize;

      // Calculate raw grid dimensions and apply constraints
      const rawSize = calcWHRaw(positionParams, updatedSize.width, updatedSize.height);
      const { w: newW, h: newH } = applySizeConstraints(
        constraints,
        effectiveLayoutItem,
        rawSize.w,
        rawSize.h,
        resizeHandle,
        getConstraintContext()
      );

      handler(i, newW, newH, {
        e: e.nativeEvent,
        node,
        size: updatedSize,
        handle: resizeHandle
      });
    },
    [
      onResizeStartProp,
      onResizeProp,
      onResizeStopProp,
      containerWidth,
      positionParams,
      i,
      constraints,
      effectiveLayoutItem,
      getConstraintContext
    ]
  );

  // ── Wrapper Handlers ───────────────────────────────────

  const handleResizeStart: ReactResizableCallback = useCallback(
    (e, data) => {
      setResizing(true);
      const pos = calcGridItemPosition(positionParams, x, y, w, h);
      const typedData: ResizeCallbackData = {
        ...data,
        handle: data.handle as ResizeHandleAxis
      };
      onResizeHandler(e, typedData, pos, "onResizeStart");
    },
    [onResizeHandler, positionParams, x, y, w, h]
  );

  const handleResize: ReactResizableCallback = useCallback(
    (e, data) => {
      const pos = calcGridItemPosition(positionParams, x, y, w, h);
      const typedData: ResizeCallbackData = {
        ...data,
        handle: data.handle as ResizeHandleAxis
      };
      onResizeHandler(e, typedData, pos, "onResize");
    },
    [onResizeHandler, positionParams, x, y, w, h]
  );

  const handleResizeStop: ReactResizableCallback = useCallback(
    (e, data) => {
      setResizing(false);
      resizePositionRef.current = { top: 0, left: 0, width: 0, height: 0 };
      const pos = calcGridItemPosition(positionParams, x, y, w, h);
      const typedData: ResizeCallbackData = {
        ...data,
        handle: data.handle as ResizeHandleAxis
      };
      onResizeHandler(e, typedData, pos, "onResizeStop");
    },
    [onResizeHandler, positionParams, x, y, w, h]
  );

  return {
    resizing,
    resizePositionRef,
    handleResizeStart,
    handleResize,
    handleResizeStop,
  };
}
