import React, { forwardRef, useEffect, useMemo, useState } from "react";
import { GridLayout } from "../components/GridLayout";
import { useContainerWidth } from "../hooks/useContainerWidth";
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
  cols = 12,
  rowHeight = 30,
  margin = [6, 6],
  containerPadding = null,
  children
}: ContainerGridProps) {
  const { containerRef, width } = useContainerWidth();

  // Maximum row count derived from container visible height.
  // Used by squashPushEngine to reject resizes that push widgets off-screen.
  const [maxRows, setMaxRows] = useState(20);

  useEffect(() => {
    const el = (containerRef as React.RefObject<HTMLElement>).current;
    if (!el) return;
    const observer = new ResizeObserver(([entry]) => {
      if (!entry) return;
      const rows = Math.floor(
        (entry.contentRect.height + margin[1]) / (rowHeight + margin[1])
      );
      setMaxRows(Math.max(rows, 4));
    });
    observer.observe(el);
    return () => observer.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [containerRef, rowHeight, margin]);

  // Use the grid arrangement hook for collision resolution.
  const { isRglInteracting, collisionResolver, handlers } = useGridArrangement({
    layout,
    onLayoutChange,
    maxRows,
    cols,
  });

  // Drag config — controlled by isEditMode.
  const dragConfig = useMemo(() => ({
    enabled: isEditMode,
    bounded: true,
    handle: ".widget-drag-handle",
    cancel: "button, a, input, textarea, select, [data-no-drag]",
  }), [isEditMode]);

  // Resize config — controlled by isEditMode.
  const editResizeConfig = useMemo(() => ({
    ...resizeConfig,
    enabled: isEditMode,
  }), [isEditMode]);

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

  const gridConfig = useMemo<GridConfig>(() => ({
    cols,
    rowHeight,
    margin,
    containerPadding,
    maxRows: Infinity, // Enforced internally by squashPushEngine
  }), [cols, rowHeight, margin, containerPadding]);

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
            compactor={freeformCompactor}
            collisionResolver={collisionResolver}
            ghostDrag
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
