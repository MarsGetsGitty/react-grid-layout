/**
 * GridLayout component
 *
 * A reactive, fluid grid layout with draggable, resizable components.
 *
 * Behavior is delegated to extracted hooks:
 *   - useGridLayoutDrag  — drag start/move/stop pipeline
 *   - useGridLayoutResize — resize pipeline with directional handling
 *   - useGridLayoutDrop  — external HTML5 drag-and-drop
 */

import React, {
  useState,
  useCallback,
  useEffect,
  useRef,
  useMemo,
  type ReactElement,
  type CSSProperties
} from "react";

import clsx from "clsx";
import { deepEqual } from "fast-equals";

import type {
  Layout,
  LayoutItem,
  DroppingPosition,
  GridConfig,
  DragConfig,
  ResizeConfig,
  DropConfig,
  PositionStrategy,
  Compactor,
  LayoutConstraint,
  CollisionResolver
} from "../../core/index.js";
import {
  defaultGridConfig,
  defaultDragConfig,
  defaultResizeConfig,
  defaultDropConfig
} from "../../core/index.js";
import {
  bottom,
  cloneLayoutItem,
  getLayoutItem,
  correctBounds
} from "../../core/index.js";
import { getCompactor } from "../../core/index.js";
import { defaultPositionStrategy } from "../../core/index.js";
import { defaultConstraints } from "../../core/index.js";

import { GridItem, type ResizeHandle } from "./GridItem.js";
import { useGridLayoutDrag } from "../hooks/useGridLayoutDrag.js";
import { useGridLayoutResize } from "../hooks/useGridLayoutResize.js";
import { useGridLayoutDrop } from "../hooks/useGridLayoutDrop.js";

// ============================================================================
// Types
// ============================================================================

// Callback type for drag/resize events
type EventCallback = (
  layout: Layout,
  oldItem: LayoutItem | null,
  newItem: LayoutItem | null,
  placeholder: LayoutItem | null,
  event: Event,
  element: HTMLElement | null
) => void;

export interface GridLayoutProps {
  // ===========================================================================
  // Required Props
  // ===========================================================================

  /** Child elements to render in the grid */
  children: React.ReactNode;

  /** Width of the container in pixels */
  width: number;

  // ===========================================================================
  // Composable Configuration Interfaces (v2 API)
  // ===========================================================================

  /** Grid measurement configuration. @see GridConfig */
  gridConfig?: Partial<GridConfig>;

  /** Drag behavior configuration. @see DragConfig */
  dragConfig?: Partial<DragConfig>;

  /** Resize behavior configuration. @see ResizeConfig */
  resizeConfig?: Partial<ResizeConfig>;

  /** External drop configuration. @see DropConfig */
  dropConfig?: Partial<DropConfig>;

  /** CSS positioning strategy. @see PositionStrategy */
  positionStrategy?: PositionStrategy;

  /** Layout compaction strategy. @see Compactor */
  compactor?: Compactor;

  /** Layout constraints for position and size limiting. @see LayoutConstraint */
  constraints?: LayoutConstraint[];

  /**
   * Custom collision resolver for drag operations.
   * When provided, replaces the default moveElement → compact pipeline.
   * Return a new layout to accept, or null to reject the move.
   * @see CollisionResolver
   */
  collisionResolver?: CollisionResolver;

  /**
   * When true, drag shows a ghost at the cursor and dims the real widget
   * at its grid position. Requires a collision resolver for best results.
   */
  ghostDrag?: boolean;

  // ===========================================================================
  // Layout Data
  // ===========================================================================

  /** Layout definition */
  layout?: Layout;

  /** Item to use when dropping from outside */
  droppingItem?: LayoutItem;

  // ===========================================================================
  // Container Props
  // ===========================================================================

  /** Whether to auto-size the container height */
  autoSize?: boolean;

  /** Additional class name */
  className?: string;

  /** Additional styles */
  style?: CSSProperties;

  /** Ref to the container element */
  innerRef?: React.Ref<HTMLDivElement>;

  // ===========================================================================
  // Callbacks
  // ===========================================================================

  /** Called when layout changes */
  onLayoutChange?: (layout: Layout) => void;

  /** Called when drag starts */
  onDragStart?: EventCallback;

  /** Called during drag */
  onDrag?: EventCallback;

  /** Called when drag stops */
  onDragStop?: EventCallback;

  /** Called when resize starts */
  onResizeStart?: EventCallback;

  /** Called during resize */
  onResize?: EventCallback;

  /** Called when resize stops */
  onResizeStop?: EventCallback;

  /** Called when an item is dropped from outside */
  onDrop?: (layout: Layout, item: LayoutItem | undefined, e: Event) => void;

  /** Called when dragging over the grid */
  onDropDragOver?: (
    e: React.DragEvent
  ) =>
    | { w?: number; h?: number; dragOffsetX?: number; dragOffsetY?: number }
    | false
    | void;
}

// ============================================================================
// Utility Functions
// ============================================================================

const noop = () => {};

const layoutClassName = "react-grid-layout";



/**
 * Synchronize layout with children
 */
function synchronizeLayoutWithChildren(
  initialLayout: Layout,
  children: React.ReactNode,
  cols: number,
  compactor: Compactor
): Layout {
  const layout: LayoutItem[] = [];

  React.Children.forEach(children, child => {
    if (!React.isValidElement(child) || child.key === null) return;
    const key = String(child.key);

    const existingItem = initialLayout.find(l => l.i === key);

    if (existingItem) {
      layout.push(cloneLayoutItem(existingItem));
    } else {
      const childProps = child.props as { "data-grid"?: Partial<LayoutItem> };
      const dataGrid = childProps["data-grid"];

      if (dataGrid) {
        layout.push({
          i: key,
          x: dataGrid.x ?? 0,
          y: dataGrid.y ?? 0,
          w: dataGrid.w ?? 1,
          h: dataGrid.h ?? 1,
          minW: dataGrid.minW,
          maxW: dataGrid.maxW,
          minH: dataGrid.minH,
          maxH: dataGrid.maxH,
          static: dataGrid.static,
          isDraggable: dataGrid.isDraggable,
          isResizable: dataGrid.isResizable,
          resizeHandles: dataGrid.resizeHandles,
          isBounded: dataGrid.isBounded
        });
      } else {
        layout.push({
          i: key,
          x: 0,
          y: bottom(layout),
          w: 1,
          h: 1
        });
      }
    }
  });

  const corrected = correctBounds(layout, { cols });
  return compactor.compact(corrected, cols);
}

// ============================================================================
// Component
// ============================================================================

/**
 * GridLayout - A reactive, fluid grid layout with draggable, resizable components.
 */
export function GridLayout(props: GridLayoutProps): ReactElement {
  const {
    // Required
    children,
    width,

    // Composable config interfaces
    gridConfig: gridConfigProp,
    dragConfig: dragConfigProp,
    resizeConfig: resizeConfigProp,
    dropConfig: dropConfigProp,
    positionStrategy = defaultPositionStrategy,
    compactor: compactorProp,
    constraints = defaultConstraints,
    collisionResolver,
    ghostDrag,

    // Layout data
    layout: propsLayout = [],
    droppingItem: droppingItemProp,

    // Container props
    autoSize = true,
    className = "",
    style = {},
    innerRef,

    // Callbacks
    onLayoutChange = noop,
    onDragStart: onDragStartProp = noop,
    onDrag: onDragProp = noop,
    onDragStop: onDragStopProp = noop,
    onResizeStart: onResizeStartProp = noop,
    onResize: onResizeProp = noop,
    onResizeStop: onResizeStopProp = noop,
    onDrop: onDropProp = noop,
    onDropDragOver: onDropDragOverProp = noop
  } = props;

  // ============================================================================
  // Config Resolution
  // ============================================================================

  const gridConfig: GridConfig = useMemo(
    () => ({ ...defaultGridConfig, ...gridConfigProp }),
    [gridConfigProp]
  );
  const dragConfig: DragConfig = useMemo(
    () => ({ ...defaultDragConfig, ...dragConfigProp }),
    [dragConfigProp]
  );
  const resizeConfig: ResizeConfig = useMemo(
    () => ({ ...defaultResizeConfig, ...resizeConfigProp }),
    [resizeConfigProp]
  );
  const dropConfig: DropConfig = useMemo(
    () => ({ ...defaultDropConfig, ...dropConfigProp }),
    [dropConfigProp]
  );

  const { cols, rowHeight, maxRows, margin, containerPadding, columnWidths } = gridConfig;
  const {
    enabled: isDraggable,
    bounded: isBounded,
    handle: draggableHandle,
    cancel: draggableCancel,
    threshold: dragThreshold
  } = dragConfig;
  const {
    enabled: isResizable,
    handles: resizeHandles,
    handleComponent: resizeHandle
  } = resizeConfig;
  const {
    enabled: isDroppable,
    defaultItem: defaultDropItem,
    onDragOver: dropConfigOnDragOver
  } = dropConfig;

  const compactor = compactorProp ?? getCompactor("vertical");
  const compactType = compactor.type;
  const allowOverlap = compactor.allowOverlap;
  const preventCollision = compactor.preventCollision ?? false;

  const droppingItem = useMemo(
    () =>
      droppingItemProp ?? {
        i: "__dropping-elem__",
        x: 0,
        y: 0,
        ...defaultDropItem
      },
    [droppingItemProp, defaultDropItem]
  );

  const useCSSTransforms = positionStrategy.type === "transform";
  const transformScale = positionStrategy.scale;
  const effectiveContainerPadding = containerPadding ?? margin;

  // ============================================================================
  // Layout — Single Source of Truth (derived from props)
  // ============================================================================

  const layout = useMemo(
    () => synchronizeLayoutWithChildren(propsLayout, children, cols, compactor),
    [propsLayout, children, cols, compactor]
  );

  const layoutRef = useRef<Layout>(layout);
  layoutRef.current = layout;

  // Ghost drag: internal container ref for portal target
  const containerNodeRef = useRef<HTMLDivElement>(null);
  const setContainerRef = useCallback((node: HTMLDivElement | null) => {
    containerNodeRef.current = node;
    if (typeof innerRef === 'function') {
      innerRef(node);
    } else if (innerRef && typeof innerRef === 'object') {
      (innerRef as React.MutableRefObject<HTMLDivElement | null>).current = node;
    }
  }, [innerRef]);

  // ============================================================================
  // Transient UI State
  // ============================================================================

  const [mounted, setMounted] = useState(false);
  const [activeDrag, setActiveDrag] = useState<LayoutItem | null>(null);
  const [resizing, setResizing] = useState(false);
  const [droppingDOMNode, setDroppingDOMNode] = useState<ReactElement | null>(null);
  const [droppingPosition, setDroppingPosition] = useState<DroppingPosition | undefined>();
  const [droppingLayoutItem, setDroppingLayoutItem] = useState<LayoutItem | undefined>();

  // Refs for interaction lifecycle
  const oldDragItemRef = useRef<LayoutItem | null>(null);
  const oldResizeItemRef = useRef<LayoutItem | null>(null);
  const oldLayoutRef = useRef<Layout | null>(null);

  // ============================================================================
  // Effects
  // ============================================================================

  // Mount effect — notify consumer of the compacted/synchronized layout
  useEffect(() => {
    setMounted(true);
    onLayoutChange(layout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ============================================================================
  // Layout Mutation Callback
  // ============================================================================

  const handleLayoutMutation = useCallback((newLayout: Layout) => {
    const dropping = newLayout.find(l => l.i === droppingItem.i);
    setDroppingLayoutItem(dropping);

    const publicLayout = newLayout.filter(l => l.i !== droppingItem.i);
    
    // Only fire onLayoutChange if the public layout actually changed
    // This prevents infinite loops when only the dropping item position changes
    if (!deepEqual(publicLayout, layoutRef.current)) {
      onLayoutChange(publicLayout);
    }
  }, [onLayoutChange, droppingItem.i]);

  // ============================================================================
  // Container Height
  // ============================================================================

  const containerHeight = useMemo((): string | undefined => {
    if (!autoSize) return undefined;
    const nbRow = bottom(layout);
    const containerPaddingY = effectiveContainerPadding[1];
    return (
      nbRow * rowHeight + (nbRow - 1) * margin[1] + containerPaddingY * 2 + "px"
    );
  }, [autoSize, layout, rowHeight, margin, effectiveContainerPadding]);

  // ============================================================================
  // Hooks
  // ============================================================================

  const { onDragStart, onDrag, onDragStop } = useGridLayoutDrag({
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
    onLayoutMutation: handleLayoutMutation,
    setActiveDrag,
    onDragStartProp,
    onDragProp,
    onDragStopProp,
    onLayoutChange,
  });

  const { onResizeStart, onResize, onResizeStop } = useGridLayoutResize({
    layoutRef,
    oldResizeItemRef,
    oldLayoutRef,
    compactor,
    compactType,
    cols,
    allowOverlap,
    preventCollision,
    onLayoutMutation: handleLayoutMutation,
    setActiveDrag,
    setResizing,
    onResizeStartProp,
    onResizeProp,
    onResizeStopProp,
    onLayoutChange,
  });

  const {
    handleDragOver,
    handleDragLeave,
    handleDragEnter,
    handleDrop,
  } = useGridLayoutDrop({
    layoutRef,
    droppingItem,
    droppingDOMNode,
    droppingPosition,
    compactor,
    cols,
    margin,
    maxRows,
    rowHeight,
    width,
    effectiveContainerPadding,
    transformScale,
    isDroppable,
    dropConfigOnDragOver,
    onDropDragOverProp,
    onDropProp,
    onLayoutMutation: handleLayoutMutation,
    setDroppingDOMNode,
    setDroppingPosition,
    setActiveDrag,
    columnWidths,
  });

  // ============================================================================
  // Render Helpers
  // ============================================================================

  const processGridItem = useCallback(
    (
      child: ReactElement,
      isDroppingItem?: boolean
    ): ReactElement | null | undefined => {
      if (!child || !child.key) return null;

      let l = getLayoutItem(layout, String(child.key));
      
      if (!l && isDroppingItem && droppingLayoutItem) {
        l = droppingLayoutItem;
      }

      if (!l) return null;

      const draggable =
        typeof l.isDraggable === "boolean"
          ? l.isDraggable
          : !l.static && isDraggable;
      const resizable =
        typeof l.isResizable === "boolean"
          ? l.isResizable
          : !l.static && isResizable;
      const resizeHandlesOptions = l.resizeHandles || [...resizeHandles];
      const bounded = draggable && isBounded && l.isBounded !== false;

      const resizeHandleElement = resizeHandle as ResizeHandle | undefined;

      return (
        <GridItem
          key={l.i}
          containerWidth={width}
          cols={cols}
          margin={margin}
          containerPadding={effectiveContainerPadding}
          maxRows={maxRows}
          rowHeight={rowHeight}
          cancel={draggableCancel}
          handle={draggableHandle}
          onDragStart={onDragStart}
          onDrag={onDrag}
          onDragStop={onDragStop}
          onResizeStart={onResizeStart}
          onResize={onResize}
          onResizeStop={onResizeStop}
          isDraggable={draggable}
          isResizable={resizable}
          isBounded={bounded}
          useCSSTransforms={useCSSTransforms && mounted}
          usePercentages={!mounted}
          transformScale={transformScale}
          positionStrategy={positionStrategy}
          dragThreshold={dragThreshold}
          ghostDrag={ghostDrag}
          gridContainerRef={containerNodeRef}
          w={l.w}
          h={l.h}
          x={l.x}
          y={l.y}
          i={l.i}
          minH={l.minH}
          minW={l.minW}
          maxH={l.maxH}
          maxW={l.maxW}
          static={l.static}
          droppingPosition={isDroppingItem ? droppingPosition : undefined}
          resizeHandles={resizeHandlesOptions}
          resizeHandle={resizeHandleElement}
          constraints={constraints}
          layoutItem={l}
          layout={layout}
          columnWidths={columnWidths}
        >
          {child}
        </GridItem>
      );
    },
    [
      layout,
      width,
      cols,
      margin,
      effectiveContainerPadding,
      maxRows,
      rowHeight,
      draggableCancel,
      draggableHandle,
      onDragStart,
      onDrag,
      onDragStop,
      onResizeStart,
      onResize,
      onResizeStop,
      isDraggable,
      isResizable,
      isBounded,
      useCSSTransforms,
      mounted,
      transformScale,
      positionStrategy,
      dragThreshold,
      droppingPosition,
      resizeHandles,
      resizeHandle,
      constraints,
      ghostDrag,
      columnWidths
    ]
  );

  const renderPlaceholder = (): ReactElement | null => {
    if (!activeDrag) return null;

    return (
      <GridItem
        w={activeDrag.w}
        h={activeDrag.h}
        x={activeDrag.x}
        y={activeDrag.y}
        i={activeDrag.i}
        className={`react-grid-placeholder ${resizing ? "placeholder-resizing" : ""}`}
        containerWidth={width}
        cols={cols}
        margin={margin}
        containerPadding={effectiveContainerPadding}
        maxRows={maxRows}
        rowHeight={rowHeight}
        isDraggable={false}
        isResizable={false}
        isBounded={false}
        useCSSTransforms={useCSSTransforms}
        transformScale={transformScale}
        constraints={constraints}
        layout={layout}
        columnWidths={columnWidths}
      >
        <div />
      </GridItem>
    );
  };

  // ============================================================================
  // Render
  // ============================================================================

  const mergedClassName = clsx(layoutClassName, className, {
    "react-grid-layout--ghost-active": ghostDrag && activeDrag != null
  });
  const mergedStyle: CSSProperties = {
    height: containerHeight,
    ...style
  };

  return (
    <div
      ref={setContainerRef}
      className={mergedClassName}
      style={mergedStyle}
      onDrop={isDroppable ? handleDrop : undefined}
      onDragLeave={isDroppable ? handleDragLeave : undefined}
      onDragEnter={isDroppable ? handleDragEnter : undefined}
      onDragOver={isDroppable ? handleDragOver : undefined}
    >
      {React.Children.map(children, child => {
        if (!React.isValidElement(child)) return null;
        return processGridItem(child);
      })}
      {isDroppable && droppingDOMNode && processGridItem(droppingDOMNode, true)}
      {renderPlaceholder()}
    </div>
  );
}

export default GridLayout;
