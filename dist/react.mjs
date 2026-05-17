import { useContainerDimensions } from './chunk-2FJPQOQ4.mjs';
export { DEFAULT_BREAKPOINTS, DEFAULT_COLS, useContainerDimensions, useGridLayout, useResponsiveLayout } from './chunk-2FJPQOQ4.mjs';
import { GridLayout } from './chunk-W6FFXZEL.mjs';
export { GridItem, GridLayout, ResponsiveGridLayout } from './chunk-W6FFXZEL.mjs';
import { useGridArrangement, useGutterHandles } from './chunk-Z76V7DBR.mjs';
export { GutterHandle, useGridArrangement, useGutterHandles } from './chunk-Z76V7DBR.mjs';
import { getCompactor, computeAdaptiveMetrics, calcMaxRows } from './chunk-VUW57Z7P.mjs';
export { bottom, calcGridItemPosition, calcWH, calcXY, cloneLayout, cloneLayoutItem, getCompactor, getLayoutItem, horizontalCompactor, noCompactor, setTopLeft, setTransform, verticalCompactor } from './chunk-VUW57Z7P.mjs';
import { forwardRef, useMemo } from 'react';
import { jsx, jsxs, Fragment } from 'react/jsx-runtime';

var ResizeHandle = forwardRef(({ handleAxis, ...props }, ref) => /* @__PURE__ */ jsx(
  "div",
  {
    ref,
    className: `react-resizable-handle react-resizable-handle-${handleAxis}`,
    ...props
  }
));
ResizeHandle.displayName = "ResizeHandle";
var resizeConfig = {
  enabled: true,
  handles: ["s", "w", "e", "n", "sw", "nw", "se", "ne"],
  handleComponent: /* @__PURE__ */ jsx(ResizeHandle, { handleAxis: "" })
};
var freeformCompactor = getCompactor(null, true, false);
function ContainerGrid({
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
  columnWidths,
  children
}) {
  const { containerRef, width, height } = useContainerDimensions();
  const stableMargin = useMemo(() => margin, [margin[0], margin[1]]);
  const stablePadding = useMemo(
    () => containerPadding,
    [containerPadding?.[0] ?? null, containerPadding?.[1] ?? null]
  );
  const metrics = useMemo(
    () => adaptive !== void 0 ? computeAdaptiveMetrics(width, height, { margin: stableMargin, containerPadding: stablePadding, ...adaptive }) : null,
    [adaptive, width, height, stableMargin, stablePadding]
  );
  const effectiveCols = metrics?.cols ?? cols;
  const effectiveRowHeight = metrics?.rowHeight ?? rowHeight;
  const effectivePadding = stablePadding ?? stableMargin;
  const effectiveMaxRows = metrics?.maxRows ?? calcMaxRows(height, rowHeight, stableMargin[1], effectivePadding[1]);
  const stableColumnWidths = useMemo(
    () => columnWidths,
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [columnWidths?.join(",")]
  );
  const gridConfig = useMemo(() => ({
    cols: effectiveCols,
    rowHeight: effectiveRowHeight,
    margin: stableMargin,
    containerPadding: stablePadding,
    maxRows: effectiveMaxRows,
    ...stableColumnWidths ? { columnWidths: stableColumnWidths } : {}
  }), [effectiveCols, effectiveRowHeight, stableMargin, stablePadding, effectiveMaxRows, stableColumnWidths]);
  const { isRglInteracting, collisionResolver, handlers } = useGridArrangement({
    layout,
    onLayoutChange,
    maxRows: effectiveMaxRows,
    cols: effectiveCols
  });
  const dragConfig = useMemo(() => ({
    enabled: isEditMode,
    bounded: false,
    autoResize,
    handle: ".widget-drag-handle",
    cancel: "button, a, input, textarea, select, [data-no-drag]"
  }), [isEditMode, autoResize]);
  const editResizeConfig = useMemo(() => ({
    ...resizeConfig,
    enabled: isEditMode
  }), [isEditMode]);
  const dropConfig = useMemo(() => ({
    enabled: isDroppable ?? isEditMode,
    defaultItem: droppingItem ?? { w: 1, h: 1 },
    onDragOver: onDropDragOver
  }), [isDroppable, isEditMode, droppingItem, onDropDragOver]);
  const wrappedHandlers = useMemo(() => {
    return {
      ...handlers,
      onDragStop: (...args) => {
        handlers.onDragStop(...args);
        if (onLayoutSettled) {
          onLayoutSettled(args[0]);
        }
      },
      onResizeStop: (...args) => {
        handlers.onResizeStop(...args);
        if (onLayoutSettled) {
          onLayoutSettled(args[0]);
        }
      }
    };
  }, [handlers, onLayoutSettled]);
  const { gutterElements, isDraggingGutter } = useGutterHandles(
    layout,
    onLayoutChange,
    width,
    gridConfig,
    isRglInteracting,
    isEditMode
  );
  const containerClass = [
    "react-grid-container",
    isDraggingGutter && "gutter-dragging"
  ].filter(Boolean).join(" ");
  return /* @__PURE__ */ jsx("div", { ref: containerRef, className: containerClass, style: { height: "100%", width: "100%" }, children: width > 0 && /* @__PURE__ */ jsxs(Fragment, { children: [
    /* @__PURE__ */ jsx(
      GridLayout,
      {
        layout,
        width,
        autoSize: false,
        gridConfig,
        dragConfig,
        resizeConfig: editResizeConfig,
        dropConfig,
        compactor: freeformCompactor,
        collisionResolver,
        ghostDrag: true,
        onDrop,
        ...wrappedHandlers,
        children
      }
    ),
    isEditMode && gutterElements
  ] }) });
}

export { ContainerGrid };
