'use strict';

var chunkQIPLLMCP_js = require('./chunk-QIPLLMCP.js');
var React3 = require('react');
var reactDom = require('react-dom');
var reactDraggable = require('react-draggable');
var reactResizable = require('react-resizable');
var clsx = require('clsx');
var jsxRuntime = require('react/jsx-runtime');
var fastEquals = require('fast-equals');

function _interopDefault (e) { return e && e.__esModule ? e : { default: e }; }

var React3__default = /*#__PURE__*/_interopDefault(React3);
var clsx__default = /*#__PURE__*/_interopDefault(clsx);

function useGridItemDrag(opts) {
  const {
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
    onDragStopProp
  } = opts;
  const [dragging, setDragging] = React3.useState(false);
  const dragPositionRef = React3.useRef({ left: 0, top: 0 });
  const dragPendingRef = React3.useRef(false);
  const initialDragClientRef = React3.useRef({ x: 0, y: 0 });
  const thresholdExceededRef = React3.useRef(false);
  const onDragStartRef = React3.useRef(null);
  const onDragRef = React3.useRef(null);
  const onDragStart = React3.useCallback(
    (e, { node }) => {
      if (!onDragStartProp) return;
      const { offsetParent } = node;
      if (!offsetParent) return;
      const parentRect = offsetParent.getBoundingClientRect();
      const clientRect = node.getBoundingClientRect();
      const cLeft = clientRect.left / transformScale;
      const pLeft = parentRect.left / transformScale;
      const cTop = clientRect.top / transformScale;
      const pTop = parentRect.top / transformScale;
      let newPosition;
      if (positionStrategy?.calcDragPosition) {
        const mouseEvent = e;
        newPosition = positionStrategy.calcDragPosition(
          mouseEvent.clientX,
          mouseEvent.clientY,
          mouseEvent.clientX - clientRect.left,
          mouseEvent.clientY - clientRect.top
        );
      } else {
        newPosition = {
          left: cLeft - pLeft + offsetParent.scrollLeft,
          top: cTop - pTop + offsetParent.scrollTop
        };
      }
      dragPositionRef.current = newPosition;
      if (dragThreshold > 0) {
        const mouseEvent = e;
        initialDragClientRef.current = {
          x: mouseEvent.clientX,
          y: mouseEvent.clientY
        };
        dragPendingRef.current = true;
        thresholdExceededRef.current = false;
        setDragging(true);
        return;
      }
      setDragging(true);
      const rawPos = chunkQIPLLMCP_js.calcXYRaw(positionParams, newPosition.top, newPosition.left);
      const { x: newX, y: newY } = chunkQIPLLMCP_js.applyPositionConstraints(
        constraints,
        effectiveLayoutItem,
        rawPos.x,
        rawPos.y,
        getConstraintContext()
      );
      onDragStartProp(i, newX, newY, {
        e,
        node,
        newPosition
      });
    },
    [
      onDragStartProp,
      transformScale,
      positionParams,
      positionStrategy,
      dragThreshold,
      constraints,
      effectiveLayoutItem,
      getConstraintContext,
      i
    ]
  );
  const onDrag = React3.useCallback(
    (e, { node, deltaX, deltaY }) => {
      if (!onDragProp || !dragging) return;
      const mouseEvent = e;
      if (dragPendingRef.current && !thresholdExceededRef.current) {
        const dx = mouseEvent.clientX - initialDragClientRef.current.x;
        const dy = mouseEvent.clientY - initialDragClientRef.current.y;
        const distance = Math.hypot(dx, dy);
        if (distance < dragThreshold) {
          return;
        }
        thresholdExceededRef.current = true;
        dragPendingRef.current = false;
        if (onDragStartProp) {
          const rawPos2 = chunkQIPLLMCP_js.calcXYRaw(
            positionParams,
            dragPositionRef.current.top,
            dragPositionRef.current.left
          );
          const { x: startX, y: startY } = chunkQIPLLMCP_js.applyPositionConstraints(
            constraints,
            effectiveLayoutItem,
            rawPos2.x,
            rawPos2.y,
            getConstraintContext()
          );
          onDragStartProp(i, startX, startY, {
            e,
            node,
            newPosition: dragPositionRef.current
          });
        }
      }
      let top = dragPositionRef.current.top + deltaY;
      let left = dragPositionRef.current.left + deltaX;
      if (isBounded) {
        const { offsetParent } = node;
        if (offsetParent) {
          const bottomBoundary = offsetParent.clientHeight - chunkQIPLLMCP_js.calcGridItemWHPx(h, rowHeight, margin[1]);
          top = chunkQIPLLMCP_js.clamp(top, 0, bottomBoundary);
          const colWidth = chunkQIPLLMCP_js.calcGridColWidth(positionParams);
          const rightBoundary = containerWidth - chunkQIPLLMCP_js.calcGridItemWHPx(w, colWidth, margin[0]);
          left = chunkQIPLLMCP_js.clamp(left, 0, rightBoundary);
        }
      }
      const newPosition = { top, left };
      dragPositionRef.current = newPosition;
      const rawPos = chunkQIPLLMCP_js.calcXYRaw(positionParams, top, left);
      const { x: newX, y: newY } = chunkQIPLLMCP_js.applyPositionConstraints(
        constraints,
        effectiveLayoutItem,
        rawPos.x,
        rawPos.y,
        getConstraintContext()
      );
      onDragProp(i, newX, newY, {
        e,
        node,
        newPosition
      });
    },
    [
      onDragProp,
      onDragStartProp,
      dragging,
      dragThreshold,
      isBounded,
      h,
      rowHeight,
      margin,
      positionParams,
      containerWidth,
      w,
      i,
      constraints,
      effectiveLayoutItem,
      getConstraintContext
    ]
  );
  const onDragStop = React3.useCallback(
    (e, { node }) => {
      if (!onDragStopProp || !dragging) return;
      const wasPending = dragPendingRef.current;
      dragPendingRef.current = false;
      thresholdExceededRef.current = false;
      initialDragClientRef.current = { x: 0, y: 0 };
      if (wasPending) {
        setDragging(false);
        dragPositionRef.current = { left: 0, top: 0 };
        return;
      }
      const { left, top } = dragPositionRef.current;
      const newPosition = { top, left };
      setDragging(false);
      dragPositionRef.current = { left: 0, top: 0 };
      const rawPos = chunkQIPLLMCP_js.calcXYRaw(positionParams, top, left);
      const { x: newX, y: newY } = chunkQIPLLMCP_js.applyPositionConstraints(
        constraints,
        effectiveLayoutItem,
        rawPos.x,
        rawPos.y,
        getConstraintContext()
      );
      onDragStopProp(i, newX, newY, {
        e,
        node,
        newPosition
      });
    },
    [
      onDragStopProp,
      dragging,
      positionParams,
      constraints,
      effectiveLayoutItem,
      getConstraintContext,
      i
    ]
  );
  onDragStartRef.current = onDragStart;
  onDragRef.current = onDrag;
  return {
    dragging,
    dragPositionRef,
    onDragStart,
    onDrag,
    onDragStop,
    onDragStartRef,
    onDragRef
  };
}
function useGridItemResize(opts) {
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
    onResizeStopProp
  } = opts;
  const [resizing, setResizing] = React3.useState(false);
  const resizePositionRef = React3.useRef({
    top: 0,
    left: 0,
    width: 0,
    height: 0
  });
  const onResizeHandler = React3.useCallback(
    (e, { node, size, handle: resizeHandle }, position, handlerName) => {
      const handler = handlerName === "onResizeStart" ? onResizeStartProp : handlerName === "onResize" ? onResizeProp : onResizeStopProp;
      if (!handler) return;
      let updatedSize;
      if (node) {
        updatedSize = chunkQIPLLMCP_js.resizeItemInDirection(
          resizeHandle,
          position,
          size,
          containerWidth
        );
      } else {
        updatedSize = {
          ...size,
          top: position.top,
          left: position.left
        };
      }
      resizePositionRef.current = updatedSize;
      const rawSize = chunkQIPLLMCP_js.calcWHRaw(positionParams, updatedSize.width, updatedSize.height);
      const { w: newW, h: newH } = chunkQIPLLMCP_js.applySizeConstraints(
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
  const handleResizeStart = React3.useCallback(
    (e, data) => {
      setResizing(true);
      const pos = chunkQIPLLMCP_js.calcGridItemPosition(positionParams, x, y, w, h);
      const typedData = {
        ...data,
        handle: data.handle
      };
      onResizeHandler(e, typedData, pos, "onResizeStart");
    },
    [onResizeHandler, positionParams, x, y, w, h]
  );
  const handleResize = React3.useCallback(
    (e, data) => {
      const pos = chunkQIPLLMCP_js.calcGridItemPosition(positionParams, x, y, w, h);
      const typedData = {
        ...data,
        handle: data.handle
      };
      onResizeHandler(e, typedData, pos, "onResize");
    },
    [onResizeHandler, positionParams, x, y, w, h]
  );
  const handleResizeStop = React3.useCallback(
    (e, data) => {
      setResizing(false);
      resizePositionRef.current = { top: 0, left: 0, width: 0, height: 0 };
      const pos = chunkQIPLLMCP_js.calcGridItemPosition(positionParams, x, y, w, h);
      const typedData = {
        ...data,
        handle: data.handle
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
    handleResizeStop
  };
}
function useGridItemDrop(opts) {
  const {
    i,
    dragging,
    droppingPosition,
    dragPositionRef,
    onDragStartRef,
    onDragRef,
    elementRef
  } = opts;
  const prevDroppingPositionRef = React3.useRef(void 0);
  React3.useEffect(() => {
    if (!droppingPosition) return;
    const node = elementRef.current;
    if (!node) return;
    const prevDroppingPosition = prevDroppingPositionRef.current || {
      left: 0,
      top: 0
    };
    const shouldDrag = dragging && (droppingPosition.left !== prevDroppingPosition.left || droppingPosition.top !== prevDroppingPosition.top);
    if (!dragging) {
      const fakeData = {
        node,
        deltaX: droppingPosition.left,
        deltaY: droppingPosition.top,
        lastX: 0,
        lastY: 0,
        x: droppingPosition.left,
        y: droppingPosition.top
      };
      onDragStartRef.current?.(
        droppingPosition.e,
        fakeData
      );
    } else if (shouldDrag) {
      const deltaX = droppingPosition.left - dragPositionRef.current.left;
      const deltaY = droppingPosition.top - dragPositionRef.current.top;
      const fakeData = {
        node,
        deltaX,
        deltaY,
        lastX: dragPositionRef.current.left,
        lastY: dragPositionRef.current.top,
        x: droppingPosition.left,
        y: droppingPosition.top
      };
      onDragRef.current?.(
        droppingPosition.e,
        fakeData
      );
    }
    prevDroppingPositionRef.current = droppingPosition;
  }, [droppingPosition, dragging, i, dragPositionRef, onDragStartRef, onDragRef, elementRef]);
}
function GridItem(props) {
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
    constraints = chunkQIPLLMCP_js.defaultConstraints,
    layoutItem,
    layout = [],
    onDragStart: onDragStartProp,
    onDrag: onDragProp,
    onDragStop: onDragStopProp,
    onResizeStart: onResizeStartProp,
    onResize: onResizeProp,
    onResizeStop: onResizeStopProp,
    ghostDrag,
    gridContainerRef
  } = props;
  const elementRef = React3.useRef(null);
  const layoutRef = React3.useRef(layout);
  layoutRef.current = layout;
  const positionParams = React3.useMemo(
    () => ({
      cols,
      containerPadding,
      containerWidth,
      margin,
      maxRows,
      rowHeight
    }),
    [cols, containerPadding, containerWidth, margin, maxRows, rowHeight]
  );
  const constraintContext = React3.useMemo(
    () => ({
      cols,
      maxRows,
      containerWidth,
      containerHeight: 0,
      rowHeight,
      margin,
      layout: []
    }),
    [cols, maxRows, containerWidth, rowHeight, margin]
  );
  const getConstraintContext = React3.useCallback(
    () => ({
      ...constraintContext,
      layout: layoutRef.current
    }),
    [constraintContext]
  );
  const effectiveLayoutItem = React3.useMemo(
    () => layoutItem ?? {
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
  const {
    dragging,
    dragPositionRef,
    onDragStart,
    onDrag,
    onDragStop,
    onDragStartRef,
    onDragRef
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
    onDragStopProp
  });
  const {
    resizing,
    resizePositionRef,
    handleResizeStart,
    handleResize,
    handleResizeStop
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
    onResizeStopProp
  });
  useGridItemDrop({
    i,
    dragging,
    droppingPosition,
    dragPositionRef,
    onDragStartRef,
    onDragRef,
    elementRef
  });
  const createStyle = React3.useCallback(
    (pos2) => {
      if (positionStrategy?.calcStyle) {
        return positionStrategy.calcStyle(pos2);
      }
      if (useCSSTransforms) {
        return chunkQIPLLMCP_js.setTransform(pos2);
      }
      const styleObj = chunkQIPLLMCP_js.setTopLeft(pos2);
      if (usePercentages) {
        return {
          ...styleObj,
          left: chunkQIPLLMCP_js.perc(pos2.left / containerWidth),
          width: chunkQIPLLMCP_js.perc(pos2.width / containerWidth)
        };
      }
      return styleObj;
    },
    [positionStrategy, useCSSTransforms, usePercentages, containerWidth]
  );
  const pos = chunkQIPLLMCP_js.calcGridItemPosition(
    positionParams,
    x,
    y,
    w,
    h,
    // Ghost mode: real widget stays at grid position (null = use x,y props)
    // Standard mode: widget follows cursor
    dragging && !ghostDrag ? dragPositionRef.current : null,
    resizing ? resizePositionRef.current : null
  );
  const child = React3__default.default.Children.only(children);
  const colWidth = chunkQIPLLMCP_js.calcGridColWidth(positionParams);
  const minConstraints = [
    chunkQIPLLMCP_js.calcGridItemWHPx(minW, colWidth, margin[0]),
    chunkQIPLLMCP_js.calcGridItemWHPx(minH, rowHeight, margin[1])
  ];
  const maxConstraints = [
    chunkQIPLLMCP_js.calcGridItemWHPx(maxW, colWidth, margin[0]),
    chunkQIPLLMCP_js.calcGridItemWHPx(maxH, rowHeight, margin[1])
  ];
  const childProps = child.props;
  const childClassName = childProps["className"];
  const childStyle = childProps["style"];
  let newChild = React3__default.default.cloneElement(child, {
    ref: elementRef,
    className: clsx__default.default("react-grid-item", childClassName, className, {
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
  });
  let ghostPortal = null;
  if (ghostDrag && dragging && gridContainerRef?.current) {
    const ghostPos = chunkQIPLLMCP_js.calcGridItemPosition(
      positionParams,
      x,
      y,
      w,
      h,
      dragPositionRef.current,
      // cursor pixel position
      null
    );
    ghostPortal = reactDom.createPortal(
      /* @__PURE__ */ jsxRuntime.jsx(
        "div",
        {
          className: "react-grid-ghost",
          style: {
            ...createStyle(ghostPos),
            opacity: 0.6,
            pointerEvents: "none",
            position: "absolute",
            zIndex: 9999,
            willChange: "transform",
            boxShadow: "0 8px 32px rgba(0,0,0,0.25)"
          },
          children: React3__default.default.cloneElement(child, {
            style: { ...childStyle, width: "100%", height: "100%" },
            className: clsx__default.default(childClassName, "react-grid-ghost-content")
          })
        }
      ),
      gridContainerRef.current
    );
  }
  const resizableHandle = resizeHandle;
  newChild = /* @__PURE__ */ jsxRuntime.jsx(
    reactResizable.Resizable,
    {
      draggableOpts: { disabled: !isResizable },
      className: isResizable ? void 0 : "react-resizable-hide",
      width: pos.width,
      height: pos.height,
      minConstraints,
      maxConstraints,
      onResizeStart: handleResizeStart,
      onResize: handleResize,
      onResizeStop: handleResizeStop,
      transformScale,
      resizeHandles,
      handle: resizableHandle,
      children: newChild
    }
  );
  newChild = /* @__PURE__ */ jsxRuntime.jsx(
    reactDraggable.DraggableCore,
    {
      disabled: !isDraggable,
      onStart: onDragStart,
      onDrag,
      onStop: onDragStop,
      handle,
      cancel: ".react-resizable-handle" + (cancel ? "," + cancel : ""),
      scale: transformScale,
      nodeRef: elementRef,
      children: newChild
    }
  );
  return /* @__PURE__ */ jsxRuntime.jsxs(jsxRuntime.Fragment, { children: [
    newChild,
    ghostPortal
  ] });
}
function useGridLayoutDrag(opts) {
  const {
    layoutRef,
    oldDragItemRef,
    oldLayoutRef,
    activeDrag,
    compactor,
    compactType,
    cols,
    allowOverlap,
    preventCollision,
    collisionResolver,
    onLayoutMutation,
    setActiveDrag,
    onDragStartProp,
    onDragProp,
    onDragStopProp,
    onLayoutChange
  } = opts;
  const latestDragLayoutRef = React3.useRef(null);
  const onDragStart = React3.useCallback(
    (i, _x, _y, data) => {
      const currentLayout = layoutRef.current;
      const l = chunkQIPLLMCP_js.getLayoutItem(currentLayout, i);
      if (!l) return;
      const placeholder = {
        w: l.w,
        h: l.h,
        x: l.x,
        y: l.y,
        i
      };
      oldDragItemRef.current = chunkQIPLLMCP_js.cloneLayoutItem(l);
      oldLayoutRef.current = currentLayout.map((item) => chunkQIPLLMCP_js.cloneLayoutItem(item));
      latestDragLayoutRef.current = currentLayout.map((item) => chunkQIPLLMCP_js.cloneLayoutItem(item));
      setActiveDrag(placeholder);
      onDragStartProp(currentLayout, l, l, null, data.e, data.node);
    },
    [layoutRef, oldDragItemRef, oldLayoutRef, setActiveDrag, onDragStartProp]
  );
  const onDrag = React3.useCallback(
    (i, x, y, data) => {
      const currentLayout = latestDragLayoutRef.current ?? layoutRef.current;
      const oldDragItem = oldDragItemRef.current;
      const l = chunkQIPLLMCP_js.getLayoutItem(currentLayout, i);
      if (!l) return;
      if (collisionResolver) {
        const tentativeBase = currentLayout.map((item) => chunkQIPLLMCP_js.cloneLayoutItem(item));
        const tentativeItem = chunkQIPLLMCP_js.getLayoutItem(tentativeBase, i);
        if (!tentativeItem) return;
        const tentative = chunkQIPLLMCP_js.moveElement(
          tentativeBase,
          tentativeItem,
          x,
          y,
          true,
          false,
          // no preventCollision — resolver handles it
          compactType,
          cols,
          true
          // allowOverlap — let resolver see the raw position
        );
        const movedItem = chunkQIPLLMCP_js.getLayoutItem(tentative, i);
        if (!movedItem) return;
        const originPos = oldDragItem ? { x: oldDragItem.x, y: oldDragItem.y } : { x: l.x, y: l.y };
        const resolved = collisionResolver(tentative, movedItem, originPos, { cols, compactType });
        const placeholder2 = {
          w: l.w,
          h: l.h,
          x,
          y,
          i
        };
        if (resolved) {
          const compacted2 = compactor.compact(resolved, cols);
          latestDragLayoutRef.current = compacted2;
          onLayoutMutation(compacted2);
          const acceptedItem = chunkQIPLLMCP_js.getLayoutItem(compacted2, i) ?? movedItem;
          onDragProp(compacted2, oldDragItem, acceptedItem, placeholder2, data.e, data.node);
        } else {
          const eventItem = chunkQIPLLMCP_js.getLayoutItem(currentLayout, i) ?? l;
          onDragProp(currentLayout, oldDragItem, eventItem, placeholder2, data.e, data.node);
        }
        setActiveDrag(placeholder2);
        return;
      }
      const placeholder = {
        w: l.w,
        h: l.h,
        x: l.x,
        y: l.y,
        i
      };
      const newLayout = chunkQIPLLMCP_js.moveElement(
        currentLayout,
        l,
        x,
        y,
        true,
        preventCollision,
        compactType,
        cols,
        allowOverlap
      );
      onDragProp(newLayout, oldDragItem, l, placeholder, data.e, data.node);
      const compacted = compactor.compact(newLayout, cols);
      latestDragLayoutRef.current = compacted;
      onLayoutMutation(compacted);
      setActiveDrag(placeholder);
    },
    [layoutRef, oldDragItemRef, preventCollision, compactType, cols, allowOverlap, compactor, collisionResolver, onLayoutMutation, setActiveDrag, onDragProp]
  );
  const onDragStop = React3.useCallback(
    (i, x, y, data) => {
      if (!activeDrag) return;
      const currentLayout = latestDragLayoutRef.current ?? layoutRef.current;
      const oldDragItem = oldDragItemRef.current;
      const l = chunkQIPLLMCP_js.getLayoutItem(currentLayout, i);
      if (!l) return;
      let finalLayout;
      if (collisionResolver) {
        finalLayout = compactor.compact(currentLayout, cols);
      } else {
        const newLayout = chunkQIPLLMCP_js.moveElement(
          currentLayout,
          l,
          x,
          y,
          true,
          preventCollision,
          compactType,
          cols,
          allowOverlap
        );
        finalLayout = compactor.compact(newLayout, cols);
      }
      onDragStopProp(finalLayout, oldDragItem, l, null, data.e, data.node);
      const oldLayout = oldLayoutRef.current;
      oldDragItemRef.current = null;
      oldLayoutRef.current = null;
      latestDragLayoutRef.current = null;
      setActiveDrag(null);
      onLayoutMutation(finalLayout);
      if (oldLayout && !fastEquals.deepEqual(oldLayout, finalLayout)) {
        onLayoutChange(finalLayout);
      }
    },
    [
      activeDrag,
      layoutRef,
      oldDragItemRef,
      oldLayoutRef,
      preventCollision,
      compactType,
      cols,
      allowOverlap,
      compactor,
      collisionResolver,
      onLayoutMutation,
      setActiveDrag,
      onDragStopProp,
      onLayoutChange
    ]
  );
  return { onDragStart, onDrag, onDragStop };
}
function useGridLayoutResize(opts) {
  const {
    layoutRef,
    oldResizeItemRef,
    oldLayoutRef,
    compactor,
    compactType,
    cols,
    allowOverlap,
    preventCollision,
    onLayoutMutation,
    setActiveDrag,
    setResizing,
    onResizeStartProp,
    onResizeProp,
    onResizeStopProp,
    onLayoutChange
  } = opts;
  const onResizeStart = React3.useCallback(
    (i, _w, _h, data) => {
      const currentLayout = layoutRef.current;
      const l = chunkQIPLLMCP_js.getLayoutItem(currentLayout, i);
      if (!l) return;
      oldResizeItemRef.current = chunkQIPLLMCP_js.cloneLayoutItem(l);
      oldLayoutRef.current = currentLayout;
      setResizing(true);
      onResizeStartProp(currentLayout, l, l, null, data.e, data.node);
    },
    [layoutRef, oldResizeItemRef, oldLayoutRef, setResizing, onResizeStartProp]
  );
  const onResize = React3.useCallback(
    (i, w, h, data) => {
      const currentLayout = layoutRef.current;
      const oldResizeItem = oldResizeItemRef.current;
      const { handle } = data;
      let shouldMoveItem = false;
      let newX;
      let newY;
      const [newLayout, l] = chunkQIPLLMCP_js.withLayoutItem(currentLayout, i, (item) => {
        newX = item.x;
        newY = item.y;
        if (["sw", "w", "nw", "n", "ne"].includes(handle)) {
          if (["sw", "nw", "w"].includes(handle)) {
            newX = item.x + (item.w - w);
            w = item.x !== newX && newX < 0 ? item.w : w;
            newX = newX < 0 ? 0 : newX;
          }
          if (["ne", "n", "nw"].includes(handle)) {
            newY = item.y + (item.h - h);
            h = item.y !== newY && newY < 0 ? item.h : h;
            newY = newY < 0 ? 0 : newY;
          }
          shouldMoveItem = true;
        }
        if (preventCollision && !allowOverlap) {
          const collisions = chunkQIPLLMCP_js.getAllCollisions(currentLayout, {
            ...item,
            w,
            h,
            x: newX ?? item.x,
            y: newY ?? item.y
          }).filter((layoutItem) => layoutItem.i !== item.i);
          if (collisions.length > 0) {
            newY = item.y;
            h = item.h;
            newX = item.x;
            w = item.w;
            shouldMoveItem = false;
          }
        }
        item.w = w;
        item.h = h;
        return item;
      });
      if (!l) return;
      let finalLayout = newLayout;
      if (shouldMoveItem && newX !== void 0 && newY !== void 0) {
        finalLayout = chunkQIPLLMCP_js.moveElement(
          newLayout,
          l,
          newX,
          newY,
          true,
          preventCollision,
          compactType,
          cols,
          allowOverlap
        );
      }
      const placeholder = {
        w: l.w,
        h: l.h,
        x: l.x,
        y: l.y,
        i,
        static: true
      };
      onResizeProp(
        finalLayout,
        oldResizeItem,
        l,
        placeholder,
        data.e,
        data.node
      );
      onLayoutMutation(compactor.compact(finalLayout, cols));
      setActiveDrag(placeholder);
    },
    [layoutRef, oldResizeItemRef, preventCollision, compactType, cols, allowOverlap, compactor, onLayoutMutation, setActiveDrag, onResizeProp]
  );
  const onResizeStop = React3.useCallback(
    (i, _w, _h, data) => {
      const currentLayout = layoutRef.current;
      const oldResizeItem = oldResizeItemRef.current;
      const l = chunkQIPLLMCP_js.getLayoutItem(currentLayout, i);
      const finalLayout = compactor.compact(currentLayout, cols);
      onResizeStopProp(
        finalLayout,
        oldResizeItem,
        l ?? null,
        null,
        data.e,
        data.node
      );
      const oldLayout = oldLayoutRef.current;
      oldResizeItemRef.current = null;
      oldLayoutRef.current = null;
      setActiveDrag(null);
      setResizing(false);
      onLayoutMutation(finalLayout);
      if (oldLayout && !fastEquals.deepEqual(oldLayout, finalLayout)) {
        onLayoutChange(finalLayout);
      }
    },
    [layoutRef, oldResizeItemRef, oldLayoutRef, cols, compactor, onLayoutMutation, setActiveDrag, setResizing, onResizeStopProp, onLayoutChange]
  );
  return { onResizeStart, onResize, onResizeStop };
}
var isFirefox = false;
try {
  isFirefox = /firefox/i.test(navigator.userAgent);
} catch {
}
var layoutClassName = "react-grid-layout";
function useGridLayoutDrop(opts) {
  const {
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
    dropConfigOnDragOver,
    onDropDragOverProp,
    onDropProp,
    onLayoutMutation,
    setDroppingDOMNode,
    setDroppingPosition,
    setActiveDrag
  } = opts;
  const dragEnterCounterRef = React3__default.default.useRef(0);
  const removeDroppingPlaceholder = React3.useCallback(() => {
    const currentLayout = layoutRef.current;
    const hasDroppingItem = currentLayout.some((l) => l.i === droppingItem.i);
    if (!hasDroppingItem) {
      setDroppingDOMNode(null);
      setActiveDrag(null);
      setDroppingPosition(void 0);
      return;
    }
    const newLayout = compactor.compact(
      currentLayout.filter((l) => l.i !== droppingItem.i),
      cols
    );
    onLayoutMutation(newLayout);
    setDroppingDOMNode(null);
    setActiveDrag(null);
    setDroppingPosition(void 0);
  }, [layoutRef, droppingItem.i, cols, compactor, onLayoutMutation, setDroppingDOMNode, setActiveDrag, setDroppingPosition]);
  const handleDragOver = React3.useCallback(
    (e) => {
      e.preventDefault();
      e.stopPropagation();
      if (isFirefox && !e.nativeEvent.target?.classList.contains(
        layoutClassName
      )) {
        return false;
      }
      const rawResult = dropConfigOnDragOver ? dropConfigOnDragOver(e.nativeEvent) : onDropDragOverProp(e);
      if (rawResult === false) {
        if (droppingDOMNode) {
          removeDroppingPlaceholder();
        }
        return false;
      }
      const {
        dragOffsetX = 0,
        dragOffsetY = 0,
        ...onDragOverResult
      } = rawResult ?? {};
      const finalDroppingItem = { ...droppingItem, ...onDragOverResult };
      const gridRect = e.currentTarget.getBoundingClientRect();
      const positionParams = {
        cols,
        margin,
        maxRows,
        rowHeight,
        containerWidth: width,
        containerPadding: effectiveContainerPadding
      };
      const actualColWidth = chunkQIPLLMCP_js.calcGridColWidth(positionParams);
      const itemPixelWidth = chunkQIPLLMCP_js.calcGridItemWHPx(
        finalDroppingItem.w,
        actualColWidth,
        margin[0]
      );
      const itemPixelHeight = chunkQIPLLMCP_js.calcGridItemWHPx(
        finalDroppingItem.h,
        rowHeight,
        margin[1]
      );
      const itemCenterOffsetX = itemPixelWidth / 2;
      const itemCenterOffsetY = itemPixelHeight / 2;
      const rawGridX = e.clientX - gridRect.left + dragOffsetX - itemCenterOffsetX;
      const rawGridY = e.clientY - gridRect.top + dragOffsetY - itemCenterOffsetY;
      const clampedGridX = Math.max(0, rawGridX);
      const clampedGridY = Math.max(0, rawGridY);
      const newDroppingPosition = {
        left: clampedGridX / transformScale,
        top: clampedGridY / transformScale,
        e: e.nativeEvent
      };
      if (!droppingDOMNode) {
        const calculatedPosition = chunkQIPLLMCP_js.calcXY(
          positionParams,
          clampedGridY,
          clampedGridX,
          finalDroppingItem.w,
          finalDroppingItem.h
        );
        setDroppingDOMNode(/* @__PURE__ */ jsxRuntime.jsx("div", {}, finalDroppingItem.i));
        setDroppingPosition(newDroppingPosition);
        const baseLayout = layoutRef.current.filter(
          (l) => l.i !== finalDroppingItem.i
        );
        onLayoutMutation([
          ...baseLayout,
          {
            ...finalDroppingItem,
            x: calculatedPosition.x,
            y: calculatedPosition.y,
            static: false,
            isDraggable: true
          }
        ]);
      } else if (droppingPosition) {
        const shouldUpdate = droppingPosition.left !== newDroppingPosition.left || droppingPosition.top !== newDroppingPosition.top;
        if (shouldUpdate) {
          setDroppingPosition(newDroppingPosition);
        }
      }
    },
    [
      droppingDOMNode,
      droppingPosition,
      droppingItem,
      dropConfigOnDragOver,
      onDropDragOverProp,
      removeDroppingPlaceholder,
      transformScale,
      cols,
      margin,
      maxRows,
      rowHeight,
      width,
      effectiveContainerPadding,
      layoutRef,
      onLayoutMutation,
      setDroppingDOMNode,
      setDroppingPosition
    ]
  );
  const handleDragLeave = React3.useCallback(
    (e) => {
      e.preventDefault();
      e.stopPropagation();
      dragEnterCounterRef.current--;
      if (dragEnterCounterRef.current < 0) {
        dragEnterCounterRef.current = 0;
      }
      if (dragEnterCounterRef.current === 0) {
        removeDroppingPlaceholder();
      }
    },
    [removeDroppingPlaceholder]
  );
  const handleDragEnter = React3.useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    dragEnterCounterRef.current++;
  }, []);
  const handleDrop = React3.useCallback(
    (e) => {
      e.preventDefault();
      e.stopPropagation();
      const currentLayout = layoutRef.current;
      const item = currentLayout.find((l) => l.i === droppingItem.i);
      dragEnterCounterRef.current = 0;
      removeDroppingPlaceholder();
      onDropProp(currentLayout, item, e.nativeEvent);
    },
    [layoutRef, droppingItem.i, removeDroppingPlaceholder, onDropProp]
  );
  return {
    removeDroppingPlaceholder,
    handleDragOver,
    handleDragLeave,
    handleDragEnter,
    handleDrop,
    dragEnterCounterRef
  };
}
var noop = () => {
};
var layoutClassName2 = "react-grid-layout";
function synchronizeLayoutWithChildren(initialLayout, children, cols, compactor) {
  const layout = [];
  React3__default.default.Children.forEach(children, (child) => {
    if (!React3__default.default.isValidElement(child) || child.key === null) return;
    const key = String(child.key);
    const existingItem = initialLayout.find((l) => l.i === key);
    if (existingItem) {
      layout.push(chunkQIPLLMCP_js.cloneLayoutItem(existingItem));
    } else {
      const childProps = child.props;
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
          y: chunkQIPLLMCP_js.bottom(layout),
          w: 1,
          h: 1
        });
      }
    }
  });
  const corrected = chunkQIPLLMCP_js.correctBounds(layout, { cols });
  return compactor.compact(corrected, cols);
}
function GridLayout(props) {
  const {
    // Required
    children,
    width,
    // Composable config interfaces
    gridConfig: gridConfigProp,
    dragConfig: dragConfigProp,
    resizeConfig: resizeConfigProp,
    dropConfig: dropConfigProp,
    positionStrategy = chunkQIPLLMCP_js.defaultPositionStrategy,
    compactor: compactorProp,
    constraints = chunkQIPLLMCP_js.defaultConstraints,
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
  const gridConfig = React3.useMemo(
    () => ({ ...chunkQIPLLMCP_js.defaultGridConfig, ...gridConfigProp }),
    [gridConfigProp]
  );
  const dragConfig = React3.useMemo(
    () => ({ ...chunkQIPLLMCP_js.defaultDragConfig, ...dragConfigProp }),
    [dragConfigProp]
  );
  const resizeConfig = React3.useMemo(
    () => ({ ...chunkQIPLLMCP_js.defaultResizeConfig, ...resizeConfigProp }),
    [resizeConfigProp]
  );
  const dropConfig = React3.useMemo(
    () => ({ ...chunkQIPLLMCP_js.defaultDropConfig, ...dropConfigProp }),
    [dropConfigProp]
  );
  const { cols, rowHeight, maxRows, margin, containerPadding } = gridConfig;
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
  const compactor = compactorProp ?? chunkQIPLLMCP_js.getCompactor("vertical");
  const compactType = compactor.type;
  const allowOverlap = compactor.allowOverlap;
  const preventCollision = compactor.preventCollision ?? false;
  const droppingItem = React3.useMemo(
    () => droppingItemProp ?? {
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
  const layout = React3.useMemo(
    () => synchronizeLayoutWithChildren(propsLayout, children, cols, compactor),
    [propsLayout, children, cols, compactor]
  );
  const layoutRef = React3.useRef(layout);
  layoutRef.current = layout;
  const containerNodeRef = React3.useRef(null);
  const setContainerRef = React3.useCallback((node) => {
    containerNodeRef.current = node;
    if (typeof innerRef === "function") {
      innerRef(node);
    } else if (innerRef && typeof innerRef === "object") {
      innerRef.current = node;
    }
  }, [innerRef]);
  const [mounted, setMounted] = React3.useState(false);
  const [activeDrag, setActiveDrag] = React3.useState(null);
  const [resizing, setResizing] = React3.useState(false);
  const [droppingDOMNode, setDroppingDOMNode] = React3.useState(null);
  const [droppingPosition, setDroppingPosition] = React3.useState();
  const oldDragItemRef = React3.useRef(null);
  const oldResizeItemRef = React3.useRef(null);
  const oldLayoutRef = React3.useRef(null);
  React3.useEffect(() => {
    setMounted(true);
    onLayoutChange(layout);
  }, []);
  const handleLayoutMutation = React3.useCallback((newLayout) => {
    onLayoutChange(newLayout);
  }, [onLayoutChange]);
  const containerHeight = React3.useMemo(() => {
    if (!autoSize) return void 0;
    const nbRow = chunkQIPLLMCP_js.bottom(layout);
    const containerPaddingY = effectiveContainerPadding[1];
    return nbRow * rowHeight + (nbRow - 1) * margin[1] + containerPaddingY * 2 + "px";
  }, [autoSize, layout, rowHeight, margin, effectiveContainerPadding]);
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
    collisionResolver,
    onLayoutMutation: handleLayoutMutation,
    setActiveDrag,
    onDragStartProp,
    onDragProp,
    onDragStopProp,
    onLayoutChange
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
    onLayoutChange
  });
  const {
    handleDragOver,
    handleDragLeave,
    handleDragEnter,
    handleDrop
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
    dropConfigOnDragOver,
    onDropDragOverProp,
    onDropProp,
    onLayoutMutation: handleLayoutMutation,
    setDroppingDOMNode,
    setDroppingPosition,
    setActiveDrag
  });
  const processGridItem = React3.useCallback(
    (child, isDroppingItem) => {
      if (!child || !child.key) return null;
      const l = chunkQIPLLMCP_js.getLayoutItem(layout, String(child.key));
      if (!l) return null;
      const draggable = typeof l.isDraggable === "boolean" ? l.isDraggable : !l.static && isDraggable;
      const resizable = typeof l.isResizable === "boolean" ? l.isResizable : !l.static && isResizable;
      const resizeHandlesOptions = l.resizeHandles || [...resizeHandles];
      const bounded = draggable && isBounded && l.isBounded !== false;
      const resizeHandleElement = resizeHandle;
      return /* @__PURE__ */ jsxRuntime.jsx(
        GridItem,
        {
          containerWidth: width,
          cols,
          margin,
          containerPadding: effectiveContainerPadding,
          maxRows,
          rowHeight,
          cancel: draggableCancel,
          handle: draggableHandle,
          onDragStart,
          onDrag,
          onDragStop,
          onResizeStart,
          onResize,
          onResizeStop,
          isDraggable: draggable,
          isResizable: resizable,
          isBounded: bounded,
          useCSSTransforms: useCSSTransforms && mounted,
          usePercentages: !mounted,
          transformScale,
          positionStrategy,
          dragThreshold,
          ghostDrag,
          gridContainerRef: containerNodeRef,
          w: l.w,
          h: l.h,
          x: l.x,
          y: l.y,
          i: l.i,
          minH: l.minH,
          minW: l.minW,
          maxH: l.maxH,
          maxW: l.maxW,
          static: l.static,
          droppingPosition: isDroppingItem ? droppingPosition : void 0,
          resizeHandles: resizeHandlesOptions,
          resizeHandle: resizeHandleElement,
          constraints,
          layoutItem: l,
          layout,
          children: child
        },
        l.i
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
      ghostDrag
    ]
  );
  const renderPlaceholder = () => {
    if (!activeDrag) return null;
    return /* @__PURE__ */ jsxRuntime.jsx(
      GridItem,
      {
        w: activeDrag.w,
        h: activeDrag.h,
        x: activeDrag.x,
        y: activeDrag.y,
        i: activeDrag.i,
        className: `react-grid-placeholder ${resizing ? "placeholder-resizing" : ""}`,
        containerWidth: width,
        cols,
        margin,
        containerPadding: effectiveContainerPadding,
        maxRows,
        rowHeight,
        isDraggable: false,
        isResizable: false,
        isBounded: false,
        useCSSTransforms,
        transformScale,
        constraints,
        layout,
        children: /* @__PURE__ */ jsxRuntime.jsx("div", {})
      }
    );
  };
  const mergedClassName = clsx__default.default(layoutClassName2, className, {
    "react-grid-layout--ghost-active": ghostDrag && activeDrag != null
  });
  const mergedStyle = {
    height: containerHeight,
    ...style
  };
  return /* @__PURE__ */ jsxRuntime.jsxs(
    "div",
    {
      ref: setContainerRef,
      className: mergedClassName,
      style: mergedStyle,
      onDrop: isDroppable ? handleDrop : void 0,
      onDragLeave: isDroppable ? handleDragLeave : void 0,
      onDragEnter: isDroppable ? handleDragEnter : void 0,
      onDragOver: isDroppable ? handleDragOver : void 0,
      children: [
        React3__default.default.Children.map(children, (child) => {
          if (!React3__default.default.isValidElement(child)) return null;
          return processGridItem(child);
        }),
        isDroppable && droppingDOMNode && processGridItem(droppingDOMNode, true),
        renderPlaceholder()
      ]
    }
  );
}
var DEFAULT_BREAKPOINTS = {
  lg: 1200,
  md: 996,
  sm: 768,
  xs: 480,
  xxs: 0
};
var DEFAULT_COLS = {
  lg: 12,
  md: 10,
  sm: 6,
  xs: 4,
  xxs: 2
};
var noop2 = () => {
};
function synchronizeLayoutWithChildren2(initialLayout, children, cols, compactor) {
  const layout = [];
  React3__default.default.Children.forEach(children, (child) => {
    if (!React3__default.default.isValidElement(child) || child.key === null) return;
    const key = String(child.key);
    const existingItem = initialLayout.find((l) => l.i === key);
    if (existingItem) {
      layout.push({
        ...existingItem,
        i: key
      });
    } else {
      const childProps = child.props;
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
          y: chunkQIPLLMCP_js.bottom(layout),
          w: 1,
          h: 1
        });
      }
    }
  });
  const corrected = chunkQIPLLMCP_js.correctBounds(layout, { cols });
  return compactor.compact(corrected, cols);
}
function ResponsiveGridLayout(props) {
  const {
    children,
    width,
    breakpoint: propBreakpoint,
    breakpoints = DEFAULT_BREAKPOINTS,
    cols: colsConfig = DEFAULT_COLS,
    layouts: propsLayouts = {},
    rowHeight = 150,
    maxRows = Infinity,
    margin: propMargin = [10, 10],
    containerPadding: propContainerPadding = null,
    compactor: compactorProp,
    onBreakpointChange = noop2,
    onLayoutChange = noop2,
    onWidthChange = noop2,
    ...restProps
  } = props;
  const compactor = compactorProp ?? chunkQIPLLMCP_js.getCompactor("vertical");
  const compactType = compactor.type;
  const allowOverlap = compactor.allowOverlap;
  const initialBreakpoint = React3.useMemo(() => {
    return propBreakpoint ?? chunkQIPLLMCP_js.getBreakpointFromWidth(breakpoints, width);
  }, []);
  const initialCols = React3.useMemo(() => {
    return chunkQIPLLMCP_js.getColsFromBreakpoint(initialBreakpoint, colsConfig);
  }, [initialBreakpoint, colsConfig]);
  const initialLayout = React3.useMemo(() => {
    return chunkQIPLLMCP_js.findOrGenerateResponsiveLayout(
      propsLayouts,
      breakpoints,
      initialBreakpoint,
      initialBreakpoint,
      initialCols,
      compactType
    );
  }, []);
  const [breakpoint, setBreakpoint] = React3.useState(initialBreakpoint);
  const [cols, setCols] = React3.useState(initialCols);
  const [layout, setLayout] = React3.useState(initialLayout);
  const [layouts, setLayouts] = React3.useState(propsLayouts);
  const prevWidthRef = React3.useRef(width);
  const prevBreakpointRef = React3.useRef(propBreakpoint);
  const prevBreakpointsRef = React3.useRef(breakpoints);
  const prevColsRef = React3.useRef(colsConfig);
  const prevLayoutsRef = React3.useRef(propsLayouts);
  const prevCompactTypeRef = React3.useRef(compactType);
  const layoutsRef = React3.useRef(layouts);
  React3.useEffect(() => {
    layoutsRef.current = layouts;
  }, [layouts]);
  const derivedLayout = React3.useMemo(() => {
    if (!fastEquals.deepEqual(propsLayouts, prevLayoutsRef.current)) {
      return chunkQIPLLMCP_js.findOrGenerateResponsiveLayout(
        propsLayouts,
        breakpoints,
        breakpoint,
        breakpoint,
        cols,
        compactor
      );
    }
    return null;
  }, [propsLayouts, breakpoints, breakpoint, cols, compactor]);
  const effectiveLayout = derivedLayout ?? layout;
  React3.useEffect(() => {
    if (derivedLayout !== null) {
      setLayout(derivedLayout);
      setLayouts(propsLayouts);
      layoutsRef.current = propsLayouts;
      prevLayoutsRef.current = propsLayouts;
    }
  }, [derivedLayout, propsLayouts]);
  React3.useEffect(() => {
    if (compactType !== prevCompactTypeRef.current) {
      const newLayout = compactor.compact(chunkQIPLLMCP_js.cloneLayout(effectiveLayout), cols);
      const newLayouts = {
        ...layoutsRef.current,
        [breakpoint]: newLayout
      };
      setLayout(newLayout);
      setLayouts(newLayouts);
      layoutsRef.current = newLayouts;
      onLayoutChange(newLayout, newLayouts);
      prevCompactTypeRef.current = compactType;
    }
  }, [
    compactType,
    compactor,
    effectiveLayout,
    cols,
    allowOverlap,
    breakpoint,
    onLayoutChange
  ]);
  React3.useEffect(() => {
    const widthChanged = width !== prevWidthRef.current;
    const breakpointPropChanged = propBreakpoint !== prevBreakpointRef.current;
    const breakpointsChanged = !fastEquals.deepEqual(
      breakpoints,
      prevBreakpointsRef.current
    );
    const colsChanged = !fastEquals.deepEqual(colsConfig, prevColsRef.current);
    if (widthChanged || breakpointPropChanged || breakpointsChanged || colsChanged) {
      const newBreakpoint = propBreakpoint ?? chunkQIPLLMCP_js.getBreakpointFromWidth(breakpoints, width);
      const newCols = chunkQIPLLMCP_js.getColsFromBreakpoint(newBreakpoint, colsConfig);
      const lastBreakpoint = breakpoint;
      if (lastBreakpoint !== newBreakpoint || breakpointsChanged || colsChanged) {
        const newLayouts = { ...layoutsRef.current };
        if (!newLayouts[lastBreakpoint]) {
          newLayouts[lastBreakpoint] = chunkQIPLLMCP_js.cloneLayout(layout);
        }
        let newLayout = chunkQIPLLMCP_js.findOrGenerateResponsiveLayout(
          newLayouts,
          breakpoints,
          newBreakpoint,
          lastBreakpoint,
          newCols,
          compactor
        );
        newLayout = synchronizeLayoutWithChildren2(
          newLayout,
          children,
          newCols,
          compactor
        );
        newLayouts[newBreakpoint] = newLayout;
        setBreakpoint(newBreakpoint);
        setCols(newCols);
        setLayout(newLayout);
        setLayouts(newLayouts);
        layoutsRef.current = newLayouts;
        onBreakpointChange(newBreakpoint, newCols);
        onLayoutChange(newLayout, newLayouts);
      }
      const currentMargin2 = chunkQIPLLMCP_js.getIndentationValue(
        propMargin,
        newBreakpoint
      );
      const currentPadding = propContainerPadding ? chunkQIPLLMCP_js.getIndentationValue(
        propContainerPadding,
        newBreakpoint
      ) : null;
      onWidthChange(width, currentMargin2, newCols, currentPadding);
      prevWidthRef.current = width;
      prevBreakpointRef.current = propBreakpoint;
      prevBreakpointsRef.current = breakpoints;
      prevColsRef.current = colsConfig;
    }
  }, [
    width,
    propBreakpoint,
    breakpoints,
    colsConfig,
    breakpoint,
    cols,
    layout,
    children,
    compactor,
    compactType,
    allowOverlap,
    propMargin,
    propContainerPadding,
    onBreakpointChange,
    onLayoutChange,
    onWidthChange
  ]);
  const handleLayoutChange = React3.useCallback(
    (newLayout) => {
      const currentLayouts = layoutsRef.current;
      const newLayouts = {
        ...currentLayouts,
        [breakpoint]: newLayout
      };
      setLayout(newLayout);
      setLayouts(newLayouts);
      layoutsRef.current = newLayouts;
      onLayoutChange(newLayout, newLayouts);
    },
    [breakpoint, onLayoutChange]
  );
  const currentMargin = React3.useMemo(() => {
    return chunkQIPLLMCP_js.getIndentationValue(
      propMargin,
      breakpoint
    );
  }, [propMargin, breakpoint]);
  const currentContainerPadding = React3.useMemo(() => {
    if (propContainerPadding === null) return null;
    return chunkQIPLLMCP_js.getIndentationValue(
      propContainerPadding,
      breakpoint
    );
  }, [propContainerPadding, breakpoint]);
  const gridConfig = React3.useMemo(
    () => ({
      cols,
      rowHeight,
      maxRows,
      margin: currentMargin,
      containerPadding: currentContainerPadding
    }),
    [cols, rowHeight, maxRows, currentMargin, currentContainerPadding]
  );
  return /* @__PURE__ */ jsxRuntime.jsx(
    GridLayout,
    {
      ...restProps,
      width,
      gridConfig,
      compactor,
      onLayoutChange: handleLayoutChange,
      layout: effectiveLayout,
      children
    }
  );
}

exports.GridItem = GridItem;
exports.GridLayout = GridLayout;
exports.ResponsiveGridLayout = ResponsiveGridLayout;
