import React, { forwardRef, useMemo } from "react";
import { GridLayout } from "../components/GridLayout";
import { useContainerDimensions } from "../hooks/useContainerDimensions";
import { useGridArrangement } from "../hooks/useGridArrangement";
import { useGutterHandles } from "../hooks/useGutterHandles";
import { getCompactor } from "../../core/strategies/compactors";
import { computeAdaptiveMetrics } from "../../core/math/adaptive-metrics";
import { calcMaxRows } from "../../core/math/calculate";
import type { AdaptiveOptionsInput } from "../../core/math/adaptive-metrics";
import type { LayoutItem } from "../../core/types/layout";
import type { GridConfig } from "../../core/types/config";

// ── Custom Resize Handle ─────────────────────────────────
const ResizeHandle = forwardRef<
  HTMLDivElement,
  { handleAxis: string } & React.HTMLAttributes<HTMLDivElement>
>(({ handleAxis, ...props }, ref) => (
  <div
    ref={ref}
    className={`react-resizable-handle react-resizable-handle-${handleAxis}`}
    {...props}
  />
));
ResizeHandle.displayName = "ResizeHandle";

const resizeConfig = {
  enabled: true,
  handles: ["s", "w", "e", "n", "sw", "nw", "se", "ne"] as const,
  handleComponent: <ResizeHandle handleAxis="" />,
};

// ── Compactor ────────────────────────────────────────────
const freeformCompactor = getCompactor(null, true, false);

// ── ContainerGrid ────────────────────────────────────────
export interface ContainerGridProps {
  /** RGL-compatible layout items */
  layout: readonly LayoutItem[];
  /** Called on every tick of a drag/resize */
  onLayoutChange: (layout: readonly LayoutItem[]) => void;
  /** Called when a drag/resize successfully completes */
  onLayoutSettled?: (layout: readonly LayoutItem[]) => void;
  /** When true, drag, resize, and gutters are enabled. */
  isEditMode?: boolean;

  // ── Multi-Container Drop Config ──────────────────────────
  /** When true, external elements can be dropped on the grid. Defaults to isEditMode if not provided. */
  isDroppable?: boolean;
  /** Called when an item is dropped onto the grid */
  onDrop?: (layout: readonly LayoutItem[], item: LayoutItem | undefined, e: Event) => void;
  /** Called when dragging over the grid. Return dimensions or false to reject. */
  onDropDragOver?: (e: DragEvent) => { w?: number; h?: number; dragOffsetX?: number; dragOffsetY?: number } | false | void;
  /** Default size for dropped items. */
  droppingItem?: { i: string; w: number; h: number };
  
  // ── Smart Grid Auto-Resize Config ────────────────────────
  /** When true, widgets will intelligently shrink to fit into available gaps during drag. */
  autoResize?: boolean;
  
  // ── Adaptive Grid Config ──────────────────────────────────
  /**
   * When provided, cols, rowHeight, and maxRows are computed from measured
   * container dimensions. Overrides the explicit cols/rowHeight props.
   * Pass `{}` to use all defaults (targetCellWidth=120, cellAspectRatio=0.75).
   * When absent (undefined), behavior is unchanged — uses explicit props.
   */
  adaptive?: AdaptiveOptionsInput;

  // Grid config defaults
  /** Fixed column count. Ignored when `adaptive` is provided. @default 12 */
  cols?: number;
  /** Fixed row height. Ignored when `adaptive` is provided. @default 30 */
  rowHeight?: number;
  margin?: [number, number];
  containerPadding?: [number, number] | null;

  children: React.ReactNode;
}

export function ContainerGrid({
  layout,
  onLayoutChange,
  onLayoutSettled,
  isEditMode = false,
  isDroppable,
  onDrop,
  onDropDragOver,
  droppingItem,
  autoResize = false,
  adaptive,
  cols = 12,
  rowHeight = 30,
  margin = [6, 6],
  containerPadding = null,
  children
}: ContainerGridProps) {
  const { containerRef, width, height } = useContainerDimensions();

  // Stabilize array references — default initializers create new arrays each render,
  // which defeats useMemo dependency checks.
  // eslint-disable-next-line react-hooks/exhaustive-deps -- intentional: compare scalars, not ref
  const stableMargin = useMemo(() => margin, [margin[0], margin[1]]);
  // eslint-disable-next-line react-hooks/exhaustive-deps -- intentional: compare scalars, not ref
  const stablePadding = useMemo(
    () => containerPadding,
    [containerPadding?.[0] ?? null, containerPadding?.[1] ?? null]
  );

  // ── Compute effective grid metrics ────────────────────────
  // When adaptive is provided (even as {}), compute cols/rowHeight/maxRows
  // from measured container dimensions. Otherwise use explicit props.
  // TODO: When PCD starts passing `adaptive`, stabilize the object ref
  // the same way as stableMargin (or require caller to memoize).
  const metrics = useMemo(
    () => adaptive !== undefined
      // adaptive options (spread last) override ContainerGrid's margin/containerPadding
      ? computeAdaptiveMetrics(width, height, { margin: stableMargin, containerPadding: stablePadding, ...adaptive })
      : null,
    [adaptive, width, height, stableMargin, stablePadding]
  );

  const effectiveCols = metrics?.cols ?? cols;
  const effectiveRowHeight = metrics?.rowHeight ?? rowHeight;

  // maxRows: adaptive provides it; non-adaptive computes from height.
  // Both paths use calcMaxRows (single source of truth for the formula).
  const effectivePadding = stablePadding ?? stableMargin;
  const effectiveMaxRows = metrics?.maxRows
    ?? calcMaxRows(height, rowHeight, stableMargin[1], effectivePadding[1]);

  const gridConfig = useMemo<GridConfig>(() => ({
    cols: effectiveCols,
    rowHeight: effectiveRowHeight,
    margin: stableMargin,
    containerPadding: stablePadding,
    maxRows: effectiveMaxRows,
  }), [effectiveCols, effectiveRowHeight, stableMargin, stablePadding, effectiveMaxRows]);

  // Use the grid arrangement hook for collision resolution.
  const { isRglInteracting, collisionResolver, handlers } = useGridArrangement({
    layout,
    onLayoutChange,
    maxRows: effectiveMaxRows,
    cols: effectiveCols,
  });

  // Drag config — controlled by isEditMode.
  const dragConfig = useMemo(() => ({
    enabled: isEditMode,
    bounded: false,
    autoResize,
    handle: ".widget-drag-handle",
    cancel: "button, a, input, textarea, select, [data-no-drag]",
  }), [isEditMode, autoResize]);

  // Resize config — controlled by isEditMode.
  const editResizeConfig = useMemo(() => ({
    ...resizeConfig,
    enabled: isEditMode,
  }), [isEditMode]);

  // Drop config — supports multi-container interactions
  const dropConfig = useMemo(() => ({
    enabled: isDroppable ?? isEditMode,
    defaultItem: droppingItem ?? { w: 1, h: 1 },
    onDragOver: onDropDragOver
  }), [isDroppable, isEditMode, droppingItem, onDropDragOver]);

  // Persistence bridge
  const wrappedHandlers = useMemo(() => {
    return {
      ...handlers,
      onDragStop: (...args: Parameters<typeof handlers.onDragStop>) => {
        handlers.onDragStop(...args);
        if (onLayoutSettled) {
          onLayoutSettled(args[0]);
        }
      },
      onResizeStop: (...args: Parameters<typeof handlers.onResizeStop>) => {
        handlers.onResizeStop(...args);
        if (onLayoutSettled) {
          onLayoutSettled(args[0]);
        }
      },
    };
  }, [handlers, onLayoutSettled]);

  // Gutter Handles overlay
  const { gutterElements, isDraggingGutter } = useGutterHandles(
    layout,
    onLayoutChange,
    width,
    gridConfig,
    isRglInteracting,
    isEditMode,
  );

  const containerClass = [
    "react-grid-container",
    isDraggingGutter && "gutter-dragging",
  ].filter(Boolean).join(" ");

  return (
    <div ref={containerRef} className={containerClass} style={{ height: "100%", width: "100%" }}>
      {width > 0 && (
        <>
          <GridLayout
            layout={layout}
            width={width}
            autoSize={false}
            gridConfig={gridConfig}
            dragConfig={dragConfig}
            resizeConfig={editResizeConfig}
            dropConfig={dropConfig}
            compactor={freeformCompactor}
            collisionResolver={collisionResolver}
            ghostDrag
            onDrop={onDrop}
            {...wrappedHandlers}
          >
            {children}
          </GridLayout>
          {isEditMode && gutterElements}
        </>
      )}
    </div>
  );
}
