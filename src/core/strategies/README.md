# `core/strategies` — Compactors, Constraints & CSS Positioning

## Overview

This folder contains the **pluggable strategy layer** — the three families of composable, tree-shakeable strategies that control how the grid behaves:

1. **Compactors** — how gaps between items are filled after drag/resize operations.
2. **Constraints** — position and size limits enforced during drag/resize interactions.
3. **CSS Strategies** — how grid items are positioned in the DOM (transform vs. top/left).

All strategies implement typed interfaces from `../types/` and are designed for composition and swapping at runtime.

| File | Domain |
|---|---|
| `compactors.ts` | 6 built-in compactor instances + factory + single-item compact helpers |
| `constraints.ts` | 5 built-in constraints + 4 constraint factories + application pipeline |
| `css-strategies.ts` | 3 CSS positioning strategies + style generation utilities |

---

## File Breakdown

### `compactors.ts` — Pluggable Gap-Filling Strategies

Implements the `Compactor` interface. Compactors run after every layout change to remove vertical/horizontal gaps.

#### Compactor Instances

| Export | Kind | `type` | `allowOverlap` | Behavior |
|---|---|---|---|---|
| `verticalCompactor` | `const` | `"vertical"` | `false` | Moves items upward to fill vertical gaps. **Default mode.** |
| `horizontalCompactor` | `const` | `"horizontal"` | `false` | Moves items leftward to fill horizontal gaps. Wraps to next row on overflow. |
| `noCompactor` | `const` | `null` | `false` | Free-form — items stay where placed. Only clones + clears `moved` flags. |
| `verticalOverlapCompactor` | `const` | `"vertical"` | `true` | Like `verticalCompactor` but allows overlapping. `compact()` only clones + clears flags (no movement). |
| `horizontalOverlapCompactor` | `const` | `"horizontal"` | `true` | Like `horizontalCompactor` but allows overlapping. `compact()` only clones + clears flags. |
| `noOverlapCompactor` | `const` | `null` | `true` | Free-form + overlap allowed. Inherits `noCompactor.compact()`. |

#### Factory

| Export | Kind | Signature | Description |
|---|---|---|---|
| `getCompactor` | `function` | `(compactType: CompactType, allowOverlap?: boolean, preventCollision?: boolean) => Compactor` | Legacy compatibility factory. Resolves a `CompactType` string to the appropriate compactor instance. For `"wrap"` type, returns `noCompactor` (users should import `wrapCompactor` from `extras` instead — it's tree-shakeable). If `preventCollision` is true, spreads it onto the returned compactor. |

#### Single-Item Compact Helpers (Exported for Custom Compactors)

| Export | Kind | Signature | Description |
|---|---|---|---|
| `resolveCompactionCollision` | `function` | `(layout, item, moveToCoord, axis, hasStatics?) => void` | Recursively resolves collisions during compaction. When moving `item` to `moveToCoord`, checks if that causes overlaps and cascades resolution. **Mutates items in place.** |
| `compactItemVertical` | `function` | `(compareWith, l, fullLayout, maxY) => LayoutItem` | Compact a single item upward. Corrects negative positions, moves up as far as possible, then resolves collisions downward. **Mutates `l`.** |
| `compactItemHorizontal` | `function` | `(compareWith, l, cols, fullLayout) => LayoutItem` | Compact a single item leftward. Handles row-wrapping when `x + w > cols`. **Mutates `l`.** |

#### Vertical Compaction Algorithm

```
1. Collect static items as initial compareWith set
2. Sort layout by row-col (top-left to bottom-right)
3. For each non-static item:
   a. Clone item
   b. compactItemVertical: move up until collision or y=0
   c. Resolve any collisions by pushing down
   d. Track maxY for next item's starting limit
   e. Add to compareWith set
4. Restore original array order (items at their original indices)
5. Clear all `moved` flags
```

#### Horizontal Compaction Algorithm

Same structure as vertical but:
- Sort by col-row instead of row-col.
- `compactItemHorizontal` moves left instead of up.
- On overflow (`x + w > cols`): clamp `x` to `cols - w`, increment `y` (row wrap), then re-attempt leftward movement.

#### `moved` Flag Clearing

All compactors **must** clear `item.moved = false` after compaction. This flag is set by `moveElement` during drag to prevent re-processing already-moved items. If not cleared, items become "stuck" in subsequent drag frames.

---

### `constraints.ts` — Composable Position & Size Constraints

Implements the `LayoutConstraint` interface. Constraints are applied in array order (pipeline), enabling composition.

#### Built-in Constraint Instances

| Export | Kind | Name | Position? | Size? | Description |
|---|---|---|---|---|---|
| `gridBounds` | `const` | `"gridBounds"` | ✅ | ✅ | Clamps items within `[0, cols-w]` × `[0, maxRows-h]`. Handle-aware for size: west handles can expand to full column width, north handles to full row height. |
| `minMaxSize` | `const` | `"minMaxSize"` | ❌ | ✅ | Enforces per-item `minW`/`maxW`/`minH`/`maxH` properties. Defaults: min=1, max=Infinity. |
| `containerBounds` | `const` | `"containerBounds"` | ✅ | ❌ | Like `gridBounds` but calculates visible rows from actual `containerHeight` instead of `maxRows`. Falls back to `maxRows` for auto-height grids (containerHeight=0). Replaces legacy `isBounded` prop. |
| `boundedX` | `const` | `"boundedX"` | ✅ | ❌ | Only constrains horizontal position. Vertical is unconstrained. |
| `boundedY` | `const` | `"boundedY"` | ✅ | ❌ | Only constrains vertical position. Horizontal is unconstrained. |

#### Constraint Factories

| Export | Kind | Signature | Description |
|---|---|---|---|
| `aspectRatio` | `function` | `(ratio: number) => LayoutConstraint` | Maintains a fixed width-to-height ratio **in pixels** during resize. Accounts for different pixel sizes of columns vs. rows by converting grid units → pixels → applying ratio → converting back. Width is the independent variable; height is derived. |
| `snapToGrid` | `function` | `(stepX: number, stepY?: number) => LayoutConstraint` | Snaps positions to multiples of `stepX`/`stepY`. Throws if step ≤ 0. Useful for coarser grid alignment. |
| `minSize` | `function` | `(minW: number, minH: number) => LayoutConstraint` | Grid-wide minimum size without needing per-item `minW`/`minH`. |
| `maxSize` | `function` | `(maxW: number, maxH: number) => LayoutConstraint` | Grid-wide maximum size without needing per-item `maxW`/`maxH`. |

#### Default Constraints

| Export | Kind | Value |
|---|---|---|
| `defaultConstraints` | `const` | `[gridBounds, minMaxSize]` — applied when no constraints are explicitly specified. |

#### Constraint Application Pipeline

| Export | Kind | Signature | Description |
|---|---|---|---|
| `applyPositionConstraints` | `function` | `(constraints, item, x, y, context) => { x, y }` | Applies all position constraints in order: **grid-level first**, then **per-item** (`item.constraints`). Each constraint receives the output of the previous one. |
| `applySizeConstraints` | `function` | `(constraints, item, w, h, handle, context) => { w, h }` | Same pipeline for size constraints. Grid-level first, then per-item. |

#### Constraint Application Order

```
Grid-level constraints[0].constrainPosition → ... → Grid-level constraints[n].constrainPosition
  ↓
Item-level constraints[0].constrainPosition → ... → Item-level constraints[m].constrainPosition
  ↓
Final { x, y }
```

This means:
- Grid-level `gridBounds` runs first to enforce grid limits.
- Per-item `snapToGrid(2)` runs after, snapping within those limits.
- Order matters: `[snapToGrid(2), gridBounds]` snaps first then clamps; `[gridBounds, snapToGrid(2)]` clamps first then snaps.

#### `gridBounds.constrainSize` — Handle-Aware Logic

| Handle Direction | Max Width | Max Height |
|---|---|---|
| East-side (`e`, `ne`, `se`) | `cols - item.x` | — |
| West-side (`w`, `nw`, `sw`) | `item.x + item.w` (right edge position) | — |
| South-side (`s`, `se`, `sw`) | — | `maxRows - item.y` |
| North-side (`n`, `nw`, `ne`) | — | `item.y + item.h` (bottom edge position) |

This allows west/north resizes to expand into the space behind the item's current position.

#### `aspectRatio` — Pixel-Accurate Formula

```
colWidth   = (containerWidth - margin[0] * (cols - 1)) / cols
pixelWidth = colWidth * w + margin[0] * max(0, w - 1)
pixelHeight = pixelWidth / ratio
h = max(1, round((pixelHeight + margin[1]) / (rowHeight + margin[1])))
```

Width (`w`) is the independent variable. Height (`h`) is derived to maintain the pixel-space aspect ratio.

---

### `css-strategies.ts` — DOM Positioning Strategies

Controls how grid items are rendered in the DOM — via CSS transforms or absolute positioning.

#### Style Generation Functions

| Export | Kind | Signature | Description |
|---|---|---|---|
| `setTransform` | `function` | `(pos: Position) => Record<string, string>` | Generates `translate(Xpx, Ypx)` CSS with vendor prefixes (`WebkitTransform`, `MozTransform`, `msTransform`, `OTransform`). Sets `position: absolute`, `width`, `height`. More performant — avoids layout recalculations. |
| `setTopLeft` | `function` | `(pos: Position) => Record<string, string>` | Generates `top`/`left`/`width`/`height` CSS. Sets `position: absolute`. Use when transforms cause issues (printing, child element positioning). |
| `perc` | `function` | `(num: number) => string` | Converts a number to a percentage string (e.g., `0.5` → `"50%"`). |

#### Position Strategy Instances

| Export | Kind | `type` | `scale` | Description |
|---|---|---|---|---|
| `transformStrategy` | `const` | `"transform"` | `1` | CSS transform positioning. **Default strategy.** |
| `absoluteStrategy` | `const` | `"absolute"` | `1` | CSS top/left positioning. |
| `defaultPositionStrategy` | `const` | — | — | Alias for `transformStrategy`. |

#### Strategy Factory

| Export | Kind | Signature | Description |
|---|---|---|---|
| `createScaledStrategy` | `function` | `(scale: number) => PositionStrategy` | Creates a transform strategy that compensates for a parent `transform: scale(N)`. The `calcDragPosition` method divides client coordinates by the scale factor so drag positions are accurate inside scaled containers. |

#### `createScaledStrategy` — Drag Position Compensation

```ts
calcDragPosition(clientX, clientY, offsetX, offsetY) {
  return {
    left: (clientX - offsetX) / scale,
    top:  (clientY - offsetY) / scale
  };
}
```

Without this, dragging inside a `transform: scale(0.5)` container would move items at double the expected speed.

---

### `index.ts` — Public Barrel

```ts
export * from "./compactors.js";
export * from "./constraints.js";
export * from "./css-strategies.js";
```

---

## Key Concepts & Architecture

### Strategy Pattern (Everywhere)

All three files implement the strategy pattern:
- **Compactors** satisfy the `Compactor` interface (`{ type, allowOverlap, compact() }`).
- **Constraints** satisfy the `LayoutConstraint` interface (`{ name, constrainPosition?, constrainSize? }`).
- **CSS Strategies** satisfy the `PositionStrategy` interface (`{ type, scale, calcStyle(), calcDragPosition? }`).

Consumers select strategies at the grid or item level without knowing the implementation details.

### Composition & Ordering

Constraints are **composable** — you can stack multiple constraints in an array and they pipeline through in order. This is more flexible than a single monolithic constraint function and enables per-item overrides via `item.constraints`.

### Tree-Shakeability

Each strategy is an independent export. Bundlers can tree-shake unused strategies:
- If you only use vertical compaction, `horizontalCompactor` and all overlap variants are eliminated.
- The `wrapCompactor` is deliberately **not** in this file — it lives in `extras/` to avoid bloating the core bundle.

### Mutation Discipline

- **Compactors** mutate cloned items during compaction (performance optimization). The `compact()` method always clones the layout first.
- **Constraints** are pure — they return new `{ x, y }` / `{ w, h }` objects without mutation.
- **CSS strategies** are pure — they return new style objects.

---

## Dependencies

| Dependency | Source | Used By |
|---|---|---|
| `Compactor`, `CompactType`, `Layout`, `LayoutItem`, `Mutable` | `../types/index.js` | `compactors.ts` |
| `LayoutConstraint`, `ConstraintContext`, `ResizeHandleAxis` | `../types/index.js` | `constraints.ts` |
| `Position`, `PartialPosition`, `PositionStrategy` | `../types/index.js` | `css-strategies.ts` |
| `collides`, `getFirstCollision` | `../spatial/index.js` | `compactors.ts` |
| `sortLayoutItemsByRowCol`, `sortLayoutItemsByColRow` | `../spatial/index.js` | `compactors.ts` |
| `bottom`, `cloneLayoutItem`, `getStatics`, `cloneLayout` | `../layout/index.js` | `compactors.ts` |
| `React` (type only) | `react` | `css-strategies.ts` |
