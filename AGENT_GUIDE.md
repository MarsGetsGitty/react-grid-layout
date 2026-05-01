# react-grid-layout v2 — Agent Navigation Guide

> **Purpose:** This is a local clone of the PCD fork (`MarsGetsGitty/react-grid-layout#pcd-stable`) for study only. Do NOT modify these files — they exist so agents can trace actual execution paths instead of guessing.

## 📚 Deep-Dive Documentation Index

| # | Document | What it covers |
|---|----------|---------------|
| 00 | [Core Decomposition](docs/00-core-decomposition.md) | All 11 core files mapped into 5 domains. Dependency graph, per-file stats, call-stack maps for drag & resize, and proposed structural improvements. **Start here.** |
| 01 | [GridItem Callback Chain](docs/01-griditem-callback-chain.md) | How DOM events flow through GridItem's constraint pipeline into GridLayout's collision resolver. The 3-layer chain: DOM → GridItem → GridLayout. |
| 02 | [Constraint System](docs/02-constraint-system.md) | Built-in constraints (gridBounds, minMaxSize), factories (aspectRatio, snapToGrid), and the critical distinction between constraints (GridItem) vs collision (GridLayout). |
| 03 | [State Synchronization](docs/03-state-synchronization.md) | Controlled layout model, the three response patterns (accept/modify/reject), the PCD fork's `activeDrag` guard modification, and `onLayoutChange` timing. |

---

## PCD-Specific Modifications

This fork is NOT stock RGL. The following PCD-specific changes exist:

| File | Line | Change | Why |
|------|------|--------|-----|
| [GridLayout.tsx](src/react/components/GridLayout.tsx#L437) | 437 | `activeDrag` guard **commented out** in prop-sync effect | Allows controlled layout prop updates to take effect during an active drag. Stock RGL blocks prop-sync during drag, which prevents our external swap/push logic from feeding corrected layouts back in real-time. |

## Source Map

```
src/
├── core/                          ← Pure logic, no React
│   ├── collision.ts               ← collides(), getFirstCollision(), getAllCollisions()
│   ├── compactors.ts              ← getCompactor(), all compactor variants
│   ├── layout.ts                  ← moveElement(), moveElementAwayFromCollision(), withLayoutItem()
│   ├── calculate.ts               ← pixel↔grid math (calcXY, calcGridColWidth, etc.)
│   ├── position.ts                ← CSS positioning strategies (transform vs absolute)
│   ├── constraints.ts             ← minW/minH/maxW/maxH enforcement, grid bounds
│   ├── sort.ts                    ← sortLayoutItemsByRowCol, sortLayoutItemsByColRow
│   ├── types.ts                   ← ALL type definitions (LayoutItem, Compactor, EventCallback, etc.)
│   ├── compact-compat.ts          ← Legacy compact() compat shim (NOT USED in v2)
│   └── index.ts                   ← Public core exports
│
├── react/                         ← React integration layer
│   ├── components/
│   │   ├── GridLayout.tsx         ← ★ THE MAIN COMPONENT (1131 lines)
│   │   ├── GridItem.tsx           ← Individual grid item wrapper (drag/resize handles)
│   │   ├── ResponsiveGridLayout.tsx ← Breakpoint-aware wrapper (not used by PCD)
│   │   └── WidthProvider.tsx      ← Auto-width wrapper (PCD uses useContainerWidth instead)
│   ├── hooks/                     ← useContainerWidth, etc.
│   └── types/                     ← React-specific type exports
│
├── extras/                        ← Optional features (wrap compactor, etc.)
└── index.ts                       ← Top-level re-exports
```

---

## Critical Flow: Drag

**Entry:** User grabs a widget → `GridItem` fires `onDragStart(i, x, y, data)`

### 1. onDragStart ([GridLayout.tsx:504-525](src/react/components/GridLayout.tsx#L504))
```
→ Saves oldDragItemRef (clone of item before drag)
→ Saves oldLayoutRef (entire layout before drag)
→ Sets activeDrag = placeholder {w, h, x, y, i}
→ Fires onDragStartProp(layout, oldItem, item, null, e, node)
```

### 2. onDrag — called every mouse tick ([GridLayout.tsx:527-562](src/react/components/GridLayout.tsx#L527))
```
→ Gets item `l` from layoutRef.current
→ Creates placeholder {w, h, x, y, i} from CURRENT l position (BEFORE move)
→ Calls moveElement(layout, l, x, y, true, preventCollision, compactType, cols, allowOverlap)
    ├── if allowOverlap=true && collision: cloneLayout and return (items stack)
    ├── if preventCollision=true && collision: REVERT x,y and return SAME REFERENCE
    └── else: resolve collisions by pushing neighbors vertically (recursive)
→ Fires onDragProp(newLayout, oldDragItem, l, placeholder, e, node)
→ RGL sets its internal state: setLayout(compactor.compact(newLayout, cols))
→ RGL sets activeDrag = placeholder
```

### 3. onDragStop ([GridLayout.tsx:564-610](src/react/components/GridLayout.tsx#L564))
```
→ Guards: if (!activeDrag) return
→ Calls moveElement again with final position
→ finalLayout = compactor.compact(newLayout, cols)
→ Fires onDragStopProp(finalLayout, oldDragItem, l, null, e, node)
→ Clears oldDragItemRef, oldLayoutRef
→ setActiveDrag(null)
→ setLayout(finalLayout)
→ If layout changed: onLayoutChange(finalLayout)
```

### Key insight: Timing of prop-sync during drag

Stock RGL: `if (activeDrag) return;` on line 437 means prop updates are BLOCKED during drag.

**PCD fork:** This guard is commented out. So when our `handleDrag` callback calls `setLayout(swappedLayout)`, and that flows into the `layout` prop, RGL's sync effect WILL pick it up during the drag. This is what enables live swap feedback.

---

## Critical Flow: Resize

**Entry:** User drags a resize handle → `GridItem` fires `onResize(i, w, h, data)`

### 1. onResizeStart ([GridLayout.tsx:616-629](src/react/components/GridLayout.tsx#L616))
```
→ Saves oldResizeItemRef (clone)
→ Saves oldLayoutRef
→ setResizing(true)
→ Fires onResizeStartProp(layout, l, l, null, e, node)
```

### 2. onResize — the critical path ([GridLayout.tsx:631-727](src/react/components/GridLayout.tsx#L631))
```
→ Uses withLayoutItem to clone item and apply new w, h
→ Calculates newX, newY for directional handles (sw, w, nw, n, ne)
    ├── sw/nw/w: newX = item.x + (item.w - w), clamped to ≥0
    └── ne/n/nw: newY = item.y + (item.h - h), clamped to ≥0
→ COLLISION CHECK (ONLY if preventCollision=true AND allowOverlap=false):
    ├── getAllCollisions(layout, {item with new w,h,x,y})
    └── If any collisions: REVERT all changes (w=old, h=old, x=old, y=old)
→ Applies w, h to the cloned item
→ If shouldMoveItem: moveElement(layout, l, newX, newY, ...)
→ Fires onResizeProp(finalLayout, oldItem, newItem, placeholder, e, node)
→ setLayout(compactor.compact(finalLayout, cols))
→ setActiveDrag(placeholder)
```

### 3. onResizeStop ([GridLayout.tsx:729-759](src/react/components/GridLayout.tsx#L729))
```
→ finalLayout = compactor.compact(currentLayout, cols)
→ Fires onResizeStopProp
→ Clears refs, setActiveDrag(null), setResizing(false)
→ setLayout(finalLayout)
→ If layout changed: onLayoutChange(finalLayout)
```

---

## Critical Flow: Prop Sync (Controlled Layout)

**The loop:** Our component passes `layout` prop → RGL sync effect → RGL internal state → render

### Sync effect ([GridLayout.tsx:436-472](src/react/components/GridLayout.tsx#L436))

```
Runs when: propsLayout, children, cols, compactType, compactor, activeDrag,
           droppingDOMNode, or layout change.

Guards:
  // if (activeDrag) return;  ← PCD: COMMENTED OUT (allows prop sync during drag)
  if (droppingDOMNode) return; ← Still active (blocks sync during external drops)

Logic:
  1. Detect what changed: layout prop? children? compactType?
  2. If anything changed:
     baseLayout = layoutChanged ? propsLayout : RGL's current layout
     newLayout = synchronizeLayoutWithChildren(baseLayout, children, cols, compactor)
  3. If newLayout !== current layout (deepEqual check):
     setLayout(newLayout)  ← RGL updates its internal state
```

### onLayoutChange effect ([GridLayout.tsx:474-485](src/react/components/GridLayout.tsx#L474))
```
Guards: only fires when !activeDrag AND layout !== prevLayout
Action: calls onLayoutChange(publicLayout)  ← filters out dropping placeholder
```

---

## Compactor Behavior Matrix

| Factory call | type | allowOverlap | preventCollision | Drag behavior | Resize behavior | compact() |
|---|---|---|---|---|---|---|
| `getCompactor("vertical")` | "vertical" | false | false | Push neighbors vertically | No collision check (overlap) | Move items up |
| `getCompactor(null, false, false)` | null | false | false | Push neighbors vertically | No collision check (overlap) | Passthrough (clone) |
| `getCompactor(null, false, true)` | null | false | **true** | **BLOCK move** (revert) | **BLOCK resize** (revert) | Passthrough |
| `getCompactor(null, true, false)` | null | **true** | false | **Items stack** (no push) | No collision check (overlap) | Passthrough |

### How `allowOverlap` and `preventCollision` interact in moveElement:

```
Line 300: const collisions = getAllCollisions(sorted, l);
Line 301: const hasCollisions = collisions.length > 0;
Line 304: if (hasCollisions && allowOverlap) → cloneLayout and return (items stack, no push)
Line 310: if (hasCollisions && preventCollision) → REVERT position, return SAME reference
Line 318: else → resolve by pushing each collision via moveElementAwayFromCollision
```

**Priority order:** `allowOverlap` is checked FIRST (line 304), `preventCollision` SECOND (line 310).
If both are true, `allowOverlap` wins — items just stack.

### How `preventCollision` works in onResize:

```
Line 663: if (preventCollision && !allowOverlap) {
Line 664:   const collisions = getAllCollisions(...)
Line 672:   if (collisions.length > 0) → REVERT all dimensions
Line 678: }
```

If `allowOverlap=true`, this block is SKIPPED entirely (the `!allowOverlap` guard).
If `preventCollision=false`, this block is SKIPPED entirely.
Both must be true for resize blocking to happen.

---

## Collision Detection ([collision.ts](src/core/collision.ts))

Simple AABB (axis-aligned bounding box) overlap check:

```typescript
export function collides(l1: LayoutItem, l2: LayoutItem): boolean {
  if (l1.i === l2.i) return false;           // Can't collide with self
  if (l1.x + l1.w <= l2.x) return false;     // l1 left of l2
  if (l1.x >= l2.x + l2.w) return false;     // l1 right of l2
  if (l1.y + l1.h <= l2.y) return false;     // l1 above l2
  if (l1.y >= l2.y + l2.h) return false;     // l1 below l2
  return true;                                // Overlapping
}
```

`getAllCollisions(layout, item)` → returns all items that overlap with `item` (excluding self).
`getFirstCollision(layout, item)` → returns the first one found (or undefined).

---

## EventCallback Signature

ALL drag/resize callbacks use the same signature:

```typescript
type EventCallback = (
  layout: Layout,              // Full layout AFTER the operation
  oldItem: LayoutItem | null,  // Item state BEFORE the operation
  newItem: LayoutItem | null,  // Item state AFTER the operation
  placeholder: LayoutItem | null,
  event: Event,
  element: HTMLElement | null
) => void;
```

**Important:** These callbacks are INFORMATIONAL. Mutating the `layout` or items passed to the callback does NOT affect RGL's internal state. To override RGL's layout decision, you must call your own `setLayout()` and pass the result as the `layout` prop. RGL will sync from the prop on the next render cycle.

---

## Files You Can Ignore

| File | Why |
|---|---|
| `compact-compat.ts` | Legacy compat shim, not used in v2 |
| `ResponsiveGridLayout.tsx` | PCD uses `GridLayout` directly |
| `WidthProvider.tsx` | PCD uses `useContainerWidth` hook |
| `examples/` | Demo code, not relevant to PCD |
| `test/` | Test suite, useful for understanding behavior |
| `rfcs/` | Design docs for v2 migration |
