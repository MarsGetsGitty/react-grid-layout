import { pcdCollisionResolver, resolveResizeCollisions, calcGridCellDimensions } from './chunk-7RNEYZX2.mjs';
import { jsx } from 'react/jsx-runtime';
import { useState, useRef, useEffect, useCallback, useMemo } from 'react';

function GutterHandle({
  type,
  left,
  top,
  width,
  height,
  isActive,
  onMouseDown
}) {
  const className = [
    "gutter-handle",
    `gutter-handle--${type}`,
    isActive && "gutter-handle--active"
  ].filter(Boolean).join(" ");
  return /* @__PURE__ */ jsx(
    "div",
    {
      className,
      style: {
        position: "absolute",
        left,
        top,
        width,
        height
      },
      onMouseDown
    }
  );
}
function useGridArrangement({ layout, maxRows, cols, onLayoutChange }) {
  const [isRglInteracting, setIsRglInteracting] = useState(false);
  const isRglInteractingRef = useRef(false);
  const layoutRef = useRef(layout);
  const dragSlotRef = useRef(null);
  const onLayoutChangeRef = useRef(onLayoutChange);
  useEffect(() => {
    layoutRef.current = layout;
  }, [layout]);
  useEffect(() => {
    onLayoutChangeRef.current = onLayoutChange;
  }, [onLayoutChange]);
  const handleLayoutChange = useCallback((newLayout) => {
    onLayoutChangeRef.current?.(newLayout);
  }, []);
  const collisionResolver = useCallback(
    (tentativeLayout, movedItem, originalPosition, context) => {
      const activeSlot = dragSlotRef.current || originalPosition;
      const enrichedContext = context ? { ...context, maxRows } : context;
      const resolved = pcdCollisionResolver(
        tentativeLayout,
        movedItem,
        activeSlot,
        enrichedContext
      );
      if (resolved) {
        dragSlotRef.current = { x: movedItem.x, y: movedItem.y };
      }
      return resolved;
    },
    [maxRows]
  );
  const handleDragStart = useCallback(
    (_newLayout, oldItem) => {
      isRglInteractingRef.current = true;
      setIsRglInteracting(true);
      if (oldItem) {
        dragSlotRef.current = { x: oldItem.x, y: oldItem.y };
      }
    },
    []
  );
  const handleDrag = useCallback(
    (_newLayout, _oldItem, _newItem) => {
    },
    []
  );
  const handleDragStop = useCallback(
    (_newLayout, _oldItem, _newItem) => {
      isRglInteractingRef.current = false;
      setIsRglInteracting(false);
      dragSlotRef.current = null;
    },
    []
  );
  const handleResizeStart = useCallback(() => {
    isRglInteractingRef.current = true;
    setIsRglInteracting(true);
  }, []);
  const handleResize = useCallback(
    (newLayout, oldItem, newItem) => {
      if (!oldItem || !newItem) {
        onLayoutChangeRef.current?.(newLayout);
        return;
      }
      const resolved = resolveResizeCollisions(
        newLayout,
        newItem.i,
        oldItem,
        newItem,
        maxRows,
        cols
      );
      if (resolved) {
        onLayoutChangeRef.current?.(resolved);
      }
    },
    [maxRows, cols]
  );
  const handleResizeStop = useCallback(
    (newLayout, oldItem, newItem) => {
      isRglInteractingRef.current = false;
      setIsRglInteracting(false);
      if (!oldItem || !newItem) {
        onLayoutChangeRef.current?.(newLayout);
        return;
      }
      const resolved = resolveResizeCollisions(
        newLayout,
        newItem.i,
        oldItem,
        newItem,
        maxRows,
        cols
      );
      onLayoutChangeRef.current?.(resolved ?? newLayout);
    },
    [maxRows, cols]
  );
  return {
    isRglInteracting,
    collisionResolver,
    handlers: {
      onLayoutChange: handleLayoutChange,
      onDragStart: handleDragStart,
      onDrag: handleDrag,
      onDragStop: handleDragStop,
      onResizeStart: handleResizeStart,
      onResize: handleResize,
      onResizeStop: handleResizeStop
    }
  };
}
function strictOverlap(l1, l2) {
  if (l1.i === l2.i) return false;
  if (l1.x + l1.w <= l2.x) return false;
  if (l1.x >= l2.x + l2.w) return false;
  if (l1.y + l1.h <= l2.y) return false;
  if (l1.y >= l2.y + l2.h) return false;
  return true;
}
function findAdjacentPairs(layout) {
  const pairs = [];
  for (let i = 0; i < layout.length; i++) {
    for (let j = i + 1; j < layout.length; j++) {
      const li = layout[i];
      const lj = layout[j];
      if (li.x + li.w === lj.x) {
        const overlapStart = Math.max(li.y, lj.y);
        const overlapEnd = Math.min(li.y + li.h, lj.y + lj.h);
        if (overlapEnd > overlapStart) {
          pairs.push({ type: "horizontal", a: li, b: lj, overlapStart, overlapEnd });
        }
      } else if (lj.x + lj.w === li.x) {
        const overlapStart = Math.max(li.y, lj.y);
        const overlapEnd = Math.min(li.y + li.h, lj.y + lj.h);
        if (overlapEnd > overlapStart) {
          pairs.push({ type: "horizontal", a: lj, b: li, overlapStart, overlapEnd });
        }
      }
      if (li.y + li.h === lj.y) {
        const overlapStart = Math.max(li.x, lj.x);
        const overlapEnd = Math.min(li.x + li.w, lj.x + lj.w);
        if (overlapEnd > overlapStart) {
          pairs.push({ type: "vertical", a: li, b: lj, overlapStart, overlapEnd });
        }
      } else if (lj.y + lj.h === li.y) {
        const overlapStart = Math.max(li.x, lj.x);
        const overlapEnd = Math.min(li.x + li.w, lj.x + lj.w);
        if (overlapEnd > overlapStart) {
          pairs.push({ type: "vertical", a: lj, b: li, overlapStart, overlapEnd });
        }
      }
    }
  }
  return pairs;
}
function calcGutterPixelPos(pair, dims) {
  const { cellWidth, cellHeight, offsetX, offsetY, gapX, gapY } = dims;
  if (pair.type === "horizontal") {
    const left2 = offsetX + pair.b.x * (cellWidth + gapX) - gapX;
    const top2 = offsetY + pair.overlapStart * (cellHeight + gapY);
    const width2 = gapX;
    const height2 = (cellHeight + gapY) * (pair.overlapEnd - pair.overlapStart) - gapY;
    return { left: left2, top: top2, width: width2, height: height2 };
  }
  const left = offsetX + pair.overlapStart * (cellWidth + gapX);
  const top = offsetY + pair.b.y * (cellHeight + gapY) - gapY;
  const width = (cellWidth + gapX) * (pair.overlapEnd - pair.overlapStart) - gapX;
  const height = gapY;
  return { left, top, width, height };
}
function useGutterHandles(layout, onGutterResize, containerWidth, gridConfig, isRglInteracting, isEditMode = true) {
  const [activeGutter, setActiveGutter] = useState(null);
  const dragStartRef = useRef(null);
  const onGutterResizeRef = useRef(onGutterResize);
  useEffect(() => {
    onGutterResizeRef.current = onGutterResize;
  }, [onGutterResize]);
  const layoutRef = useRef(layout);
  useEffect(() => {
    layoutRef.current = layout;
  }, [layout]);
  const dims = useMemo(
    () => calcGridCellDimensions({
      width: containerWidth,
      cols: gridConfig.cols,
      rowHeight: gridConfig.rowHeight,
      margin: gridConfig.margin
    }),
    [containerWidth, gridConfig.cols, gridConfig.rowHeight, gridConfig.margin]
  );
  const pairs = useMemo(() => findAdjacentPairs(layout), [layout]);
  const gutterPositions = useMemo(
    () => pairs.map((pair) => calcGutterPixelPos(pair, dims)),
    [pairs, dims]
  );
  const handleMouseMove = useCallback((e) => {
    const drag = dragStartRef.current;
    if (!drag) return;
    const pixelDelta = drag.pair.type === "horizontal" ? e.clientX - drag.clientStart : e.clientY - drag.clientStart;
    const rawGridDelta = Math.round(pixelDelta / drag.cellStep);
    if (rawGridDelta === drag.appliedDelta) return;
    const pair = drag.pair;
    const isH = pair.type === "horizontal";
    const seamPos = isH ? pair.a.x + pair.a.w : pair.a.y + pair.a.h;
    const currentPairs = findAdjacentPairs(layoutRef.current);
    const seamPairs = currentPairs.filter(
      (p) => p.type === pair.type && (isH ? p.a.x + p.a.w === seamPos : p.a.y + p.a.h === seamPos)
    );
    const connectedPairs = [pair];
    let added = true;
    while (added) {
      added = false;
      for (const sp of seamPairs) {
        if (!connectedPairs.includes(sp)) {
          const touches = connectedPairs.some(
            (cp) => sp.overlapStart <= cp.overlapEnd && sp.overlapEnd >= cp.overlapStart
          );
          if (touches) {
            connectedPairs.push(sp);
            added = true;
          }
        }
      }
    }
    let minD = -Infinity;
    let maxD = Infinity;
    for (const cp of connectedPairs) {
      const aCurrent = isH ? cp.a.w : cp.a.h;
      const aMin = isH ? cp.a.minW ?? 1 : cp.a.minH ?? 1;
      const aMax = isH ? cp.a.maxW ?? gridConfig.cols : cp.a.maxH ?? Infinity;
      const bCurrent = isH ? cp.b.w : cp.b.h;
      const bMin = isH ? cp.b.minW ?? 1 : cp.b.minH ?? 1;
      const bMax = isH ? cp.b.maxW ?? gridConfig.cols : cp.b.maxH ?? Infinity;
      const pMax = Math.min(aMax - aCurrent, bCurrent - bMin);
      const pMin = -Math.min(aCurrent - aMin, bMax - bCurrent);
      if (pMax < maxD) maxD = pMax;
      if (pMin > minD) minD = pMin;
    }
    const clampedDelta = Math.max(minD, Math.min(maxD, rawGridDelta));
    if (clampedDelta === drag.appliedDelta) return;
    const prev = layoutRef.current;
    const incrementalDelta = clampedDelta - drag.appliedDelta;
    if (incrementalDelta === 0) return;
    const nextLayout = [...prev];
    const modifiedIds = /* @__PURE__ */ new Set();
    for (const cp of connectedPairs) {
      const idxA = nextLayout.findIndex((l) => l.i === cp.a.i);
      const idxB = nextLayout.findIndex((l) => l.i === cp.b.i);
      if (idxA === -1 || idxB === -1) continue;
      if (!modifiedIds.has(cp.a.i)) {
        const ca = nextLayout[idxA];
        nextLayout[idxA] = isH ? { ...ca, w: ca.w + incrementalDelta } : { ...ca, h: ca.h + incrementalDelta };
        modifiedIds.add(cp.a.i);
      }
      if (!modifiedIds.has(cp.b.i)) {
        const cb = nextLayout[idxB];
        nextLayout[idxB] = isH ? { ...cb, x: cb.x + incrementalDelta, w: cb.w - incrementalDelta } : { ...cb, y: cb.y + incrementalDelta, h: cb.h - incrementalDelta };
        modifiedIds.add(cp.b.i);
      }
    }
    for (const id of modifiedIds) {
      const item = nextLayout.find((l) => l.i === id);
      if (item.w < (item.minW ?? 1) || item.h < (item.minH ?? 1)) return;
    }
    const unmodified = nextLayout.filter((l) => !modifiedIds.has(l.i));
    const modified = nextLayout.filter((l) => modifiedIds.has(l.i));
    for (const mod of modified) {
      if (unmodified.some((u) => strictOverlap(mod, u))) {
        console.log("[GUTTER] Multi-widget collision detected, blocking layout update");
        return;
      }
    }
    drag.appliedDelta = clampedDelta;
    onGutterResizeRef.current(nextLayout);
  }, [gridConfig.cols]);
  const handleMouseUp = useCallback(() => {
    dragStartRef.current = null;
    setActiveGutter(null);
    document.body.style.cursor = "";
    document.body.classList.remove("gutter-dragging");
    document.removeEventListener("mousemove", handleMouseMove);
    document.removeEventListener("mouseup", handleMouseUp);
  }, [handleMouseMove]);
  const handleMouseDown = useCallback((pair, e) => {
    e.preventDefault();
    e.stopPropagation();
    const cellStep = pair.type === "horizontal" ? dims.cellWidth + dims.gapX : dims.cellHeight + dims.gapY;
    dragStartRef.current = {
      clientStart: pair.type === "horizontal" ? e.clientX : e.clientY,
      pair,
      cellStep,
      appliedDelta: 0
    };
    setActiveGutter(`${pair.a.i}-${pair.b.i}-${pair.type}`);
    document.body.style.cursor = pair.type === "horizontal" ? "col-resize" : "row-resize";
    document.body.classList.add("gutter-dragging");
    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);
  }, [dims, handleMouseMove, handleMouseUp]);
  const gutterElements = useMemo(() => {
    if (isRglInteracting || !isEditMode) return null;
    return pairs.map((pair, idx) => {
      const pos = gutterPositions[idx];
      if (!pos) return null;
      const key = `${pair.a.i}-${pair.b.i}-${pair.type}`;
      const isActive = activeGutter === key;
      return /* @__PURE__ */ jsx(
        GutterHandle,
        {
          type: pair.type,
          left: pos.left,
          top: pos.top,
          width: pos.width,
          height: pos.height,
          isActive,
          onMouseDown: (e) => handleMouseDown(pair, e)
        },
        key
      );
    });
  }, [pairs, gutterPositions, isRglInteracting, activeGutter, handleMouseDown]);
  return {
    gutterElements,
    isDraggingGutter: activeGutter !== null
  };
}

export { GutterHandle, useGridArrangement, useGutterHandles };
