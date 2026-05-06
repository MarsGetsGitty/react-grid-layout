import React, { forwardRef, useMemo } from "react";
import { GridLayout } from "../components/GridLayout";
import { useContainerDimensions } from "../hooks/useContainerDimensions";
import { useGridArrangement } from "../hooks/useGridArrangement";
import { useGutterHandles } from "../hooks/useGutterHandles";
import { getCompactor } from "../../core/strategies/compactors";
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
  
  // Grid config defaults
  cols?: number;
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
  cols = 12,
  rowHeight = 30,
  margin = [6, 6],
  containerPadding = null,
  children
}: ContainerGridProps) {
  const { containerRef, width, height } = useContainerDimensions();

  // Compute real maxRows from measured container height.
  // When height is 0 (not measured yet), fall back to Infinity to preserve old behavior.
  const computedMaxRows = height > 0
    ? Math.floor((height + margin[1]) / (rowHeight + margin[1]))
    : Infinity;

  const gridConfig = useMemo<GridConfig>(() => ({
    cols,
    rowHeight,
    margin,
    containerPadding,
    maxRows: computedMaxRows,
  }), [cols, rowHeight, margin, containerPadding, computedMaxRows]);

  // Use the grid arrangement hook for collision resolution.
  const { isRglInteracting, collisionResolver, handlers } = useGridArrangement({
    layout,
    onLayoutChange,
    maxRows: computedMaxRows,
    cols,
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
