# `core/math` — Grid ↔ Pixel Coordinate Math & Resize Geometry

## Overview

This folder contains the **coordinate math layer** — pure functions that convert between **grid units** (column/row indices) and **pixel positions**, plus the directional resize geometry system. These are the low-level math primitives that the React components (`GridItem`, `GridLayout`) call during render, drag, and resize to translate between the abstract grid model and the DOM.

| File | Domain |
|---|---|
| `calculate.ts` | Grid ↔ pixel conversions, position calculations, grid background dimensions |
| `resize-geometry.ts` | Directional resize with container-boundary clamping |

---

## File Breakdown

### `calculate.ts` — Grid ↔ Pixel Conversion Engine

The core math for the entire grid system. Every pixel position on screen is derived from these functions.

#### Exports

| Export | Kind | Signature | Description |
|---|---|---|---|
| `PositionParams` | `interface` | — | Configuration bundle: `margin`, `containerPadding`, `containerWidth`, `cols`, `rowHeight`, `maxRows`. All readonly. Passed to every calc function. |
| `calcGridColWidth` | `function` | `(positionParams: PositionParams) => number` | Calculate the width of a single grid column in pixels. |
| `calcGridItemWHPx` | `function` | `(gridUnits: number, colOrRowSize: number, marginPx: number) => number` | Convert a grid-unit dimension (w or h) to pixels. Generic — works for both axes. |
| `calcGridItemPosition` | `function` | `(positionParams, x, y, w, h, dragPosition?, resizePosition?) => Position` | Calculate full pixel position `{ top, left, width, height }` for a grid item. |
| `calcXY` | `function` | `(positionParams, top, left, w, h) => { x, y }` | Translate pixel coordinates to grid units. **Clamped** to grid bounds. |
| `calcXYRaw` | `function` | `(positionParams, top, left) => { x, y }` | Translate pixel coordinates to grid units. **Unclamped** — for use with the constraint system. |
| `calcWH` | `function` | `(positionParams, width, height, x, y, handle) => { w, h }` | Calculate grid units from pixel dimensions. **Clamped** per resize handle direction. |
| `calcWHRaw` | `function` | `(positionParams, width, height) => { w, h }` | Calculate grid units from pixel dimensions. **Unclamped**, minimum 1. For use with the constraint system. |
| `clamp` | `function` | `(num, lowerBound, upperBound) => number` | Generic numeric clamp utility. |
| `GridCellDimensions` | `interface` | — | Output of `calcGridCellDimensions`: `cellWidth`, `cellHeight`, `offsetX`, `offsetY`, `gapX`, `gapY`, `cols`, `containerWidth`. |
| `GridCellConfig` | `interface` | — | Input config for `calcGridCellDimensions`: `width`, `cols`, `rowHeight`, `margin?`, `containerPadding?`. |
| `calcGridCellDimensions` | `function` | `(config: GridCellConfig) => GridCellDimensions` | Calculate all measurements needed to render a visual grid background/overlay aligned with actual grid cells. |

#### Key Formulas

##### Column Width

```
colWidth = (containerWidth - margin[0] * (cols - 1) - containerPadding[0] * 2) / cols
```

##### Grid Units → Pixels (dimension)

```
pixels = round(colOrRowSize * gridUnits + max(0, gridUnits - 1) * marginPx)
```

Special case: if `gridUnits` is not finite (e.g., `Infinity` for unconstrained max), it's returned as-is to avoid `0 * Infinity === NaN`.

##### Grid Units → Pixels (position)

```
left = round((colWidth + margin[0]) * x + containerPadding[0])
top  = round((rowHeight + margin[1]) * y + containerPadding[1])
```

##### Pixels → Grid Units (position)

```
x = round((left - containerPadding[0]) / (colWidth + margin[0]))
y = round((top - containerPadding[1]) / (rowHeight + margin[1]))
```

##### Pixels → Grid Units (dimension)

```
w = round((width + margin[0]) / (colWidth + margin[0]))
h = round((height + margin[1]) / (rowHeight + margin[1]))
```

#### `calcGridItemPosition` — Detailed Behavior

This is the primary render-time function. Its behavior depends on what interaction is active:

| State | Width/Height source | Top/Left source |
|---|---|---|
| Idle (no drag, no resize) | Computed from grid units | Computed from grid units |
| Dragging | Computed from grid units | Exact pixel position from drag callback |
| Resizing | Exact pixel dimensions from resize callback | Exact pixel position from resize callback |

##### Rounding Margin Fix

When idle (no drag/resize), a **rounding compensation pass** runs. Due to `Math.round()`, the gap between adjacent items can differ from the expected margin (e.g., 0px or 2px instead of 1px). The fix:

1. Calculate where the next sibling item would start.
2. Measure the actual gap between this item's edge and the sibling's start.
3. Adjust `width`/`height` so the gap matches the configured `margin`.

This only applies when `w`/`h` are finite (not `Infinity`).

#### `calcWH` — Handle-Aware Clamping

Standard clamping limits `w` to `cols - x` and `h` to `maxRows - y` (can't exceed remaining space to the right/bottom). But:

- **West handles** (`sw`, `w`, `nw`): `w` is clamped to `cols` (full width), because the item's `x` will shift left.
- **North handles** (`nw`, `n`, `ne`): `h` is clamped to `maxRows` (full height), because the item's `y` will shift up.

#### Clamped vs. Raw Variants

| Clamped (`calcXY`, `calcWH`) | Raw (`calcXYRaw`, `calcWHRaw`) |
|---|---|
| Enforces grid boundary limits | No boundary limits applied |
| Used by default drag/resize | Used by the **constraint system** for custom boundary control |
| `w`/`h` params needed for clamping | No `w`/`h`/`x`/`y` params needed |
| Min value: 0 | Min value: 0 (position) or 1 (dimension, Raw only) |

---

### `resize-geometry.ts` — Directional Resize with Container Clamping

Handles the pixel-level geometry of resizing an item from any of the 8 edges/corners (N, NE, E, SE, S, SW, W, NW), ensuring the item stays within the container.

#### Exports

| Export | Kind | Signature | Description |
|---|---|---|---|
| `resizeItemInDirection` | `function` | `(direction: ResizeHandleAxis, currentSize: Position, newSize: Position, containerWidth: number) => Position` | Resize an item from a specific edge/corner, clamping to container bounds. Returns constrained `{ top, left, width, height }`. |

#### Architecture: Handler Map Pattern

Each direction has a dedicated `ResizeHandler` function. Compound directions (corners) compose two cardinal handlers:

```
resizeNorthEast = resizeNorth(currentSize, resizeEast(...))
resizeNorthWest = resizeNorth(currentSize, resizeWest(...))
resizeSouthEast = resizeSouth(currentSize, resizeEast(...))
resizeSouthWest = resizeSouth(currentSize, resizeWest(...))
```

All 8 handlers are registered in a `resizeHandlerMap: Record<ResizeHandleAxis, ResizeHandler>` for O(1) lookup.

#### Cardinal Direction Behavior

| Direction | Position Logic | Constraints Applied |
|---|---|---|
| **North** | `top = currentTop - (newHeight - currentHeight)` (grows upward) | If `top < 0`, height reverts to current (can't grow above container). Top clamped to 0. |
| **South** | `top` and `left` pass through from `newSize` | If `top < 0`, height reverts to current. Top clamped to 0. |
| **East** | `top`, `height` pass through from `newSize` | If `left + newWidth > containerWidth`, width reverts to current (can't overflow right). Left clamped to 0. |
| **West** | `left = currentLeft + currentWidth - newWidth` (grows leftward) | If `left < 0`, width = `currentLeft + currentWidth` (fill to left edge), `left = 0`. |

#### Internal Constraint Functions

| Function | Purpose |
|---|---|
| `constrainWidth(left, currentWidth, newWidth, containerWidth)` | Rejects `newWidth` if `left + newWidth > containerWidth`. |
| `constrainHeight(top, currentHeight, newHeight)` | Rejects `newHeight` if `top < 0`. |
| `constrainLeft(left)` | `Math.max(0, left)` |
| `constrainTop(top)` | `Math.max(0, top)` |

#### Internal Types

| Type | Definition | Description |
|---|---|---|
| `ResizeHandler` | `(currentSize: Position, newSize: Position, containerWidth: number) => Position` | Function signature for all direction handlers. |

---

### `index.ts` — Public Barrel

```ts
export * from "./calculate.js";
export * from "./resize-geometry.js";
```

---

## Key Concepts & Architecture

### Grid Coordinate System

The grid uses a **column/row integer coordinate system** internally. All items have `{ x, y, w, h }` in grid units. The `math` layer converts these to/from pixel positions for DOM rendering and mouse event translation.

### Dual API: Clamped vs. Raw

The folder provides paired variants of conversion functions:
- **Clamped** (`calcXY`, `calcWH`) — enforce grid boundaries, used by default interactions.
- **Raw** (`calcXYRaw`, `calcWHRaw`) — no boundary enforcement, used by the constraint system for custom boundary logic (e.g., bounded drag regions).

### Composition for Corner Resizes

Corner resize handlers are **composed from cardinal handlers** rather than implementing independent logic. This means `resizeNorthEast` applies east constraints first, then north constraints on the result. This guarantees consistent behavior and avoids duplicated constraint logic.

---

## Dependencies

| Dependency | Source | Used By |
|---|---|---|
| `Position` | `../types/index.js` | `calculate.ts`, `resize-geometry.ts` |
| `ResizeHandleAxis` | `../types/index.js` | `calculate.ts`, `resize-geometry.ts` |
