import { useContainerWidth } from './chunk-7YJFNXF6.mjs';
export { DEFAULT_BREAKPOINTS, DEFAULT_COLS, useContainerWidth, useGridLayout, useResponsiveLayout } from './chunk-7YJFNXF6.mjs';
import { GridLayout } from './chunk-G57SG3DI.mjs';
export { GridItem, GridLayout, ResponsiveGridLayout } from './chunk-G57SG3DI.mjs';
import { useGridArrangement, useGutterHandles } from './chunk-ZBKAF3DV.mjs';
export { GutterHandle, useGridArrangement, useGutterHandles } from './chunk-ZBKAF3DV.mjs';
import { getCompactor } from './chunk-73AP6TWJ.mjs';
export { bottom, calcGridItemPosition, calcWH, calcXY, cloneLayout, cloneLayoutItem, getCompactor, getLayoutItem, horizontalCompactor, noCompactor, setTopLeft, setTransform, verticalCompactor } from './chunk-73AP6TWJ.mjs';
import { forwardRef, useState, useEffect, useMemo } from 'react';
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
  cols = 12,
  rowHeight = 30,
  margin = [6, 6],
  containerPadding = null,
  children
}) {
  const { containerRef, width } = useContainerWidth();
  const [maxRows, setMaxRows] = useState(20);
  useEffect(() => {
    const el = containerRef.current;
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
  }, [containerRef, rowHeight, margin]);
  const { isRglInteracting, collisionResolver, handlers } = useGridArrangement({
    layout,
    onLayoutChange,
    maxRows,
    cols
  });
  const dragConfig = useMemo(() => ({
    enabled: isEditMode,
    bounded: true,
    handle: ".widget-drag-handle",
    cancel: "button, a, input, textarea, select, [data-no-drag]"
  }), [isEditMode]);
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
  const gridConfig = useMemo(() => ({
    cols,
    rowHeight,
    margin,
    containerPadding,
    maxRows: Infinity
    // Enforced internally by squashPushEngine
  }), [cols, rowHeight, margin, containerPadding]);
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
