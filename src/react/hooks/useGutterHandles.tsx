/**
 * useGutterHandles — Custom shared-edge resize for adjacent widgets.
 *
 * Detects touching widget pairs in the RGL layout and renders draggable
 * "gutter" handles in the margin gap between them. Dragging a gutter
 * resizes both widgets simultaneously (one grows, one shrinks).
 *
 * This hook calls `onGutterResize(nextLayout)` with the computed layout
 * after each grid-snapped drag step. The consumer is responsible for
 * updating their own layout state.
 *
 * @module react/hooks/useGutterHandles
 */

import { useCallback, useMemo, useRef, useState, useEffect } from "react";
import type { MouseEvent } from "react";
import { calcGridCellDimensions } from "../../core/math/calculate.js";
import type { GridCellDimensions } from "../../core/math/calculate.js";
import type { LayoutItem } from "../../core/types/layout.js";
import type { GridConfig } from "../../core/types/config.js";
import { GutterHandle } from "../components/GutterHandle.js";

// ── Types ────────────────────────────────────────────────

interface AdjacentPair {
  type: "horizontal" | "vertical";
  /** Left or top widget */
  a: LayoutItem;
  /** Right or bottom widget */
  b: LayoutItem;
  /** Start of shared edge in perpendicular axis (grid units) */
  overlapStart: number;
  /** End of shared edge in perpendicular axis (grid units) */
  overlapEnd: number;
}

interface GutterPixelPos {
  left: number;
  top: number;
  width: number;
  height: number;
}

// ── Custom Collision Detection ───────────────────────────
// RGL's internal `collides` treats flush edges as collisions.
// For gutter detection, we strictly want to prevent OVERLAPPING
// elements, not flush-touching ones. This is intentionally different
// from core's `collides()`.
function strictOverlap(l1: LayoutItem, l2: LayoutItem): boolean {
  if (l1.i === l2.i) return false;
  if (l1.x + l1.w <= l2.x) return false; // l1 is strictly left of l2
  if (l1.x >= l2.x + l2.w) return false; // l1 is strictly right of l2
  if (l1.y + l1.h <= l2.y) return false; // l1 is strictly above l2
  if (l1.y >= l2.y + l2.h) return false; // l1 is strictly below l2
  return true; // Overlap exists
}

// ── Adjacency Detection ──────────────────────────────────

function findAdjacentPairs(layout: readonly LayoutItem[]): AdjacentPair[] {
  const pairs: AdjacentPair[] = [];

  for (let i = 0; i < layout.length; i++) {
    for (let j = i + 1; j < layout.length; j++) {
      const li = layout[i]!;
      const lj = layout[j]!;

      // Horizontal: li is left of lj
      if (li.x + li.w === lj.x) {
        const overlapStart = Math.max(li.y, lj.y);
        const overlapEnd = Math.min(li.y + li.h, lj.y + lj.h);
        if (overlapEnd > overlapStart) {
          pairs.push({ type: "horizontal", a: li, b: lj, overlapStart, overlapEnd });
        }
      }
      // Horizontal: lj is left of li
      else if (lj.x + lj.w === li.x) {
        const overlapStart = Math.max(li.y, lj.y);
        const overlapEnd = Math.min(li.y + li.h, lj.y + lj.h);
        if (overlapEnd > overlapStart) {
          pairs.push({ type: "horizontal", a: lj, b: li, overlapStart, overlapEnd });
        }
      }

      // Vertical: li is above lj
      if (li.y + li.h === lj.y) {
        const overlapStart = Math.max(li.x, lj.x);
        const overlapEnd = Math.min(li.x + li.w, lj.x + lj.w);
        if (overlapEnd > overlapStart) {
          pairs.push({ type: "vertical", a: li, b: lj, overlapStart, overlapEnd });
        }
      }
      // Vertical: lj is above li
      else if (lj.y + lj.h === li.y) {
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

// ── Pixel Position Calculation ───────────────────────────
// Uses the same formula as RGL's GridBackground:
//   x = offsetX + col * (cellWidth + gapX)
//   y = offsetY + row * (cellHeight + gapY)

function calcGutterPixelPos(
  pair: AdjacentPair,
  dims: GridCellDimensions,
): GutterPixelPos {
  const { cellWidth, cellHeight, offsetX, offsetY, gapX, gapY, cellWidths } = dims;

  // Helper: pixel left edge of column `col` (handles unequal widths)
  const colLeft = (col: number): number => {
    if (!cellWidths) return offsetX + col * (cellWidth + gapX);
    let x = offsetX;
    for (let c = 0; c < col; c++) {
      x += (cellWidths[c] ?? cellWidth) + gapX;
    }
    return x;
  };

  // Helper: pixel width spanning from column `start` to `start + span`
  const colSpanWidth = (start: number, span: number): number => {
    if (!cellWidths) return (cellWidth + gapX) * span - gapX;
    let w = 0;
    for (let c = start; c < start + span; c++) {
      w += (cellWidths[c] ?? cellWidth) + gapX;
    }
    return w - gapX;
  };

  if (pair.type === "horizontal") {
    // Gutter sits in the horizontal gap between a's right edge and b's left edge
    const left = colLeft(pair.b.x) - gapX;
    const top = offsetY + pair.overlapStart * (cellHeight + gapY);
    const width = gapX;
    const height = (cellHeight + gapY) * (pair.overlapEnd - pair.overlapStart) - gapY;
    return { left, top, width, height };
  }

  // Vertical: gutter sits in the vertical gap between a's bottom edge and b's top edge
  const left = colLeft(pair.overlapStart);
  const top = offsetY + pair.b.y * (cellHeight + gapY) - gapY;
  const width = colSpanWidth(pair.overlapStart, pair.overlapEnd - pair.overlapStart);
  const height = gapY;
  return { left, top, width, height };
}

// ── Hook ─────────────────────────────────────────────────

export function useGutterHandles(
  layout: readonly LayoutItem[],
  onGutterResize: (layout: readonly LayoutItem[]) => void,
  containerWidth: number,
  gridConfig: GridConfig,
  isRglInteracting: boolean,
  isEditMode: boolean = true,
) {
  const [activeGutter, setActiveGutter] = useState<string | null>(null);
  const dragStartRef = useRef<{
    clientStart: number;        // Starting mouse position (px)
    pair: AdjacentPair;         // The pair being resized
    cellStep: number;           // Pixels per grid unit step
    appliedDelta: number;       // Grid units already applied
  } | null>(null);

  // Stable ref for the callback
  const onGutterResizeRef = useRef(onGutterResize);
  useEffect(() => {
    onGutterResizeRef.current = onGutterResize;
  }, [onGutterResize]);

  // Stable ref for layout (for use in mouse event handlers)
  const layoutRef = useRef(layout);
  useEffect(() => {
    layoutRef.current = layout;
  }, [layout]);

  // Compute grid cell dimensions (same math RGL uses internally)
  const dims = useMemo(
    () => calcGridCellDimensions({
      width: containerWidth,
      cols: gridConfig.cols,
      rowHeight: gridConfig.rowHeight,
      margin: gridConfig.margin,
      columnWidths: gridConfig.columnWidths,
    }),
    [containerWidth, gridConfig.cols, gridConfig.rowHeight, gridConfig.margin, gridConfig.columnWidths],
  );

  // Detect adjacent pairs from current layout
  const pairs = useMemo(() => findAdjacentPairs(layout), [layout]);

  // Gutter pixel positions
  const gutterPositions = useMemo(
    () => pairs.map(pair => calcGutterPixelPos(pair, dims)),
    [pairs, dims],
  );

  // Mouse move handler — updates layout when delta crosses a grid unit boundary
  const handleMouseMove = useCallback((e: globalThis.MouseEvent) => {
    const drag = dragStartRef.current;
    if (!drag) return;

    const pixelDelta = drag.pair.type === "horizontal"
      ? e.clientX - drag.clientStart
      : e.clientY - drag.clientStart;

    const rawGridDelta = Math.round(pixelDelta / drag.cellStep);
    // Only update if the grid-snapped delta actually changed
    if (rawGridDelta === drag.appliedDelta) return;

    const pair = drag.pair;
    const isH = pair.type === "horizontal";
    const seamPos = isH ? pair.a.x + pair.a.w : pair.a.y + pair.a.h;

    // Find all pairs that share this exact seam line
    const currentPairs = findAdjacentPairs(layoutRef.current);
    const seamPairs = currentPairs.filter(p => 
      p.type === pair.type && 
      (isH ? p.a.x + p.a.w === seamPos : p.a.y + p.a.h === seamPos)
    );

    // Group pairs into a connected component (contiguous seam)
    const connectedPairs = [pair];
    let added = true;
    while (added) {
      added = false;
      for (const sp of seamPairs) {
        if (!connectedPairs.includes(sp)) {
          const touches = connectedPairs.some(cp => 
            sp.overlapStart <= cp.overlapEnd && sp.overlapEnd >= cp.overlapStart
          );
          if (touches) {
            connectedPairs.push(sp);
            added = true;
          }
        }
      }
    }

    // Calculate maximum allowed drag in both directions across ALL connected pairs
    let minD = -Infinity;
    let maxD = Infinity;

    for (const cp of connectedPairs) {
      const aCurrent = isH ? cp.a.w : cp.a.h;
      const aMin = isH ? (cp.a.minW ?? 1) : (cp.a.minH ?? 1);
      const aMax = isH ? (cp.a.maxW ?? gridConfig.cols) : (cp.a.maxH ?? Infinity);
      const bCurrent = isH ? cp.b.w : cp.b.h;
      const bMin = isH ? (cp.b.minW ?? 1) : (cp.b.minH ?? 1);
      const bMax = isH ? (cp.b.maxW ?? gridConfig.cols) : (cp.b.maxH ?? Infinity);

      const pMax = Math.min(aMax - aCurrent, bCurrent - bMin);
      const pMin = -Math.min(aCurrent - aMin, bMax - bCurrent);
      
      if (pMax < maxD) maxD = pMax;
      if (pMin > minD) minD = pMin;
    }

    const clampedDelta = Math.max(minD, Math.min(maxD, rawGridDelta));
    if (clampedDelta === drag.appliedDelta) return;

    // Compute new layout from current state
    const prev = layoutRef.current;
    const incrementalDelta = clampedDelta - drag.appliedDelta;
    if (incrementalDelta === 0) return;

    const nextLayout = [...prev];
    const modifiedIds = new Set<string>();

    // Apply delta to all widgets touching the seam
    for (const cp of connectedPairs) {
      const idxA = nextLayout.findIndex(l => l.i === cp.a.i);
      const idxB = nextLayout.findIndex(l => l.i === cp.b.i);
      if (idxA === -1 || idxB === -1) continue;

      if (!modifiedIds.has(cp.a.i)) {
        const ca = nextLayout[idxA]!;
        nextLayout[idxA] = isH
          ? { ...ca, w: ca.w + incrementalDelta }
          : { ...ca, h: ca.h + incrementalDelta };
        modifiedIds.add(cp.a.i);
      }

      if (!modifiedIds.has(cp.b.i)) {
        const cb = nextLayout[idxB]!;
        nextLayout[idxB] = isH
          ? { ...cb, x: cb.x + incrementalDelta, w: cb.w - incrementalDelta }
          : { ...cb, y: cb.y + incrementalDelta, h: cb.h - incrementalDelta };
        modifiedIds.add(cp.b.i);
      }
    }

    // Final constraint safety check
    for (const id of modifiedIds) {
      const item = nextLayout.find(l => l.i === id)!;
      if (item.w < (item.minW ?? 1) || item.h < (item.minH ?? 1)) return;
    }

    // Collision check against unmodified widgets
    const unmodified = nextLayout.filter(l => !modifiedIds.has(l.i));
    const modified = nextLayout.filter(l => modifiedIds.has(l.i));

    for (const mod of modified) {
      if (unmodified.some(u => strictOverlap(mod, u))) {
        console.log('[GUTTER] Multi-widget collision detected, blocking layout update');
        return;
      }
    }

    drag.appliedDelta = clampedDelta;
    onGutterResizeRef.current(nextLayout);
  }, [gridConfig.cols]);

  // Mouse up handler — cleanup
  const handleMouseUp = useCallback(() => {
    dragStartRef.current = null;
    setActiveGutter(null);
    document.body.style.cursor = "";
    document.body.classList.remove("gutter-dragging");
    document.removeEventListener("mousemove", handleMouseMove);
    document.removeEventListener("mouseup", handleMouseUp);
  }, [handleMouseMove]);

  // Mouse down handler — start tracking
  const handleMouseDown = useCallback((pair: AdjacentPair, e: MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    const cellStep = pair.type === "horizontal"
      ? dims.cellWidth + dims.gapX
      : dims.cellHeight + dims.gapY;

    dragStartRef.current = {
      clientStart: pair.type === "horizontal" ? e.clientX : e.clientY,
      pair,
      cellStep,
      appliedDelta: 0,
    };

    setActiveGutter(`${pair.a.i}-${pair.b.i}-${pair.type}`);
    document.body.style.cursor = pair.type === "horizontal" ? "col-resize" : "row-resize";
    document.body.classList.add("gutter-dragging");
    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);
  }, [dims, handleMouseMove, handleMouseUp]);

  // Build gutter elements
  const gutterElements = useMemo(() => {
    if (isRglInteracting || !isEditMode) return null;

    return pairs.map((pair, idx) => {
      const pos = gutterPositions[idx];
      if (!pos) return null;

      const key = `${pair.a.i}-${pair.b.i}-${pair.type}`;
      const isActive = activeGutter === key;

      return (
        <GutterHandle
          key={key}
          type={pair.type}
          left={pos.left}
          top={pos.top}
          width={pos.width}
          height={pos.height}
          isActive={isActive}
          onMouseDown={(e) => handleMouseDown(pair, e)}
        />
      );
    });
  }, [pairs, gutterPositions, isRglInteracting, activeGutter, handleMouseDown]);

  return {
    gutterElements,
    isDraggingGutter: activeGutter !== null,
  };
}
