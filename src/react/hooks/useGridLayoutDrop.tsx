/**
 * useGridLayoutDrop — External drop-in pipeline for GridLayout
 *
 * Extracted from GridLayout.tsx to isolate the HTML5 drag-and-drop
 * handling for dropping external elements into the grid. Includes
 * Firefox workarounds, position calculation, and placeholder management.
 *
 * @module react/hooks/useGridLayoutDrop
 */

import React, { useCallback, type ReactElement, type DragEvent as ReactDragEvent } from "react";

import type {
  Layout,
  LayoutItem,
  DroppingPosition,
  Compactor
} from "../../core/index.js";
import type { PositionParams } from "../../core/index.js";
import {
  calcXY,
  calcGridColWidth,
  calcGridItemWHPx
} from "../../core/index.js";

// ============================================================================
// Firefox detection (module-level)
// ============================================================================

let isFirefox = false;
try {
  isFirefox = /firefox/i.test(navigator.userAgent);
} catch {
  /* Ignore — SSR */
}

const layoutClassName = "react-grid-layout";

// ============================================================================
// Types
// ============================================================================

export interface UseGridLayoutDropOptions {
  /** Ref to current layout (avoids stale closures) */
  layoutRef: React.RefObject<Layout>;
  /** Dropping item config (i, w, h, etc.) */
  droppingItem: LayoutItem;
  /** Current dropping DOM node */
  droppingDOMNode: ReactElement | null;
  /** Current dropping position */
  droppingPosition: DroppingPosition | undefined;
  /** Compactor instance */
  compactor: Compactor;
  /** Grid configuration */
  cols: number;
  margin: readonly [number, number];
  maxRows: number;
  rowHeight: number;
  width: number;
  effectiveContainerPadding: readonly [number, number];
  transformScale: number;
  /** Whether external drop is enabled */
  isDroppable: boolean;
  /** DropConfig.onDragOver callback (native DragEvent) */
  dropConfigOnDragOver?: ((e: DragEvent) => { w?: number; h?: number; dragOffsetX?: number; dragOffsetY?: number } | false | void) | null;
  /** Legacy onDropDragOver prop (React DragEvent) */
  onDropDragOverProp: (e: ReactDragEvent) => { w?: number; h?: number; dragOffsetX?: number; dragOffsetY?: number } | false | void;
  /** Called when item is dropped */
  onDropProp: (layout: Layout, item: LayoutItem | undefined, e: Event) => void;
  /** State setters */
  setLayout: React.Dispatch<React.SetStateAction<Layout>>;
  setDroppingDOMNode: React.Dispatch<React.SetStateAction<ReactElement | null>>;
  setDroppingPosition: React.Dispatch<React.SetStateAction<DroppingPosition | undefined>>;
  setActiveDrag: React.Dispatch<React.SetStateAction<LayoutItem | null>>;
}

export interface UseGridLayoutDropResult {
  /** Remove the dropping placeholder from layout */
  removeDroppingPlaceholder: () => void;
  /** HTML5 dragover handler */
  handleDragOver: (e: ReactDragEvent) => void | false;
  /** HTML5 dragleave handler */
  handleDragLeave: (e: ReactDragEvent) => void;
  /** HTML5 dragenter handler */
  handleDragEnter: (e: ReactDragEvent) => void;
  /** HTML5 drop handler */
  handleDrop: (e: ReactDragEvent) => void;
  /** Ref to drag enter counter (for drag leave detection) */
  dragEnterCounterRef: React.MutableRefObject<number>;
}

// ============================================================================
// Hook
// ============================================================================

export function useGridLayoutDrop(opts: UseGridLayoutDropOptions): UseGridLayoutDropResult {
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
    setLayout,
    setDroppingDOMNode,
    setDroppingPosition,
    setActiveDrag,
  } = opts;

  const dragEnterCounterRef = React.useRef(0);

  // ── Remove placeholder ─────────────────────────────────

  const removeDroppingPlaceholder = useCallback(() => {
    const currentLayout = layoutRef.current;
    const hasDroppingItem = currentLayout.some(l => l.i === droppingItem.i);
    if (!hasDroppingItem) {
      setDroppingDOMNode(null);
      setActiveDrag(null);
      setDroppingPosition(undefined);
      return;
    }

    const newLayout = compactor.compact(
      currentLayout.filter(l => l.i !== droppingItem.i),
      cols
    );

    setLayout(newLayout);
    setDroppingDOMNode(null);
    setActiveDrag(null);
    setDroppingPosition(undefined);
  }, [layoutRef, droppingItem.i, cols, compactor, setLayout, setDroppingDOMNode, setActiveDrag, setDroppingPosition]);

  // ── Drag Over ──────────────────────────────────────────

  const handleDragOver = useCallback(
    (e: ReactDragEvent): void | false => {
      e.preventDefault();
      e.stopPropagation();

      // Firefox hack
      if (
        isFirefox &&
        !(e.nativeEvent.target as HTMLElement)?.classList.contains(
          layoutClassName
        )
      ) {
        return false;
      }

      // Use dropConfig.onDragOver if provided, otherwise fall back to onDropDragOver prop (#2212)
      const rawResult = dropConfigOnDragOver
        ? dropConfigOnDragOver(e.nativeEvent as DragEvent)
        : onDropDragOverProp(e);
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

      const positionParams: PositionParams = {
        cols,
        margin: margin as [number, number],
        maxRows,
        rowHeight,
        containerWidth: width,
        containerPadding: effectiveContainerPadding as [number, number]
      };

      const actualColWidth = calcGridColWidth(positionParams);

      const itemPixelWidth = calcGridItemWHPx(
        finalDroppingItem.w,
        actualColWidth,
        (margin as [number, number])[0]
      );
      const itemPixelHeight = calcGridItemWHPx(
        finalDroppingItem.h,
        rowHeight,
        (margin as [number, number])[1]
      );

      // Center the dropping item
      const itemCenterOffsetX = itemPixelWidth / 2;
      const itemCenterOffsetY = itemPixelHeight / 2;

      const rawGridX =
        e.clientX - gridRect.left + dragOffsetX - itemCenterOffsetX;
      const rawGridY =
        e.clientY - gridRect.top + dragOffsetY - itemCenterOffsetY;

      const clampedGridX = Math.max(0, rawGridX);
      const clampedGridY = Math.max(0, rawGridY);

      const newDroppingPosition: DroppingPosition = {
        left: clampedGridX / transformScale,
        top: clampedGridY / transformScale,
        e: e.nativeEvent
      };

      if (!droppingDOMNode) {
        const calculatedPosition = calcXY(
          positionParams,
          clampedGridY,
          clampedGridX,
          finalDroppingItem.w,
          finalDroppingItem.h
        );

        setDroppingDOMNode(<div key={finalDroppingItem.i} />);
        setDroppingPosition(newDroppingPosition);
        const baseLayout = layoutRef.current.filter(
          l => l.i !== finalDroppingItem.i
        );
        setLayout([
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
        const shouldUpdate =
          droppingPosition.left !== newDroppingPosition.left ||
          droppingPosition.top !== newDroppingPosition.top;
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
      setLayout,
      setDroppingDOMNode,
      setDroppingPosition
    ]
  );

  // ── Drag Leave ─────────────────────────────────────────

  const handleDragLeave = useCallback(
    (e: ReactDragEvent) => {
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

  // ── Drag Enter ─────────────────────────────────────────

  const handleDragEnter = useCallback((e: ReactDragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragEnterCounterRef.current++;
  }, []);

  // ── Drop ───────────────────────────────────────────────

  const handleDrop = useCallback(
    (e: ReactDragEvent) => {
      e.preventDefault();
      e.stopPropagation();

      const currentLayout = layoutRef.current;
      const item = currentLayout.find(l => l.i === droppingItem.i);
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
    dragEnterCounterRef,
  };
}
