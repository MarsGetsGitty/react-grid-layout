'use strict';

var chunkOW5CUJOF_js = require('./chunk-OW5CUJOF.js');
var chunk6DOUB4G3_js = require('./chunk-6DOUB4G3.js');
var chunkCA5HQNMP_js = require('./chunk-CA5HQNMP.js');
var chunkQIPLLMCP_js = require('./chunk-QIPLLMCP.js');
var react = require('react');
var jsxRuntime = require('react/jsx-runtime');

var ResizeHandle = react.forwardRef(({ handleAxis, ...props }, ref) => /* @__PURE__ */ jsxRuntime.jsx(
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
  handleComponent: /* @__PURE__ */ jsxRuntime.jsx(ResizeHandle, { handleAxis: "" })
};
var freeformCompactor = chunkQIPLLMCP_js.getCompactor(null, true, false);
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
  const { containerRef, width } = chunkOW5CUJOF_js.useContainerWidth();
  const [maxRows, setMaxRows] = react.useState(20);
  react.useEffect(() => {
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
  const { isRglInteracting, collisionResolver, handlers } = chunkCA5HQNMP_js.useGridArrangement({
    layout,
    onLayoutChange,
    maxRows,
    cols
  });
  const dragConfig = react.useMemo(() => ({
    enabled: isEditMode,
    bounded: true,
    handle: ".widget-drag-handle",
    cancel: "button, a, input, textarea, select, [data-no-drag]"
  }), [isEditMode]);
  const editResizeConfig = react.useMemo(() => ({
    ...resizeConfig,
    enabled: isEditMode
  }), [isEditMode]);
  const dropConfig = react.useMemo(() => ({
    enabled: isDroppable ?? isEditMode,
    defaultItem: droppingItem ?? { w: 1, h: 1 },
    onDragOver: onDropDragOver
  }), [isDroppable, isEditMode, droppingItem, onDropDragOver]);
  const wrappedHandlers = react.useMemo(() => {
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
  const gridConfig = react.useMemo(() => ({
    cols,
    rowHeight,
    margin,
    containerPadding,
    maxRows: Infinity
    // Enforced internally by squashPushEngine
  }), [cols, rowHeight, margin, containerPadding]);
  const { gutterElements, isDraggingGutter } = chunkCA5HQNMP_js.useGutterHandles(
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
  return /* @__PURE__ */ jsxRuntime.jsx("div", { ref: containerRef, className: containerClass, style: { height: "100%", width: "100%" }, children: width > 0 && /* @__PURE__ */ jsxRuntime.jsxs(jsxRuntime.Fragment, { children: [
    /* @__PURE__ */ jsxRuntime.jsx(
      chunk6DOUB4G3_js.GridLayout,
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

Object.defineProperty(exports, "DEFAULT_BREAKPOINTS", {
  enumerable: true,
  get: function () { return chunkOW5CUJOF_js.DEFAULT_BREAKPOINTS; }
});
Object.defineProperty(exports, "DEFAULT_COLS", {
  enumerable: true,
  get: function () { return chunkOW5CUJOF_js.DEFAULT_COLS; }
});
Object.defineProperty(exports, "useContainerWidth", {
  enumerable: true,
  get: function () { return chunkOW5CUJOF_js.useContainerWidth; }
});
Object.defineProperty(exports, "useGridLayout", {
  enumerable: true,
  get: function () { return chunkOW5CUJOF_js.useGridLayout; }
});
Object.defineProperty(exports, "useResponsiveLayout", {
  enumerable: true,
  get: function () { return chunkOW5CUJOF_js.useResponsiveLayout; }
});
Object.defineProperty(exports, "GridItem", {
  enumerable: true,
  get: function () { return chunk6DOUB4G3_js.GridItem; }
});
Object.defineProperty(exports, "GridLayout", {
  enumerable: true,
  get: function () { return chunk6DOUB4G3_js.GridLayout; }
});
Object.defineProperty(exports, "ResponsiveGridLayout", {
  enumerable: true,
  get: function () { return chunk6DOUB4G3_js.ResponsiveGridLayout; }
});
Object.defineProperty(exports, "GutterHandle", {
  enumerable: true,
  get: function () { return chunkCA5HQNMP_js.GutterHandle; }
});
Object.defineProperty(exports, "useGridArrangement", {
  enumerable: true,
  get: function () { return chunkCA5HQNMP_js.useGridArrangement; }
});
Object.defineProperty(exports, "useGutterHandles", {
  enumerable: true,
  get: function () { return chunkCA5HQNMP_js.useGutterHandles; }
});
Object.defineProperty(exports, "bottom", {
  enumerable: true,
  get: function () { return chunkQIPLLMCP_js.bottom; }
});
Object.defineProperty(exports, "calcGridItemPosition", {
  enumerable: true,
  get: function () { return chunkQIPLLMCP_js.calcGridItemPosition; }
});
Object.defineProperty(exports, "calcWH", {
  enumerable: true,
  get: function () { return chunkQIPLLMCP_js.calcWH; }
});
Object.defineProperty(exports, "calcXY", {
  enumerable: true,
  get: function () { return chunkQIPLLMCP_js.calcXY; }
});
Object.defineProperty(exports, "cloneLayout", {
  enumerable: true,
  get: function () { return chunkQIPLLMCP_js.cloneLayout; }
});
Object.defineProperty(exports, "cloneLayoutItem", {
  enumerable: true,
  get: function () { return chunkQIPLLMCP_js.cloneLayoutItem; }
});
Object.defineProperty(exports, "getCompactor", {
  enumerable: true,
  get: function () { return chunkQIPLLMCP_js.getCompactor; }
});
Object.defineProperty(exports, "getLayoutItem", {
  enumerable: true,
  get: function () { return chunkQIPLLMCP_js.getLayoutItem; }
});
Object.defineProperty(exports, "horizontalCompactor", {
  enumerable: true,
  get: function () { return chunkQIPLLMCP_js.horizontalCompactor; }
});
Object.defineProperty(exports, "noCompactor", {
  enumerable: true,
  get: function () { return chunkQIPLLMCP_js.noCompactor; }
});
Object.defineProperty(exports, "setTopLeft", {
  enumerable: true,
  get: function () { return chunkQIPLLMCP_js.setTopLeft; }
});
Object.defineProperty(exports, "setTransform", {
  enumerable: true,
  get: function () { return chunkQIPLLMCP_js.setTransform; }
});
Object.defineProperty(exports, "verticalCompactor", {
  enumerable: true,
  get: function () { return chunkQIPLLMCP_js.verticalCompactor; }
});
exports.ContainerGrid = ContainerGrid;
