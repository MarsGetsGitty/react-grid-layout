# `core/spatial` — Collision Detection & Layout Sorting

## Overview

This folder contains the **spatial primitives** — the lowest-level geometric operations that nearly every other module in `core` depends on. Two concerns live here:

1. **Collision detection** — axis-aligned bounding box (AABB) overlap tests between layout items.
2. **Sorting** — ordering layout items by position for deterministic compaction and collision processing.

These are pure, stateless functions with zero side effects.

| File | Domain |
|---|---|
| `collision.ts` | AABB collision detection: pairwise, first-match, and all-match |
| `sort.ts` | Layout sorting by row/col or col/row, driven by compaction type |

---

## File Breakdown

### `collision.ts` — AABB Collision Detection

The fundamental overlap detection used by every system that needs to know if two widgets intersect: compaction, drag movement, swap strategy, squash-push strategy, and bounds correction.

#### Exports

| Export | Kind | Signature | Description |
|---|---|---|---|
| `collides` | `function` | `(l1: LayoutItem, l2: LayoutItem) => boolean` | Check if two layout items overlap. Returns `false` if they are the same item (matched by `i`). |
| `getFirstCollision` | `function` | `(layout: Layout, layoutItem: LayoutItem) => LayoutItem \| undefined` | Linear scan — returns the **first** item in the layout that overlaps `layoutItem`, or `undefined` if none. |
| `getAllCollisions` | `function` | `(layout: Layout, layoutItem: LayoutItem) => LayoutItem[]` | Returns **all** items in the layout that overlap `layoutItem`. May return an empty array. |

#### `collides` — AABB Overlap Algorithm

Uses the **separating axis theorem** (simplified for axis-aligned rectangles). Two items do NOT collide if any of these gaps exist:

| Check | Meaning |
|---|---|
| `l1.x + l1.w <= l2.x` | `l1` is entirely left of `l2` |
| `l1.x >= l2.x + l2.w` | `l1` is entirely right of `l2` |
| `l1.y + l1.h <= l2.y` | `l1` is entirely above `l2` |
| `l1.y >= l2.y + l2.h` | `l1` is entirely below `l2` |

If none of these hold, the bounding boxes overlap → collision.

**Self-collision guard**: `l1.i === l2.i` → always returns `false`. This prevents an item from colliding with itself when checking against a layout that contains it.

#### Performance Notes

- `getFirstCollision` uses an early-exit `for` loop — O(n) worst case but often terminates early.
- `getAllCollisions` uses `.filter()` — always O(n), returns a new array.
- No spatial indexing (quadtree, etc.) is used. For typical dashboard layouts (< 50 items), linear scan is sufficient.

---

### `sort.ts` — Layout Sorting by Compaction Direction

Provides deterministic ordering of layout items, which is critical for compaction and collision resolution to produce consistent results regardless of the original array order.

#### Exports

| Export | Kind | Signature | Description |
|---|---|---|---|
| `sortLayoutItems` | `function` | `(layout: Layout, compactType: CompactType) => LayoutItem[]` | Sort layout items based on the active compaction type. Returns a **new array** (never mutates the original). |
| `sortLayoutItemsByRowCol` | `function` | `(layout: Layout) => LayoutItem[]` | Sort by row (`y`) ascending, then column (`x`) ascending. Top-left to bottom-right, row by row. Natural reading order. |
| `sortLayoutItemsByColRow` | `function` | `(layout: Layout) => LayoutItem[]` | Sort by column (`x`) ascending, then row (`y`) ascending. Top-left to bottom-right, column by column. |

#### `sortLayoutItems` — Dispatch Table

| `compactType` | Sort Order | Rationale |
|---|---|---|
| `"vertical"` | Row-Col (`sortLayoutItemsByRowCol`) | Process top rows first so items compact upward correctly. |
| `"horizontal"` | Col-Row (`sortLayoutItemsByColRow`) | Process left columns first so items compact leftward correctly. |
| `"wrap"` | Row-Col (`sortLayoutItemsByRowCol`) | Wrap mode uses reading order (left-to-right, top-to-bottom). |
| `null` (no compaction) | Original order (shallow copy via `[...layout]`) | No sorting needed — free-form layout. Still returns a copy for immutability. |

#### Immutability

All sort functions use `[...layout].sort(...)` — they spread into a new array before sorting, so the input layout is never mutated.

---

### `index.ts` — Public Barrel

```ts
export * from "./collision.js";
export * from "./sort.js";
```

---

## Key Concepts & Architecture

### Why Sorting Matters

Compaction and collision resolution are **order-dependent** operations. Processing items in the wrong order can produce different (incorrect) layouts. For example:
- In vertical compaction, items must be processed top-to-bottom so that upper items compact first and lower items can settle above them.
- In horizontal compaction, items must be processed left-to-right for the same reason.

### This Folder is the Dependency Root

`spatial` has **zero internal dependencies** within `core` (it only imports types). Every other subfolder depends on it:

| Consumer | Uses |
|---|---|
| `engines/swap-strategy.ts` | `getAllCollisions` |
| `engines/squash-push-strategy.ts` | `getAllCollisions` |
| `layout/bounds.ts` | `getFirstCollision` |
| `layout/movement.ts` | `getAllCollisions`, `getFirstCollision`, `sortLayoutItems` |
| `strategies/` (compactors) | `collides`, `getFirstCollision`, `sortLayoutItems`, `sortLayoutItemsByRowCol` |

This makes `spatial` the **leaf dependency** of the core module graph — it can be tested and reasoned about in complete isolation.

---

## Dependencies

| Dependency | Source | Used By |
|---|---|---|
| `Layout`, `LayoutItem` | `../types/index.js` | `collision.ts` |
| `CompactType`, `Layout`, `LayoutItem` | `../types/index.js` | `sort.ts` |

No other internal `core` modules are imported.
