/**
 * useGridLayoutDrag — Custom collision resolver lifecycle tests
 *
 * Validates that the custom collision resolver path in useGridLayoutDrag:
 * - Does not mutate committed layout on rejection
 * - Reports correct layout/item in onDrag callbacks
 * - Passes context to the resolver
 * - Commits last accepted layout on drag stop (not raw drop position)
 * - Preserves oldLayoutRef as an immutable snapshot
 */

import React from "react";
import { renderHook, act } from "@testing-library/react";

import type {
  Layout,
  LayoutItem,
  CollisionResolver,
  Compactor,
} from "../../src/core/index.js";

import {
  cloneLayoutItem,
  noCompactor,
} from "../../src/core/index.js";

import { useGridLayoutDrag } from "../../src/react/hooks/useGridLayoutDrag";
import type { UseGridLayoutDragOptions } from "../../src/react/hooks/useGridLayoutDrag";

// =============================================================================
// Helpers
// =============================================================================

function item(
  i: string,
  x: number,
  y: number,
  w: number,
  h: number,
): LayoutItem {
  return { i, x, y, w, h };
}

/** Minimal mock GridDragEvent */
function mockDragEvent(): { e: Event; node: HTMLElement } {
  return {
    e: new Event("drag"),
    node: document.createElement("div"),
  };
}

/**
 * Build a complete options bag with sensible defaults.
 * Every ref and setter is pre-wired. Returns the options AND
 * the mock functions so tests can assert on them.
 */
function createHookOptions(overrides: Partial<UseGridLayoutDragOptions> = {}) {
  const initialLayout: Layout = [
    item("a", 0, 0, 2, 2),
    item("b", 2, 0, 2, 2),
  ];

  const layoutRef = { current: initialLayout };
  const oldDragItemRef: React.MutableRefObject<LayoutItem | null> = { current: null };
  const oldLayoutRef: React.MutableRefObject<Layout | null> = { current: null };

  const onLayoutMutation = jest.fn<void, [Layout]>();
  const setActiveDrag = jest.fn<void, [React.SetStateAction<LayoutItem | null>]>();
  const onDragStartProp = jest.fn();
  const onDragProp = jest.fn();
  const onDragStopProp = jest.fn();
  const onLayoutChange = jest.fn();

  const opts: UseGridLayoutDragOptions = {
    layoutRef: layoutRef as unknown as React.RefObject<Layout>,
    oldDragItemRef,
    oldLayoutRef,
    activeDrag: null,
    compactor: noCompactor,
    compactType: null,
    cols: 12,
    allowOverlap: false,
    preventCollision: false,
    onLayoutMutation,
    setActiveDrag,
    onDragStartProp,
    onDragProp,
    onDragStopProp,
    onLayoutChange,
    ...overrides,
  };

  return {
    opts,
    layoutRef,
    oldDragItemRef,
    oldLayoutRef,
    onLayoutMutation,
    setActiveDrag,
    onDragStartProp,
    onDragProp,
    onDragStopProp,
    onLayoutChange,
    initialLayout,
  };
}

// =============================================================================
// Tests
// =============================================================================

describe("useGridLayoutDrag — custom collision resolver", () => {
  // ---------------------------------------------------------------------------
  // Reject does not mutate
  // ---------------------------------------------------------------------------

  it("does not mutate committed layout when custom collisionResolver rejects", () => {
    const collisionResolver = jest.fn(() => null);
    const { opts, layoutRef, onLayoutMutation, initialLayout } =
      createHookOptions({ collisionResolver });

    // Snapshot the initial layout for comparison
    const snapshot = initialLayout.map(i => ({ ...i }));

    const { result } = renderHook(() => useGridLayoutDrag(opts));

    // Start drag
    act(() => {
      result.current.onDragStart("a", 0, 0, mockDragEvent());
    });

    // Drag a into b's position — resolver returns null (reject)
    act(() => {
      result.current.onDrag("a", 2, 0, mockDragEvent());
    });

    expect(collisionResolver).toHaveBeenCalled();
    // Layout state setter should NOT have been called
    // (only the initial drag-start clone goes into latestDragLayoutRef)
    // setLayout is only called when resolver accepts
    const setLayoutCalls = onLayoutMutation.mock.calls;
    // If setLayout was called at all, it should not contain a layout
    // with mutations from the tentative move
    if (setLayoutCalls.length > 0) {
      // The committed layout should still match the initial
      const committed = setLayoutCalls[setLayoutCalls.length - 1]![0] as Layout;
      const aItem = committed.find(l => l.i === "a");
      expect(aItem?.x).toBe(0);
      expect(aItem?.y).toBe(0);
    }

    // The original layoutRef items should be structurally unchanged
    // (we cloned before moveElement, so the originals are safe)
    expect(layoutRef.current).toEqual(snapshot);
  });

  // ---------------------------------------------------------------------------
  // Reject callback semantics
  // ---------------------------------------------------------------------------

  it("calls onDragProp with last valid layout when custom collisionResolver rejects", () => {
    const collisionResolver = jest.fn(() => null);
    const { opts, onDragProp } = createHookOptions({ collisionResolver });

    const { result } = renderHook(() => useGridLayoutDrag(opts));

    act(() => {
      result.current.onDragStart("a", 0, 0, mockDragEvent());
    });

    act(() => {
      result.current.onDrag("a", 2, 0, mockDragEvent());
    });

    expect(onDragProp).toHaveBeenCalled();
    const [layoutArg, , newItemArg, placeholderArg] = onDragProp.mock.calls[0]!;

    // Layout arg should be the last valid layout (initial), NOT the tentative
    const aInLayout = (layoutArg as Layout).find((l: LayoutItem) => l.i === "a");
    expect(aInLayout?.x).toBe(0);
    expect(aInLayout?.y).toBe(0);

    // newItem should reflect the last valid position, not the proposed position
    expect((newItemArg as LayoutItem).x).toBe(0);
    expect((newItemArg as LayoutItem).y).toBe(0);

    // Placeholder should track the proposed cursor/ghost position
    expect((placeholderArg as LayoutItem).x).toBe(2);
    expect((placeholderArg as LayoutItem).y).toBe(0);
  });

  // ---------------------------------------------------------------------------
  // Accept callback semantics
  // ---------------------------------------------------------------------------

  it("calls onDragProp with resolved layout when custom collisionResolver accepts", () => {
    const resolvedLayout: Layout = [
      item("a", 2, 0, 2, 2),
      item("b", 0, 0, 2, 2),
    ];
    const collisionResolver = jest.fn(() => resolvedLayout);
    const { opts, onDragProp, onLayoutMutation } = createHookOptions({ collisionResolver });

    const { result } = renderHook(() => useGridLayoutDrag(opts));

    act(() => {
      result.current.onDragStart("a", 0, 0, mockDragEvent());
    });

    act(() => {
      result.current.onDrag("a", 2, 0, mockDragEvent());
    });

    expect(onDragProp).toHaveBeenCalled();
    // setLayout should have been called with the compacted resolved layout
    expect(onLayoutMutation).toHaveBeenCalled();

    const [layoutArg] = onDragProp.mock.calls[0]!;
    // The layout passed to onDragProp should be the accepted/compacted layout
    const aInLayout = (layoutArg as Layout).find((l: LayoutItem) => l.i === "a");
    expect(aInLayout).toBeDefined();
  });

  // ---------------------------------------------------------------------------
  // Context passing
  // ---------------------------------------------------------------------------

  it("passes cols and compactType to custom collisionResolver", () => {
    const collisionResolver = jest.fn(() => null);
    const { opts } = createHookOptions({
      collisionResolver,
      cols: 6,
      compactType: "horizontal",
    });

    const { result } = renderHook(() => useGridLayoutDrag(opts));

    act(() => {
      result.current.onDragStart("a", 0, 0, mockDragEvent());
    });

    act(() => {
      result.current.onDrag("a", 2, 0, mockDragEvent());
    });

    expect(collisionResolver).toHaveBeenCalledWith(
      expect.any(Array),
      expect.objectContaining({ i: "a" }),
      expect.objectContaining({ x: 0, y: 0 }),
      { 
        cols: 6, 
        compactType: "horizontal",
        dragConfig: undefined,
        cursorPosition: undefined,
        oldDragItem: expect.objectContaining({ i: "a", x: 0, y: 0 })
      }
    );
  });

  // ---------------------------------------------------------------------------
  // Drag stop: commits last accepted, not raw drop position
  // ---------------------------------------------------------------------------

  it("does not re-resolve raw drop position on drag stop for custom collisionResolver", () => {
    // Frame 1: resolver accepts
    // Frame 2: resolver rejects
    // On drag stop: should commit the frame-1 layout, not re-resolve at frame-2 pos
    let callCount = 0;
    const acceptedLayout: Layout = [
      item("a", 2, 0, 2, 2),
      item("b", 0, 0, 2, 2),
    ];
    const collisionResolver: CollisionResolver = jest.fn(() => {
      callCount++;
      if (callCount === 1) return acceptedLayout;
      return null; // reject on frame 2
    });

    const { opts, onLayoutMutation, onLayoutChange, oldLayoutRef } = createHookOptions({
      collisionResolver,
    });
    // Need activeDrag to be non-null for onDragStop to execute
    opts.activeDrag = item("a", 0, 0, 2, 2);

    const { result } = renderHook(() => useGridLayoutDrag(opts));

    // Start
    act(() => {
      result.current.onDragStart("a", 0, 0, mockDragEvent());
    });

    // Frame 1: accepted at (2,0)
    act(() => {
      result.current.onDrag("a", 2, 0, mockDragEvent());
    });

    // Frame 2: rejected at (4,0) — layout stays at frame 1
    act(() => {
      result.current.onDrag("a", 4, 0, mockDragEvent());
    });

    // Stop at (4,0) — should commit frame-1 layout, not re-resolve
    act(() => {
      result.current.onDragStop("a", 4, 0, mockDragEvent());
    });

    // The final setLayout call should use the last accepted layout
    const lastSetLayoutCall = onLayoutMutation.mock.calls[onLayoutMutation.mock.calls.length - 1]!;
    const finalLayout = lastSetLayoutCall[0] as Layout;
    const aFinal = finalLayout.find(l => l.i === "a");
    // Should be at the accepted position (2,0), not the raw drop (4,0)
    expect(aFinal?.x).toBe(2);
  });

  // ---------------------------------------------------------------------------
  // oldLayoutRef is an immutable snapshot
  // ---------------------------------------------------------------------------

  it("keeps oldLayoutRef as an immutable snapshot for onLayoutChange comparison", () => {
    const { opts, oldLayoutRef, initialLayout } = createHookOptions();

    // Snapshot before drag
    const preSnapshot = initialLayout.map(i => ({ ...i }));

    const { result } = renderHook(() => useGridLayoutDrag(opts));

    act(() => {
      result.current.onDragStart("a", 0, 0, mockDragEvent());
    });

    // After drag start, oldLayoutRef should be set and structurally equal to initial
    for (const pre of preSnapshot) {
      const found = oldLayoutRef.current!.find(l => l.i === pre.i);
      expect(found).toBeDefined();
      expect(found!.x).toBe(pre.x);
      expect(found!.y).toBe(pre.y);
      expect(found!.w).toBe(pre.w);
      expect(found!.h).toBe(pre.h);
    }

    // Critically: it should NOT be the same reference
    expect(oldLayoutRef.current).not.toBe(initialLayout);
    if (oldLayoutRef.current && oldLayoutRef.current.length > 0) {
      expect(oldLayoutRef.current[0]).not.toBe(initialLayout[0]);
    }
  });

  // ---------------------------------------------------------------------------
  // Placeholder always tracks cursor
  // ---------------------------------------------------------------------------

  it("updates placeholder to track cursor position even on rejection", () => {
    const collisionResolver = jest.fn(() => null);
    const { opts, setActiveDrag } = createHookOptions({ collisionResolver });

    const { result } = renderHook(() => useGridLayoutDrag(opts));

    act(() => {
      result.current.onDragStart("a", 0, 0, mockDragEvent());
    });

    act(() => {
      result.current.onDrag("a", 5, 3, mockDragEvent());
    });

    // setActiveDrag should have been called with placeholder at proposed position
    expect(setActiveDrag).toHaveBeenCalledWith(
      expect.objectContaining({ i: "a", x: 5, y: 3 })
    );
  });
});
