'use strict';

var chunkIE3VS2DW_js = require('./chunk-IE3VS2DW.js');
var chunkNOUAOXSD_js = require('./chunk-NOUAOXSD.js');
var chunkYAXASYWF_js = require('./chunk-YAXASYWF.js');
var chunkVPECGAUQ_js = require('./chunk-VPECGAUQ.js');
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
var freeformCompactor = chunkVPECGAUQ_js.getCompactor(null, true, false);
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
  children
}) {
  const { containerRef, width, height } = chunkIE3VS2DW_js.useContainerDimensions();
  const stableMargin = react.useMemo(() => margin, [margin[0], margin[1]]);
  const stablePadding = react.useMemo(
    () => containerPadding,
    [containerPadding?.[0] ?? null, containerPadding?.[1] ?? null]
  );
  const metrics = react.useMemo(
    () => adaptive !== void 0 ? chunkVPECGAUQ_js.computeAdaptiveMetrics(width, height, { margin: stableMargin, containerPadding: stablePadding, ...adaptive }) : null,
    [adaptive, width, height, stableMargin, stablePadding]
  );
  const effectiveCols = metrics?.cols ?? cols;
  const effectiveRowHeight = metrics?.rowHeight ?? rowHeight;
  const effectivePadding = stablePadding ?? stableMargin;
  const effectiveMaxRows = metrics?.maxRows ?? chunkVPECGAUQ_js.calcMaxRows(height, rowHeight, stableMargin[1], effectivePadding[1]);
  const gridConfig = react.useMemo(() => ({
    cols: effectiveCols,
    rowHeight: effectiveRowHeight,
    margin: stableMargin,
    containerPadding: stablePadding,
    maxRows: effectiveMaxRows
  }), [effectiveCols, effectiveRowHeight, stableMargin, stablePadding, effectiveMaxRows]);
  const { isRglInteracting, collisionResolver, handlers } = chunkYAXASYWF_js.useGridArrangement({
    layout,
    onLayoutChange,
    maxRows: effectiveMaxRows,
    cols: effectiveCols
  });
  const dragConfig = react.useMemo(() => ({
    enabled: isEditMode,
    bounded: false,
    autoResize,
    handle: ".widget-drag-handle",
    cancel: "button, a, input, textarea, select, [data-no-drag]"
  }), [isEditMode, autoResize]);
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
  const { gutterElements, isDraggingGutter } = chunkYAXASYWF_js.useGutterHandles(
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
      chunkNOUAOXSD_js.GridLayout,
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
  get: function () { return chunkIE3VS2DW_js.DEFAULT_BREAKPOINTS; }
});
Object.defineProperty(exports, "DEFAULT_COLS", {
  enumerable: true,
  get: function () { return chunkIE3VS2DW_js.DEFAULT_COLS; }
});
Object.defineProperty(exports, "useContainerDimensions", {
  enumerable: true,
  get: function () { return chunkIE3VS2DW_js.useContainerDimensions; }
});
Object.defineProperty(exports, "useGridLayout", {
  enumerable: true,
  get: function () { return chunkIE3VS2DW_js.useGridLayout; }
});
Object.defineProperty(exports, "useResponsiveLayout", {
  enumerable: true,
  get: function () { return chunkIE3VS2DW_js.useResponsiveLayout; }
});
Object.defineProperty(exports, "GridItem", {
  enumerable: true,
  get: function () { return chunkNOUAOXSD_js.GridItem; }
});
Object.defineProperty(exports, "GridLayout", {
  enumerable: true,
  get: function () { return chunkNOUAOXSD_js.GridLayout; }
});
Object.defineProperty(exports, "ResponsiveGridLayout", {
  enumerable: true,
  get: function () { return chunkNOUAOXSD_js.ResponsiveGridLayout; }
});
Object.defineProperty(exports, "GutterHandle", {
  enumerable: true,
  get: function () { return chunkYAXASYWF_js.GutterHandle; }
});
Object.defineProperty(exports, "useGridArrangement", {
  enumerable: true,
  get: function () { return chunkYAXASYWF_js.useGridArrangement; }
});
Object.defineProperty(exports, "useGutterHandles", {
  enumerable: true,
  get: function () { return chunkYAXASYWF_js.useGutterHandles; }
});
Object.defineProperty(exports, "bottom", {
  enumerable: true,
  get: function () { return chunkVPECGAUQ_js.bottom; }
});
Object.defineProperty(exports, "calcGridItemPosition", {
  enumerable: true,
  get: function () { return chunkVPECGAUQ_js.calcGridItemPosition; }
});
Object.defineProperty(exports, "calcWH", {
  enumerable: true,
  get: function () { return chunkVPECGAUQ_js.calcWH; }
});
Object.defineProperty(exports, "calcXY", {
  enumerable: true,
  get: function () { return chunkVPECGAUQ_js.calcXY; }
});
Object.defineProperty(exports, "cloneLayout", {
  enumerable: true,
  get: function () { return chunkVPECGAUQ_js.cloneLayout; }
});
Object.defineProperty(exports, "cloneLayoutItem", {
  enumerable: true,
  get: function () { return chunkVPECGAUQ_js.cloneLayoutItem; }
});
Object.defineProperty(exports, "getCompactor", {
  enumerable: true,
  get: function () { return chunkVPECGAUQ_js.getCompactor; }
});
Object.defineProperty(exports, "getLayoutItem", {
  enumerable: true,
  get: function () { return chunkVPECGAUQ_js.getLayoutItem; }
});
Object.defineProperty(exports, "horizontalCompactor", {
  enumerable: true,
  get: function () { return chunkVPECGAUQ_js.horizontalCompactor; }
});
Object.defineProperty(exports, "noCompactor", {
  enumerable: true,
  get: function () { return chunkVPECGAUQ_js.noCompactor; }
});
Object.defineProperty(exports, "setTopLeft", {
  enumerable: true,
  get: function () { return chunkVPECGAUQ_js.setTopLeft; }
});
Object.defineProperty(exports, "setTransform", {
  enumerable: true,
  get: function () { return chunkVPECGAUQ_js.setTransform; }
});
Object.defineProperty(exports, "verticalCompactor", {
  enumerable: true,
  get: function () { return chunkVPECGAUQ_js.verticalCompactor; }
});
exports.ContainerGrid = ContainerGrid;
