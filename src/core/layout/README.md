# `core/layout` — Layout Manipulation, Queries & Responsive Breakpoints

## Overview

This folder contains the **layout data layer** — pure functions for querying, cloning, validating, transforming, bounding, and moving layout items, plus the responsive breakpoint system. These are the workhorses that every other layer (compaction, engines, React components) calls into.

The folder is split across five domain files:

| File | Domain |
|---|---|
| `queries.ts` | Read-only lookups on layout arrays |
| `utils.ts` | Cloning, replacing, transforming, and validating layout items |
| `bounds.ts` | Enforcing grid boundary constraints |
| `movement.ts` | Moving items with collision detection and cascading resolution |
| `responsive.ts` | Breakpoint resolution, layout generation across breakpoints, margin/padding helpers |

---

## File Breakdown

### `queries.ts` — Read-Only Layout Lookups

Simple, zero-mutation helpers for inspecting a layout.

#### Exports

| Export | Kind | Signature | Description |
|---|---|---|---|
| `bottom` | `function` | `(layout: Layout) => number` | Returns the bottom-most Y coordinate of the layout (the `y + h` of the lowest item). Returns `0` for an empty layout. Useful for calculating container height. |
| `getLayoutItem` | `function` | `(layout: Layout, id: string) => LayoutItem \| undefined` | Finds a layout item by its `i` property. Linear scan. Returns `undefined` if not found. |
| `getStatics` | `function` | `(layout: Layout) => LayoutItem[]` | Filters the layout to return only items with `static === true`. Static items cannot be moved or resized by the user. |

---

### `utils.ts` — Cloning, Replacing, Transforming & Validating

Immutable layout manipulation primitives. These are the building blocks that higher-level operations compose.

#### Exports

| Export | Kind | Signature | Description |
|---|---|---|---|
| `cloneLayoutItem` | `function` | `(layoutItem: LayoutItem) => LayoutItem` | Creates a shallow copy of a single layout item. All properties are preserved. Boolean properties (`moved`, `static`) are **normalized** — `undefined` becomes `false` via `Boolean()`. |
| `cloneLayout` | `function` | `(layout: Layout) => LayoutItem[]` | Clones an entire layout by cloning each item individually via `cloneLayoutItem`. Returns a new array. Pre-allocates the array to `layout.length` for performance. |
| `modifyLayout` | `function` | `(layout: Layout, layoutItem: LayoutItem) => LayoutItem[]` | Replaces a single item in the layout (matched by `i` property). Returns a **new array** — the replaced item is the provided `layoutItem`, all other items are kept by reference (not cloned). |
| `withLayoutItem` | `function` | `(layout: Layout, itemKey: string, cb: (item: LayoutItem) => LayoutItem) => [LayoutItem[], LayoutItem \| null]` | Find-clone-transform-replace in one call. Finds the item by `itemKey`, clones it, passes the clone to `cb`, and returns a tuple of `[newLayout, modifiedItem]`. If the item is not found, returns `[[...layout], null]`. |
| `validateLayout` | `function` | `(layout: Layout, contextName?: string) => void` | Validates that every item in the layout has numeric `x`, `y`, `w`, `h` properties (not `NaN`). Also checks that `i` is a string if present. **Throws** with a descriptive error message on failure. |

#### Behavioral Notes

- `cloneLayoutItem` copies the following properties: `i`, `x`, `y`, `w`, `h`, `minW`, `maxW`, `minH`, `maxH`, `moved`, `static`, `isDraggable`, `isResizable`, `resizeHandles`, `constraints`, `isBounded`.
- `modifyLayout` does **not** deep-clone non-target items — they are kept by reference. Only the target item is replaced.
- `withLayoutItem` is the preferred high-level API for "modify one item in the layout" operations, since it handles clone + replace atomically.

---

### `bounds.ts` — Grid Boundary Enforcement

#### Exports

| Export | Kind | Signature | Description |
|---|---|---|---|
| `correctBounds` | `function` | `(layout: Mutable<LayoutItem>[], bounds: { cols: number }) => LayoutItem[]` | Ensures all layout items fit within the grid column count. Returns the same array reference (for chaining). |

#### Algorithm

For each item in the layout:

1. **Overflow right** — If `x + w > cols`, clamp `x` to `cols - w` (shift left).
2. **Overflow left** — If `x < 0`, set `x = 0` and `w = cols` (stretch to full width).
3. **Static-on-static collision** — If the item is static and collides with another static item, increment `y` until no collision (push down).

#### ⚠️ Mutation Warning

This function **mutates layout items in place** for performance. The type signature uses `Mutable<LayoutItem>[]` to make this explicit. Callers should `cloneLayout()` first if immutability is needed.

#### Dependencies

- `getStatics` from `./queries.js` — to find static items for collision checking
- `getFirstCollision` from `../spatial/collision.js` — for static-on-static overlap detection

---

### `movement.ts` — Item Movement with Collision Resolution

The primary movement system used during drag operations. Handles cascading collision resolution where moving one item can push others.

#### Exports

| Export | Kind | Signature | Description |
|---|---|---|---|
| `moveElement` | `function` | `(layout, l, x, y, isUserAction, preventCollision, compactType, cols, allowOverlap?) => LayoutItem[]` | Move a layout item to a new position. Handles collision detection and cascading movements. Does **not** compact — call `compact()` separately. |
| `moveElementAwayFromCollision` | `function` | `(layout, collidesWith, itemToMove, isUserAction, compactType, cols) => LayoutItem[]` | Move an item away from a collision. Tries up/left first, then falls back to down/right. |

#### `moveElement` — Full Behavior

| Scenario | Behavior |
|---|---|
| Item is `static` (and not `isDraggable`) | Returns `[...layout]` (no-op). |
| Position unchanged (`x === l.x && y === l.y`) | Returns `[...layout]` (no-op, short-circuit). |
| `allowOverlap === true` and collisions exist | Returns `cloneLayout(layout)` — items are allowed to stack. |
| `preventCollision === true` and collisions exist | **Reverts** position to `oldX/oldY`, returns the **same layout reference** (signal: no change occurred). |
| Normal collision | Iterates collisions. If the colliding item is static, moves the **dragged** item away. If non-static, moves the **collider** away. Uses `moveElementAwayFromCollision` recursively. |

##### Movement direction logic

The layout is sorted via `sortLayoutItems` before processing. If the item is moving **up** (vertical compact, `oldY >= y`) or **left** (horizontal compact, `oldX >= x`), the sorted order is reversed so items are processed from bottom-to-top / right-to-left.

##### ⚠️ Mutation Warning

`moveElement` **mutates the `l` parameter directly** — it sets `l.x`, `l.y`, and `l.moved`. Callers should pass a cloned item if the original must be preserved.

#### `moveElementAwayFromCollision` — Collision Escape Logic

Attempts to find free space for `itemToMove` to escape `collidesWith`:

1. **Try up/left first** (only on the first user-action collision):
   - Creates a **fake item** positioned at `collidesWith.y - itemToMove.h` (vertical) or `collidesWith.x - itemToMove.w` (horizontal).
   - If no collision at the fake position → move there.
   - If collision exists and it's north + vertical compact → nudge item down by 1.
   - If collision exists and it's north + `compactType === null` (free-form) → swap Y positions.
   - If collision exists and it's west + horizontal compact → move the `collidesWith` item instead.
2. **Fallback: move down/right by 1** — nudge `y + 1` (vertical) or `x + 1` (horizontal).

#### Dependencies

- `getAllCollisions`, `getFirstCollision` from `../spatial/collision.js`
- `sortLayoutItems` from `../spatial/sort.js`
- `cloneLayout` from `./utils.js`

---

### `responsive.ts` — Responsive Breakpoints & Layout Generation

Handles multi-breakpoint layout systems (e.g., `lg`, `md`, `sm`, `xs`). Supports both legacy `CompactType` strings and the new `Compactor` interface.

#### Exports

| Export | Kind | Signature | Description |
|---|---|---|---|
| `sortBreakpoints` | `function` | `<B>(breakpoints: Breakpoints<B>) => B[]` | Sorts breakpoint names by their width values, ascending. E.g., `['xxs', 'xs', 'sm', 'md', 'lg']`. |
| `getBreakpointFromWidth` | `function` | `<B>(breakpoints: Breakpoints<B>, width: number) => B` | Given a container width in pixels, returns the highest breakpoint whose threshold is below that width. Throws if no breakpoints are defined. |
| `getColsFromBreakpoint` | `function` | `<B>(breakpoint: B, cols: Breakpoints<B>) => number` | Looks up the column count for a breakpoint from a breakpoint→cols map. Throws if the breakpoint is missing. |
| `findOrGenerateResponsiveLayout` | `function` | `<B>(layouts, breakpoints, breakpoint, lastBreakpoint, cols, compactTypeOrCompactor) => Layout` | Returns a layout for the target breakpoint. If one exists, returns a clone. Otherwise, **generates** one by finding the nearest larger breakpoint's layout, cloning it, correcting bounds for the new column count, and compacting. |
| `getIndentationValue` | `function` | `<B>(value: IndentationValue<B>, breakpoint: B) => readonly [number, number]` | Resolves a margin or padding value that can be either a fixed `[x, y]` tuple or a breakpoint-specific map `{ lg: [x, y], md: [x, y] }`. Falls back to the first defined value in the map, then to `[10, 10]`. |

#### `findOrGenerateResponsiveLayout` — Layout Resolution Strategy

```
Exact match? → clone & return
     ↓ no
Last breakpoint has layout? → use as base
     ↓ no
Search breakpoints ABOVE target (ascending) → use first found as base
     ↓
Clone base → correctBounds(cols) → compactor.compact() → return
```

Supports dual input for the compactor parameter:
- **Legacy**: `CompactType` string (`"vertical"`, `"horizontal"`, `null`) → resolved via `getCompactor()`.
- **Modern**: A `Compactor` object with a `.compact()` method.

#### Internal Types

| Type | Definition | Description |
|---|---|---|
| `IndentationValue<B>` | `readonly [number, number] \| Partial<Record<B, readonly [number, number]>>` | Union type for margin/padding: either a fixed tuple or a per-breakpoint map. |

#### Dependencies

- `cloneLayout`, `correctBounds` from `./index.js`
- `getCompactor` from `../strategies/index.js`

---

### `index.ts` — Public Barrel

Re-exports everything from `queries`, `utils`, `bounds`, and `movement`:

```ts
export * from "./queries.js";
export * from "./utils.js";
export * from "./bounds.js";
export * from "./movement.js";
```

> **Note**: `responsive.ts` is **not** re-exported from the barrel. It is imported directly by the responsive grid component.

---

## Key Concepts & Architecture

### Mutation Boundaries

This folder has a clear split between **immutable** and **mutable** functions:

| Immutable (returns new data) | Mutable (modifies in place) |
|---|---|
| `cloneLayout`, `cloneLayoutItem`, `modifyLayout`, `withLayoutItem` | `correctBounds` (mutates items), `moveElement` (mutates the moved item `l`) |

The mutable functions document their mutation behavior explicitly via JSDoc and use the `Mutable<LayoutItem>` type to signal intent.

### Movement vs. Compaction

`moveElement` handles **collision resolution only** — it pushes items out of the way but does not compact gaps. Compaction is a separate pass (`compact()` from `../strategies/`). This separation is intentional: movement must be immediate during drag, while compaction runs after the drag ends.

### Responsive Layout Cascade

When a breakpoint has no saved layout, `findOrGenerateResponsiveLayout` cascades upward to find the nearest larger breakpoint's layout and adapts it to the new column count. This ensures users always see a reasonable layout even at breakpoints they haven't explicitly configured.

---

## Dependencies

| Dependency | Source | Used By |
|---|---|---|
| `getAllCollisions` | `../spatial/collision.js` | `movement.ts` |
| `getFirstCollision` | `../spatial/collision.js` | `bounds.ts`, `movement.ts` |
| `sortLayoutItems` | `../spatial/sort.js` | `movement.ts` |
| `getCompactor` | `../strategies/index.js` | `responsive.ts` |
| `LayoutItem`, `Layout`, `CompactType`, `Mutable`, `Compactor`, `Breakpoint`, `Breakpoints`, `ResponsiveLayouts` | `../types/index.js` | All files |
