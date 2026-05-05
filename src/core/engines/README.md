# `core/engines` — Pluggable Collision Resolution Strategies

## Overview

This folder contains the **collision resolution engine layer** for the grid layout system. It defines the pluggable strategy interfaces for resolving widget overlaps during **drag** and **resize** operations, along with two concrete implementations:

- **Swap strategy** — for drag operations (dimension-matched widget swapping)
- **Squash-push strategy** — for resize operations (recursive squash-then-push cascade)

All strategies are **pure functions** that return a new layout or `null` (to reject the operation). None mutate their input layout.

---

## File Breakdown

### `types.ts` — Strategy Contracts & Shared Types

Defines the function-type contracts that all collision resolvers must satisfy, plus shared value types.

#### Exports

| Export | Kind | Description |
|---|---|---|
| `DragSlot` | `interface` | The origin grid slot (`{ x, y }`) a dragged widget came from. Used by drag resolvers to know where to teleport swap targets. |
| `DragCollisionResolver` | `type` (function) | Signature for drag collision resolvers: `(layout, draggedId, dragSlot) => LayoutItem[] \| null`. Returns a new resolved layout, or `null` to reject the move (brick-wall behavior). |
| `ResizeCollisionResolver` | `type` (function) | Signature for resize collision resolvers: `(layout, resizedId, oldItem, newItem, maxRows, cols) => LayoutItem[] \| null`. Returns a new resolved layout, or `null` to reject the resize (boundary hit). |

#### Immutability Contract

Both resolver types document that **implementations MUST NOT mutate the input layout**. This is a hard requirement for the undo/redo and state-diffing systems upstream.

---

### `swap-strategy.ts` — Dimension-Aware Widget Swapping (Drag)

A drag collision resolver. When a widget is dragged over another, this strategy attempts a clean positional swap—but only under strict conditions to prevent visual glitches.

#### Exports

| Export | Kind | Signature |
|---|---|---|
| `trySwap` | `function` | `(layout: LayoutItem[], draggedId: string, dragSlot: DragSlot) => LayoutItem[] \| null` |

#### Algorithm: The Three Rules

1. **Single-collision rule** — Exactly **one** widget must overlap the dragged widget. If zero or 2+ collisions exist, the move is rejected (`null`). Multi-collision = brick wall.
2. **Dimension-match rule** — The overlapping target must have the **exact same `w` and `h`** as the dragged widget. Without this, a small widget dragged onto a large one would "teleport" the target into a slot that doesn't fit, causing the **absorb bug** (widgets overlap and appear stuck).
3. **No secondary collisions** — After tentatively placing the target at the drag origin slot, a secondary collision check runs. If the swapped target would overlap any third widget, the swap is rejected.

#### Behavioral Notes

- Returns a **new array** (via `.map()`) — input layout is never mutated.
- The dragged widget's position is **not modified** by this function (it stays at its current drag position). Only the **target** is relocated to `dragSlot`.
- Depends on `getAllCollisions` from `../spatial/collision.js` for overlap detection.

---

### `squash-push-strategy.ts` — Recursive Squash-then-Push (Resize)

A resize collision resolver. When a widget is resized and overlaps neighbors, this strategy resolves collisions by first **squashing** overlapping targets (shrinking them toward `minH`/`minW`), then **pushing** any remaining overlap along the resize axis. The process recurses for chain reactions.

#### Exports

| Export | Kind | Signature |
|---|---|---|
| `inferResizeHandles` | `function` | `(oldItem: LayoutItem, newItem: LayoutItem) => ResizeAxes` |
| `resolveResizeCollisions` | `function` | `(layout: LayoutItem[], resizedId: string, oldItem: LayoutItem, newItem: LayoutItem, maxRows: number, cols: number) => LayoutItem[] \| null` |

#### `inferResizeHandles(oldItem, newItem) → ResizeAxes`

Deterministically infers which resize handle (N/S/E/W) is active by comparing old vs. new item geometry deltas.

| Delta Signature | Inferred Handle |
|---|---|
| `newItem.y < oldItem.y` | North (`"n"`) |
| `newItem.h > oldItem.h` (same y) | South (`"s"`) |
| `newItem.h < oldItem.h` AND `newItem.y > oldItem.y` | North (shrinking from top) |
| `newItem.x < oldItem.x` | West (`"w"`) |
| `newItem.w > oldItem.w` (same x) | East (`"e"`) |
| `newItem.w < oldItem.w` AND `newItem.x > oldItem.x` | West (shrinking from left) |

Returns `{ vertical: "n" | "s" | null, horizontal: "w" | "e" | null }`.

#### `resolveResizeCollisions(…) → LayoutItem[] | null`

The main public API. Steps:

1. **Clone** the layout, applying `newItem` geometry to the resized widget.
2. **Boundary check** on the resized source itself — reject immediately if already out of bounds.
3. **Infer direction** via `inferResizeHandles`.
4. If no collision-causing axis detected (e.g., a pure shrink from bottom/right), return the cloned layout with updated geometry.
5. **Resolve vertical axis** first, then **horizontal axis**, each via `resolveAxisCollisions`.
6. If any axis resolution hits a boundary, return `null` (reject the entire resize).

#### Internal: `resolveAxisCollisions` — The Recursive Core

This is the heart of the engine. It processes collisions along a single axis with a 4-phase pipeline:

| Phase | Name | Description |
|---|---|---|
| 1 | **Squash** | Reduce the target's size toward its `minH`/`minW`, absorbing as much penetration as possible. For south/east resizes, squashing eats the target's leading edge (top/left shifts inward). For north/west, squashing eats the trailing edge (size shrinks, position stays). |
| 2 | **Push** | Slide the target along the axis for any remaining penetration depth not absorbed by squashing. |
| 3 | **Boundary Check** | If the target exits the viewport (`maxRows` / `cols` / negative coords), abort the entire operation. |
| 4 | **Recurse** | If pushing created new overlap, compute the target's swept-edge band and recursively resolve downstream collisions. |

#### Internal: `penetrationDepth` — Directional Separation Distance

Calculates the **minimum displacement** in the push direction needed to fully separate a target from a source. Unlike intersection area (which underestimates for fully-contained widgets), penetration depth gives the exact clearance distance.

| Direction | Formula |
|---|---|
| South | `max(0, (source.y + source.h) - target.y)` |
| North | `max(0, (target.y + target.h) - source.y)` |
| East | `max(0, (source.x + source.w) - target.x)` |
| West | `max(0, (target.x + target.w) - source.x)` |

#### Swept Active-Edge Filtering

Collision candidates are filtered through a **swept active-edge interval overlap** check. Only targets whose bounding box intersects the `[sweptLo, sweptHi)` band (the region the expanding/moving edge swept through) are processed. This prevents the **backfire bug** — e.g., a south resize accidentally pushing a widget that only overlaps the top half.

#### Cycle Prevention & Safety Valves

| Mechanism | Purpose |
|---|---|
| **Monotonic push direction** | Each push moves targets strictly further in the push direction, so cycles cannot form under the directional separation invariant. |
| **Depth guard** | `depth > layout.length` → abort. Prevents stack overflow. |
| **Work budget** | `WorkBudget { remaining: number }` shared across all recursive branches. Caps total steps to `max(100, n² × 4)`. Prevents runaway processing in dense diamond-shaped cascade graphs. |
| **Empty swept-interval skip** | If `sweptLo >= sweptHi`, no edge movement occurred (pure squash, no translation). Recursion is skipped. |

---

### `index.ts` — Public Barrel

Re-exports the public API surface:

```ts
// Types
export type { DragSlot, DragCollisionResolver, ResizeCollisionResolver } from "./types.js";

// Strategies
export { trySwap } from "./swap-strategy.js";
export { resolveResizeCollisions, inferResizeHandles } from "./squash-push-strategy.js";
```

---

## Key Concepts & Architecture

### Strategy Pattern

The `engines` folder implements the **strategy pattern**. The type contracts (`DragCollisionResolver`, `ResizeCollisionResolver`) define the interface; the concrete files (`swap-strategy.ts`, `squash-push-strategy.ts`) provide implementations. Consumers (like the dashboard engine) select which strategy to use at runtime.

### Immutability as a Hard Requirement

Every strategy returns a **new layout array** or `null`. Input layouts are never mutated. This is critical for:
- React state management (referential equality checks)
- Undo/redo history
- Optimistic UI with rollback

### Rejection via `null`

Both strategies use `null` as a "reject" signal — meaning "this operation cannot be performed without violating constraints." The caller should treat `null` as "keep the previous layout unchanged" (brick-wall behavior).

---

## Dependencies

| Dependency | Source | Used By |
|---|---|---|
| `getAllCollisions` | `../spatial/collision.js` | `swap-strategy.ts`, `squash-push-strategy.ts` |
| `LayoutItem` | `../types/index.js` | All files |
| `DragSlot` | `./types.js` | `swap-strategy.ts` |
