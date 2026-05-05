import { calcGridCellDimensions, cloneLayout, pcdCollisionResolver, resolveResizeCollisions, cloneLayoutItem } from './chunk-73AP6TWJ.mjs';
export { pcdCollisionResolver } from './chunk-73AP6TWJ.mjs';
import { useMemo, useState, useRef, useEffect, useCallback } from 'react';
import { jsx } from 'react/jsx-runtime';

function GridBackground({
  width,
  cols,
  rowHeight,
  margin = [10, 10],
  containerPadding,
  rows = 10,
  height,
  color = "#e0e0e0",
  borderRadius = 4,
  className,
  style
}) {
  const dims = useMemo(
    () => calcGridCellDimensions({
      width,
      cols,
      rowHeight,
      margin,
      containerPadding
    }),
    [width, cols, rowHeight, margin, containerPadding]
  );
  const rowCount = useMemo(() => {
    if (rows !== "auto") return rows;
    if (height) {
      const padding = containerPadding ?? margin;
      return Math.ceil(
        (height - padding[1] * 2 + margin[1]) / (rowHeight + margin[1])
      );
    }
    return 10;
  }, [rows, height, rowHeight, margin, containerPadding]);
  const totalHeight = useMemo(() => {
    const padding = containerPadding ?? margin;
    return padding[1] * 2 + rowCount * rowHeight + (rowCount - 1) * margin[1];
  }, [rowCount, rowHeight, margin, containerPadding]);
  const cells = useMemo(() => {
    const rects = [];
    const { cellWidth, cellHeight, offsetX, offsetY, gapX, gapY } = dims;
    for (let row = 0; row < rowCount; row++) {
      for (let col = 0; col < cols; col++) {
        const x = offsetX + col * (cellWidth + gapX);
        const y = offsetY + row * (cellHeight + gapY);
        rects.push(
          /* @__PURE__ */ jsx(
            "rect",
            {
              x,
              y,
              width: cellWidth,
              height: cellHeight,
              rx: borderRadius,
              ry: borderRadius,
              fill: color
            },
            `${row}-${col}`
          )
        );
      }
    }
    return rects;
  }, [dims, rowCount, cols, borderRadius, color]);
  return /* @__PURE__ */ jsx(
    "svg",
    {
      className,
      style: {
        position: "absolute",
        top: 0,
        left: 0,
        width,
        height: totalHeight,
        pointerEvents: "none",
        ...style
      },
      "aria-hidden": "true",
      children: cells
    }
  );
}

// src/extras/fastVerticalCompactor.ts
function collides(l1, l2) {
  if (l1.i === l2.i) return false;
  return l1.x < l2.x + l2.w && l1.x + l1.w > l2.x && l1.y < l2.y + l2.h && l1.y + l1.h > l2.y;
}
function compactVerticalFast(layout, cols, allowOverlap) {
  const numItems = layout.length;
  layout.sort((a, b) => {
    if (a.y < b.y) return -1;
    if (a.y > b.y) return 1;
    if (a.x < b.x) return -1;
    if (a.x > b.x) return 1;
    if (a.static && !b.static) return -1;
    if (!a.static && b.static) return 1;
    return 0;
  });
  const tide = new Array(cols).fill(0);
  const staticItems = layout.filter((item) => item.static);
  const numStatics = staticItems.length;
  let staticOffset = 0;
  for (let i = 0; i < numItems; i++) {
    const item = layout[i];
    let x2 = item.x + item.w;
    if (x2 > cols) {
      x2 = cols;
    }
    if (item.static) {
      ++staticOffset;
    } else {
      let minGap = Infinity;
      for (let x = item.x; x < x2; ++x) {
        const tideValue = tide[x] ?? 0;
        const gap = item.y - tideValue;
        if (gap < minGap) {
          minGap = gap;
        }
      }
      if (!allowOverlap || minGap > 0) {
        item.y -= minGap;
      }
      for (let j = staticOffset; !allowOverlap && j < numStatics; ++j) {
        const staticItem = staticItems[j];
        if (staticItem === void 0) continue;
        if (staticItem.y >= item.y + item.h) {
          break;
        }
        if (collides(item, staticItem)) {
          item.y = staticItem.y + staticItem.h;
          if (j > staticOffset) {
            j = staticOffset;
          }
        }
      }
      item.moved = false;
    }
    const t = item.y + item.h;
    for (let x = item.x; x < x2; ++x) {
      const currentTide = tide[x] ?? 0;
      if (currentTide < t) {
        tide[x] = t;
      }
    }
  }
}
var fastVerticalCompactor = {
  type: "vertical",
  allowOverlap: false,
  compact(layout, cols) {
    const out = cloneLayout(layout);
    compactVerticalFast(out, cols, false);
    return out;
  }
};
var fastVerticalOverlapCompactor = {
  ...fastVerticalCompactor,
  allowOverlap: true,
  compact(layout, cols) {
    const out = cloneLayout(layout);
    compactVerticalFast(out, cols, true);
    return out;
  }
};

// src/extras/fastHorizontalCompactor.ts
function ensureTideRows(tide, neededRows) {
  while (tide.length < neededRows) {
    tide.push(0);
  }
}
function getMaxTideForItem(tide, y, h) {
  let maxTide = 0;
  for (let row = y; row < y + h; row++) {
    const tideValue = tide[row] ?? 0;
    if (tideValue > maxTide) {
      maxTide = tideValue;
    }
  }
  return maxTide;
}
function canPlaceAt(item, x, y, staticItems, cols) {
  if (x + item.w > cols) return false;
  for (const staticItem of staticItems) {
    if (x < staticItem.x + staticItem.w && x + item.w > staticItem.x && y < staticItem.y + staticItem.h && y + item.h > staticItem.y) {
      return false;
    }
  }
  return true;
}
function compactHorizontalFast(layout, cols, allowOverlap) {
  const numItems = layout.length;
  if (numItems === 0) return;
  layout.sort((a, b) => {
    if (a.x !== b.x) return a.x - b.x;
    if (a.y !== b.y) return a.y - b.y;
    if (a.static !== b.static) return a.static ? -1 : 1;
    return 0;
  });
  let maxRow = 0;
  for (let i = 0; i < numItems; i++) {
    const item = layout[i];
    if (item !== void 0) {
      const bottom = item.y + item.h;
      if (bottom > maxRow) maxRow = bottom;
    }
  }
  const tide = new Array(maxRow).fill(0);
  const staticItems = layout.filter((item) => item.static);
  const maxRowLimit = Math.max(1e4, numItems * 100);
  for (let i = 0; i < numItems; i++) {
    const item = layout[i];
    if (item.static) {
      ensureTideRows(tide, item.y + item.h);
      const t2 = item.x + item.w;
      for (let y = item.y; y < item.y + item.h; y++) {
        if ((tide[y] ?? 0) < t2) {
          tide[y] = t2;
        }
      }
      continue;
    }
    let targetY = item.y;
    let targetX = 0;
    let placed = false;
    while (!placed) {
      ensureTideRows(tide, targetY + item.h);
      const maxTide = getMaxTideForItem(tide, targetY, item.h);
      targetX = maxTide;
      if (targetX + item.w <= cols) {
        if (allowOverlap || canPlaceAt(item, targetX, targetY, staticItems, cols)) {
          placed = true;
        } else {
          let maxStaticRight = targetX;
          let foundCollision = false;
          for (const staticItem of staticItems) {
            if (targetX < staticItem.x + staticItem.w && targetX + item.w > staticItem.x && targetY < staticItem.y + staticItem.h && targetY + item.h > staticItem.y) {
              maxStaticRight = Math.max(
                maxStaticRight,
                staticItem.x + staticItem.w
              );
              foundCollision = true;
            }
          }
          if (foundCollision) {
            targetX = maxStaticRight;
          }
          if (foundCollision && targetX + item.w <= cols) {
            if (canPlaceAt(item, targetX, targetY, staticItems, cols)) {
              placed = true;
            } else {
              targetY++;
            }
          } else if (foundCollision) {
            targetY++;
          } else {
            placed = true;
          }
        }
      } else {
        targetY++;
      }
      if (targetY > maxRowLimit) {
        if (typeof console !== "undefined" && console.warn) {
          console.warn(
            `Fast horizontal compactor: Item "${item.i}" exceeded max row limit (${targetY}). This may indicate a layout that cannot be compacted within grid bounds.`
          );
        }
        targetX = 0;
        placed = true;
      }
    }
    item.x = targetX;
    item.y = targetY;
    item.moved = false;
    ensureTideRows(tide, targetY + item.h);
    const t = targetX + item.w;
    for (let y = targetY; y < targetY + item.h; y++) {
      if ((tide[y] ?? 0) < t) {
        tide[y] = t;
      }
    }
  }
}
var fastHorizontalCompactor = {
  type: "horizontal",
  allowOverlap: false,
  compact(layout, cols) {
    const out = cloneLayout(layout);
    compactHorizontalFast(out, cols, false);
    return out;
  }
};
var fastHorizontalOverlapCompactor = {
  ...fastHorizontalCompactor,
  allowOverlap: true,
  compact(layout, cols) {
    const out = cloneLayout(layout);
    compactHorizontalFast(out, cols, true);
    return out;
  }
};

// src/extras/wrapCompactor.ts
function sortByWrapOrder(layout) {
  return [...layout].sort((a, b) => {
    if (a.y !== b.y) return a.y - b.y;
    return a.x - b.x;
  });
}
function fromWrapPosition(pos, cols) {
  return {
    x: pos % cols,
    y: Math.floor(pos / cols)
  };
}
function compactWrap(layout, cols) {
  if (layout.length === 0) return [];
  const sorted = sortByWrapOrder(layout);
  const out = new Array(layout.length);
  const statics = sorted.filter((item) => item.static);
  const staticPositions = /* @__PURE__ */ new Set();
  for (const s of statics) {
    for (let dy = 0; dy < s.h; dy++) {
      for (let dx = 0; dx < s.w; dx++) {
        staticPositions.add((s.y + dy) * cols + (s.x + dx));
      }
    }
  }
  let nextPos = 0;
  for (let i = 0; i < sorted.length; i++) {
    const sortedItem = sorted[i];
    if (sortedItem === void 0) continue;
    const l = cloneLayoutItem(sortedItem);
    if (l.static) {
      const originalIndex2 = layout.indexOf(sortedItem);
      out[originalIndex2] = l;
      l.moved = false;
      continue;
    }
    while (staticPositions.has(nextPos)) {
      nextPos++;
    }
    const { x, y } = fromWrapPosition(nextPos, cols);
    if (x + l.w > cols) {
      nextPos = (y + 1) * cols;
      while (staticPositions.has(nextPos)) {
        nextPos++;
      }
    }
    const newCoords = fromWrapPosition(nextPos, cols);
    l.x = newCoords.x;
    l.y = newCoords.y;
    nextPos += l.w;
    const originalIndex = layout.indexOf(sortedItem);
    out[originalIndex] = l;
    l.moved = false;
  }
  return out;
}
var wrapCompactor = {
  type: "wrap",
  allowOverlap: false,
  compact(layout, cols) {
    return compactWrap(layout, cols);
  }
};
var wrapOverlapCompactor = {
  ...wrapCompactor,
  allowOverlap: true,
  compact(layout, _cols) {
    return cloneLayout(layout);
  }
};
function useGridArrangement({ layout, setLayout, maxRows, cols }) {
  const [isRglInteracting, setIsRglInteracting] = useState(false);
  const isRglInteractingRef = useRef(false);
  const layoutRef = useRef(layout);
  const dragSlotRef = useRef(null);
  useEffect(() => {
    layoutRef.current = layout;
  }, [layout]);
  const handleLayoutChange = useCallback((newLayout) => {
    setLayout(newLayout);
  }, [setLayout]);
  const collisionResolver = useCallback(
    (tentativeLayout, movedItem, originalPosition, context) => {
      const activeSlot = dragSlotRef.current || originalPosition;
      const resolved = pcdCollisionResolver(
        tentativeLayout,
        movedItem,
        activeSlot,
        context
      );
      if (resolved) {
        dragSlotRef.current = { x: movedItem.x, y: movedItem.y };
      }
      return resolved;
    },
    []
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
        setLayout(newLayout);
        return;
      }
      setLayout((prev) => {
        const resolved = resolveResizeCollisions(
          newLayout,
          newItem.i,
          oldItem,
          newItem,
          maxRows,
          cols
        );
        return resolved ?? prev;
      });
    },
    [maxRows, cols, setLayout]
  );
  const handleResizeStop = useCallback(
    (newLayout, oldItem, newItem) => {
      isRglInteractingRef.current = false;
      setIsRglInteracting(false);
      if (!oldItem || !newItem) {
        setLayout(newLayout);
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
      setLayout(resolved ?? newLayout);
    },
    [maxRows, cols, setLayout]
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
function useGutterHandles(layout, setLayout, containerWidth, gridConfig, isRglInteracting) {
  const [activeGutter, setActiveGutter] = useState(null);
  const dragStartRef = useRef(null);
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
    const seamPairs = pairs.filter(
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
    setLayout((prev) => {
      const incrementalDelta = clampedDelta - drag.appliedDelta;
      if (incrementalDelta === 0) return prev;
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
        if (item.w < (item.minW ?? 1) || item.h < (item.minH ?? 1)) return prev;
      }
      const unmodified = nextLayout.filter((l) => !modifiedIds.has(l.i));
      const modified = nextLayout.filter((l) => modifiedIds.has(l.i));
      for (const mod of modified) {
        if (unmodified.some((u) => strictOverlap(mod, u))) {
          console.log("[GUTTER] Multi-widget collision detected, blocking layout update");
          return prev;
        }
      }
      drag.appliedDelta = clampedDelta;
      return nextLayout;
    });
  }, [pairs, setLayout, gridConfig.cols]);
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
    if (isRglInteracting) return null;
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

export { GridBackground, GutterHandle, fastHorizontalCompactor, fastHorizontalOverlapCompactor, fastVerticalCompactor, fastVerticalOverlapCompactor, useGridArrangement, useGutterHandles, wrapCompactor, wrapOverlapCompactor };
