/**
 * GridItem component
 *
 * An individual item within a grid layout. Handles dragging and resizing.
 *
 * Behavior is delegated to extracted hooks:
 *   - useGridItemDrag  — drag threshold, bounded clamping, constraint application
 *   - useGridItemResize — resize direction inference, size constraints
 *   - useGridItemDrop  — external drop-in simulation (#2210)
 */

import React, {
  useRef,
  useCallback,
  useMemo,
  type ReactElement,
  type CSSProperties
} from "react";
import { createPortal } from "react-dom";
import { DraggableCore } from "react-draggable";
import { Resizable } from "react-resizable";
import clsx from "clsx";

import type {
  Position,
  DroppingPosition,
  ResizeHandleAxis,
  GridDragEvent,
  GridResizeEvent,
  LayoutConstraint,
  ConstraintContext,
  Layout,
  LayoutItem as LayoutItemType,
  PositionStrategy
} from "../../core/index.js";
import type { PositionParams } from "../../core/index.js";
import {
  calcGridItemPosition,
  calcGridItemWHPx,
  calcGridColWidth
} from "../../core/index.js";
import {
  defaultConstraints
} from "../../core/index.js";
import {
  setTransform,
  setTopLeft,
  perc
} from "../../core/index.js";

import { useGridItemDrag } from "../hooks/useGridItemDrag.js";
import { useGridItemResize } from "../hooks/useGridItemResize.js";
import { useGridItemDrop } from "../hooks/useGridItemDrop.js";

// ============================================================================
// Types
// ============================================================================

export type GridItemCallback<Data extends GridDragEvent | GridResizeEvent> = (
  i: string,
  w: number,
  h: number,
  data: Data
) => void;

export type ResizeHandle =
  | ReactElement
  | ((
      resizeHandleAxis: ResizeHandleAxis,
      ref: React.Ref<HTMLElement>
    ) => ReactElement);

export interface GridItemProps {
  /** Child element to render */
  children: ReactElement;
  /** Number of columns in the grid */
  cols: number;
  /** Width of the container in pixels */
  containerWidth: number;
  /** Margin between items [x, y] */
  margin: readonly [number, number];
  /** Padding inside the container [x, y] */
  containerPadding: readonly [number, number];
  /** Height of each row in pixels */
  rowHeight: number;
  /** Maximum number of rows */
  maxRows: number;
  /** Whether the item can be dragged */
  isDraggable: boolean;
  /** Whether the item can be resized */
  isResizable: boolean;
  /** Whether the item is bounded within the container */
  isBounded: boolean;
  /** Whether the item is static (can't be moved/resized) */
  static?: boolean;
  /** Use CSS transforms instead of top/left */
  useCSSTransforms?: boolean;
  /** Use percentage widths for server rendering */
  usePercentages?: boolean;
  /** Scale factor for transforms */
  transformScale?: number;
  /** Position strategy for custom positioning (#2217) */
  positionStrategy?: PositionStrategy;
  /** Drag threshold in pixels before drag starts (#2217) */
  dragThreshold?: number;
  /** Current position of a dropping element */
  droppingPosition?: DroppingPosition;

  /** Additional class name */
  className?: string;
  /** Additional styles */
  style?: CSSProperties;

  /** CSS selector for draggable handle */
  handle?: string;
  /** CSS selector for cancel handle */
  cancel?: string;

  /** X position in grid units */
  x: number;
  /** Y position in grid units */
  y: number;
  /** Width in grid units */
  w: number;
  /** Height in grid units */
  h: number;

  /** Minimum width in grid units */
  minW?: number;
  /** Maximum width in grid units */
  maxW?: number;
  /** Minimum height in grid units */
  minH?: number;
  /** Maximum height in grid units */
  maxH?: number;

  /** Unique identifier */
  i: string;

  /** Which resize handles to show */
  resizeHandles?: ResizeHandleAxis[];
  /** Custom resize handle */
  resizeHandle?: ResizeHandle;

  /** Layout constraints for position/size limiting */
  constraints?: LayoutConstraint[];

  /** The layout item data (for per-item constraints) */
  layoutItem?: LayoutItemType;

  /** Current layout (for constraint context) */
  layout?: Layout;

  /** Called when drag starts */
  onDragStart?: GridItemCallback<GridDragEvent>;
  /** Called during drag */
  onDrag?: GridItemCallback<GridDragEvent>;
  /** Called when drag stops */
  onDragStop?: GridItemCallback<GridDragEvent>;
  /** Called when resize starts */
  onResizeStart?: GridItemCallback<GridResizeEvent>;
  /** Called during resize */
  onResize?: GridItemCallback<GridResizeEvent>;
  /** Called when resize stops */
  onResizeStop?: GridItemCallback<GridResizeEvent>;

  /** When true, drag shows ghost at cursor and dims real widget at grid position */
  ghostDrag?: boolean;
  /** Ref to grid container element (portal target for ghost) */
  gridContainerRef?: React.RefObject<HTMLDivElement | null>;
}

// ============================================================================
// Component
// ============================================================================

/**
 * GridItem - An individual item within a grid layout.
 *
 * Wraps a child element with drag and resize functionality.
 */
export function GridItem(props: GridItemProps): ReactElement {
  const {
    children,
    cols,
    containerWidth,
    margin,
    containerPadding,
    rowHeight,
    maxRows,
    isDraggable,
    isResizable,
    isBounded,
    static: isStatic,
    useCSSTransforms = true,
    usePercentages = false,
    transformScale = 1,
    positionStrategy,
    dragThreshold = 0,
    droppingPosition,
    className = "",
    style,
    handle = "",
    cancel = "",
    x,
    y,
    w,
    h,
    minW = 1,
    maxW = Infinity,
    minH = 1,
    maxH = Infinity,
    i,
    resizeHandles,
    resizeHandle,
    constraints = defaultConstraints,
    layoutItem,
    layout = [],
    onDragStart: onDragStartProp,
    onDrag: onDragProp,
    onDragStop: onDragStopProp,
    onResizeStart: onResizeStartProp,
    onResize: onResizeProp,
    onResizeStop: onResizeStopProp,
    ghostDrag,
    gridContainerRef,
  } = props;

  // Refs
  const elementRef = useRef<HTMLDivElement>(null);

  // Ref to current layout - Critical for preventing infinite update loops (#2210).
  const layoutRef = useRef<Layout>(layout);
  layoutRef.current = layout;

  // Position parameters
  const positionParams: PositionParams = useMemo(
    () => ({
      cols,
      containerPadding: containerPadding as [number, number],
      containerWidth,
      margin: margin as [number, number],
      maxRows,
      rowHeight
    }),
    [cols, containerPadding, containerWidth, margin, maxRows, rowHeight]
  );

  // Constraint context
  const constraintContext: ConstraintContext = useMemo(
    () => ({
      cols,
      maxRows,
      containerWidth,
      containerHeight: 0,
      rowHeight,
      margin,
      containerPadding,
      layout: []
    }),
    [cols, maxRows, containerWidth, rowHeight, margin, containerPadding]
  );

  const getConstraintContext = useCallback(
    (): ConstraintContext => ({
      ...constraintContext,
      layout: layoutRef.current
    }),
    [constraintContext]
  );

  // Effective layout item
  const effectiveLayoutItem: LayoutItemType = useMemo(
    () =>
      layoutItem ?? {
        i,
        x,
        y,
        w,
        h,
        minW,
        maxW,
        minH,
        maxH
      },
    [layoutItem, i, x, y, w, h, minW, maxW, minH, maxH]
  );

  // ============================================================================
  // Hooks
  // ============================================================================

  const {
    dragging,
    dragPositionRef,
    onDragStart,
    onDrag,
    onDragStop,
    onDragStartRef,
    onDragRef,
  } = useGridItemDrag({
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
  });

  const {
    resizing,
    resizePositionRef,
    handleResizeStart,
    handleResize,
    handleResizeStop,
  } = useGridItemResize({
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
  });

  useGridItemDrop({
    i,
    dragging,
    droppingPosition,
    dragPositionRef,
    onDragStartRef,
    onDragRef,
    elementRef,
  });

  // ============================================================================
  // Style Creation
  // ============================================================================

  const createStyle = useCallback(
    (pos: Position): CSSProperties => {
      if (positionStrategy?.calcStyle) {
        return positionStrategy.calcStyle(pos);
      }

      if (useCSSTransforms) {
        return setTransform(pos) as CSSProperties;
      }

      const styleObj = setTopLeft(pos) as CSSProperties;

      if (usePercentages) {
        return {
          ...styleObj,
          left: perc(pos.left / containerWidth),
          width: perc(pos.width / containerWidth)
        };
      }

      return styleObj;
    },
    [positionStrategy, useCSSTransforms, usePercentages, containerWidth]
  );

  // ============================================================================
  // Render
  // ============================================================================

  const pos = calcGridItemPosition(
    positionParams,
    x,
    y,
    w,
    h,
    // Ghost mode: real widget stays at grid position (null = use x,y props)
    // Standard mode: widget follows cursor
    (dragging && !ghostDrag) ? dragPositionRef.current : null,
    resizing ? resizePositionRef.current : null
  );

  const child = React.Children.only(children);

  // Calculate constraints for resizing (#2235)
  const colWidth = calcGridColWidth(positionParams);
  const minConstraints: [number, number] = [
    calcGridItemWHPx(minW, colWidth, margin[0]),
    calcGridItemWHPx(minH, rowHeight, margin[1])
  ];
  const maxConstraints: [number, number] = [
    calcGridItemWHPx(maxW, colWidth, margin[0]),
    calcGridItemWHPx(maxH, rowHeight, margin[1])
  ];

  // Get child props safely
  const childProps = (child as ReactElement<Record<string, unknown>>).props;
  const childClassName = childProps["className"] as string | undefined;
  const childStyle = childProps["style"] as CSSProperties | undefined;

  // Create the child element with updated props
  let newChild: ReactElement = React.cloneElement(child, {
    ref: elementRef,
    className: clsx("react-grid-item", childClassName, className, {
      static: isStatic,
      resizing,
      "react-draggable": isDraggable,
      "react-draggable-dragging": dragging && !ghostDrag,
      "react-grid-item--drag-origin": dragging && ghostDrag,
      dropping: Boolean(droppingPosition),
      cssTransforms: useCSSTransforms
    }),
    style: {
      ...style,
      ...childStyle,
      ...createStyle(pos)
    }
  } as Record<string, unknown>);

  // Ghost overlay — rendered via portal into grid container
  let ghostPortal: React.ReactNode = null;
  if (ghostDrag && dragging && gridContainerRef?.current) {
    const ghostPos = calcGridItemPosition(
      positionParams,
      x,
      y,
      w,
      h,
      dragPositionRef.current, // cursor pixel position
      null
    );

    ghostPortal = createPortal(
      <div
        className="react-grid-ghost"
        style={{
          ...createStyle(ghostPos),
          opacity: 0.6,
          pointerEvents: 'none',
          position: 'absolute',
          zIndex: 9999,
          willChange: 'transform',
          boxShadow: '0 8px 32px rgba(0,0,0,0.25)',
        }}
      >
        {React.cloneElement(child, {
          style: { ...childStyle, width: '100%', height: '100%' },
          className: clsx(childClassName, 'react-grid-ghost-content'),
        } as Record<string, unknown>)}
      </div>,
      gridContainerRef.current!
    );
  }

  // Wrap with Resizable
  const resizableHandle = resizeHandle as
    | ReactElement
    | ((axis: string, ref: React.Ref<HTMLElement>) => ReactElement)
    | undefined;

  newChild = (
    <Resizable
      draggableOpts={{ disabled: !isResizable }}
      className={isResizable ? undefined : "react-resizable-hide"}
      width={pos.width}
      height={pos.height}
      minConstraints={minConstraints}
      maxConstraints={maxConstraints}
      onResizeStart={handleResizeStart}
      onResize={handleResize}
      onResizeStop={handleResizeStop}
      transformScale={transformScale}
      resizeHandles={resizeHandles}
      handle={resizableHandle}
    >
      {newChild}
    </Resizable>
  );

  // Wrap with DraggableCore
  newChild = (
    <DraggableCore
      disabled={!isDraggable}
      onStart={onDragStart}
      onDrag={onDrag}
      onStop={onDragStop}
      handle={handle}
      cancel={".react-resizable-handle" + (cancel ? "," + cancel : "")}
      scale={transformScale}
      nodeRef={elementRef}
    >
      {newChild}
    </DraggableCore>
  );

  return (
    <>
      {newChild}
      {ghostPortal}
    </>
  );
}

export default GridItem;
