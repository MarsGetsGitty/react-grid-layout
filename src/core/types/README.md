# `core/types` — Type Definitions & Configuration Defaults

## Overview

This folder is the **type foundation** for the entire grid system. It contains all TypeScript interfaces, type aliases, configuration shapes, event signatures, and strategy contracts. Every other `core` subfolder imports types from here — this is a **pure type module** with zero runtime logic (except for default configuration constants).

| File | Domain |
|---|---|
| `layout.ts` | `LayoutItem`, `Layout`, `ResizeHandleAxis` — the core data model |
| `events.ts` | Position shapes, drag/resize event data, callback signatures |
| `config.ts` | Grid/drag/resize/drop configuration interfaces + defaults |
| `strategies.ts` | `Compactor`, `PositionStrategy`, `LayoutConstraint`, `ConstraintContext` contracts |
| `responsive.ts` | Breakpoint types and responsive layout maps |
| `utils.ts` | Generic utility types (`Mutable`, `DeepPartial`, `ArrayElement`) |

---

## File Breakdown

### `layout.ts` — Core Data Model

The foundational types that define what a grid item is and what a layout is.

#### Exports

| Export | Kind | Description |
|---|---|---|
| `ResizeHandleAxis` | `type` | Union of 8 resize handle positions: `"n"`, `"s"`, `"e"`, `"w"`, `"ne"`, `"nw"`, `"se"`, `"sw"`. |
| `LayoutItem` | `interface` | A single grid item with position, size, constraints, and behavior flags. |
| `Layout` | `type` | `readonly LayoutItem[]` — an array of layout items, treated as immutable. |

#### `LayoutItem` — Full Property Reference

| Property | Type | Required | Description |
|---|---|---|---|
| `i` | `string` | ✅ | Unique identifier for this item. |
| `x` | `number` | ✅ | X position in grid units (0-indexed from left). |
| `y` | `number` | ✅ | Y position in grid units (0-indexed from top). |
| `w` | `number` | ✅ | Width in grid units. |
| `h` | `number` | ✅ | Height in grid units. |
| `minW` | `number` | ❌ | Minimum width in grid units. Defaults to `1` in constraints. |
| `minH` | `number` | ❌ | Minimum height in grid units. Defaults to `1` in constraints. |
| `maxW` | `number` | ❌ | Maximum width in grid units. Defaults to `Infinity` in constraints. |
| `maxH` | `number` | ❌ | Maximum height in grid units. Defaults to `Infinity` in constraints. |
| `static` | `boolean` | ❌ | If true, item cannot be dragged or resized. Other items compact around it. |
| `isDraggable` | `boolean` | ❌ | Per-item drag override. `false` disables drag. Overrides grid-level `isDraggable`. |
| `isResizable` | `boolean` | ❌ | Per-item resize override. `false` disables resize. Overrides grid-level `isResizable`. |
| `resizeHandles` | `ResizeHandleAxis[]` | ❌ | Which resize handles to show. Overrides grid-level `resizeHandles`. |
| `isBounded` | `boolean` | ❌ | If true, item is constrained to container bounds. Overrides grid-level `isBounded`. |
| `moved` | `boolean` | ❌ | **@internal** — Set during drag/resize to indicate the item has moved. Must be cleared after compaction. |
| `constraints` | `LayoutConstraint[]` | ❌ | Per-item constraints applied after grid-level constraints. |

---

### `events.ts` — Positions, Events & Callbacks

All the types related to pixel-space geometry, DOM events, and user-facing callbacks.

#### Position Types

| Export | Kind | Properties | Description |
|---|---|---|---|
| `Position` | `interface` | `left`, `top`, `width`, `height` | Full pixel position and size of an element. Used everywhere for DOM positioning. |
| `PartialPosition` | `interface` | `left`, `top` | Pixel coordinates only (no size). Used during drag for cursor position. |
| `Size` | `interface` | `width`, `height` | Pixel dimensions only (no position). |
| `DroppingPosition` | `interface` | `left`, `top`, `e` (Event) | Position when dropping an external element onto the grid. |

#### Drag/Resize Event Data

| Export | Kind | Properties | Description |
|---|---|---|---|
| `ReactDraggableCallbackData` | `interface` | `node`, `x?`, `y?`, `deltaX`, `deltaY`, `lastX?`, `lastY?` | Data provided by react-draggable during drag operations. |
| `GridDragEvent` | `interface` | `e`, `node`, `newPosition` (PartialPosition) | Grid-level drag event data. |
| `GridResizeEvent` | `interface` | `e`, `node`, `size` (Size), `handle` (ResizeHandleAxis) | Grid-level resize event data. |
| `DragOverEvent` | `interface` | Extends `MouseEvent` with `nativeEvent.layerX/Y` | Drag-over event with layer coordinates for external drop. |

#### Callback Signatures

| Export | Kind | Signature | Description |
|---|---|---|---|
| `EventCallback` | `type` | `(layout, oldItem, newItem, placeholder, event, element) => void` | Standard callback for drag/resize start, drag, stop events. All items can be `null` depending on context. |
| `OnLayoutChangeCallback` | `type` | `(layout: Layout) => void` | Simplified callback fired whenever layout changes for any reason. |

#### Collision Resolver

| Export | Kind | Signature | Description |
|---|---|---|---|
| `CollisionResolverContext` | `interface` | `{ cols, compactType? }` | Context passed to custom collision resolvers. |
| `CollisionResolver` | `type` | `(layout, movedItem, originalPosition, context?) => Layout \| null` | Custom drag collision resolver. Return new layout to accept move, `null` to reject (ghost follows cursor, widget stays at last valid position). Called on each drag tick instead of the default `moveElement → compact` pipeline. |

---

### `config.ts` — Configuration Interfaces & Defaults

Grouped configuration objects for grid metrics, drag, resize, and drop behaviors. Each interface has a corresponding exported default constant.

#### Grid Configuration

| Export | Kind | Description |
|---|---|---|
| `GridConfig` | `interface` | Grid metrics: `cols`, `rowHeight`, `margin`, `containerPadding`, `maxRows`. |
| `defaultGridConfig` | `const` | `{ cols: 12, rowHeight: 150, margin: [10, 10], containerPadding: null, maxRows: Infinity }` |

**Note**: `containerPadding: null` means "use margin values as padding" — the component layer resolves this.

#### Drag Configuration

| Export | Kind | Description |
|---|---|---|
| `DragConfig` | `interface` | `enabled`, `bounded`, `handle?` (CSS selector), `cancel?` (CSS selector), `threshold` (min px before drag starts). |
| `defaultDragConfig` | `const` | `{ enabled: true, bounded: false, threshold: 3 }` |

**`threshold: 3`** — Minimum 3 pixels of movement before a drag begins. This distinguishes click from drag (fixes issues #1341, #1401).

#### Resize Configuration

| Export | Kind | Description |
|---|---|---|
| `ResizeConfig` | `interface` | `enabled`, `handles` (which edges/corners), `handleComponent?` (custom React component or render function). |
| `defaultResizeConfig` | `const` | `{ enabled: true, handles: ["se"] }` |

**`handleComponent`** supports two forms:
- `React.ReactNode` — a static component used for all handles.
- `(axis: ResizeHandleAxis, ref: React.Ref<HTMLElement>) => React.ReactNode` — a render function receiving the handle axis and a ref that must be attached to the DOM element.

#### Drop Configuration

| Export | Kind | Description |
|---|---|---|
| `DropConfig` | `interface` | `enabled`, `defaultItem` (`{ w, h }`), `onDragOver?` callback. |
| `defaultDropConfig` | `const` | `{ enabled: false, defaultItem: { w: 1, h: 1 } }` |

**`onDragOver`** can return:
- `{ w?, h?, dragOffsetX?, dragOffsetY? }` — override dimensions and cursor offset.
- `false` — reject the drop.
- `void` — accept with defaults.

---

### `strategies.ts` — Strategy Contracts

The interface definitions that `strategies/` implementations satisfy.

#### Exports

| Export | Kind | Description |
|---|---|---|
| `CompactType` | `type` | `"horizontal" \| "vertical" \| "wrap" \| null` — the four compaction modes. |
| `Compactor` | `interface` | Contract for compaction strategies. |
| `PositionStrategy` | `interface` | Contract for CSS positioning strategies. |
| `ConstraintContext` | `interface` | Runtime context passed to constraint functions during drag/resize. |
| `LayoutConstraint` | `interface` | Contract for position/size constraint strategies. |

#### `Compactor` Interface

| Property | Type | Description |
|---|---|---|
| `type` | `CompactType` (readonly) | Identifies the compaction mode. |
| `allowOverlap` | `boolean` (readonly) | If true, items can stack and compaction is effectively skipped. |
| `preventCollision` | `boolean` (readonly, optional) | If true (and `allowOverlap` is false), movement into occupied space is blocked (brick-wall). |
| `compact()` | `(layout: Layout, cols: number) => Layout` | Perform compaction. Must return a new layout. |

#### `PositionStrategy` Interface

| Property | Type | Description |
|---|---|---|
| `type` | `"transform" \| "absolute"` (readonly) | Identifies the CSS positioning method. |
| `scale` | `number` (readonly) | Scale factor for drag/resize coordinate calculations. |
| `calcStyle()` | `(pos: Position) => React.CSSProperties` | Convert pixel position to CSS style object. |
| `calcDragPosition()` | Optional: `(clientX, clientY, offsetX, offsetY) => PartialPosition` | Custom drag coordinate calculation (e.g., for scaled containers). |

#### `ConstraintContext` Interface

| Property | Type | Description |
|---|---|---|
| `cols` | `number` | Grid column count. |
| `maxRows` | `number` | Maximum rows (`Infinity` if unbounded). |
| `containerWidth` | `number` | Container width in pixels. |
| `containerHeight` | `number` | Container height in pixels (0 for auto-height grids). |
| `rowHeight` | `number` | Row height in pixels. |
| `margin` | `readonly [number, number]` | `[x, y]` margin between items in pixels. |
| `layout` | `Layout` | Current layout state (for collision-aware constraints). |

#### `LayoutConstraint` Interface

| Property | Type | Description |
|---|---|---|
| `name` | `string` (readonly) | Identifier for debugging. |
| `constrainPosition()` | Optional: `(item, x, y, context) => { x, y }` | Constrain position during drag. Called after grid-unit conversion, before layout update. |
| `constrainSize()` | Optional: `(item, w, h, handle, context) => { w, h }` | Constrain size during resize. Called after grid-unit conversion, before layout update. |

Both methods are optional — a constraint can implement only position, only size, or both.

---

### `responsive.ts` — Responsive Breakpoint Types

Types for the responsive breakpoint system. All generic over `B extends Breakpoint` to allow custom breakpoint name strings.

#### Exports

| Export | Kind | Description |
|---|---|---|
| `Breakpoint` | `type` | `string` — a breakpoint name (e.g., `"lg"`, `"md"`, `"sm"`). |
| `Breakpoints<B>` | `type` | `Record<B, number>` — maps breakpoint names to pixel width thresholds. |
| `BreakpointCols<B>` | `type` | `Record<B, number>` — maps breakpoint names to column counts. |
| `ResponsiveLayouts<B>` | `type` | `Partial<Record<B, Layout>>` — maps breakpoint names to layouts. `Partial` because not all breakpoints need a saved layout. |
| `OnBreakpointChangeCallback<B>` | `type` | `(newBreakpoint: B, cols: number) => void` — fired when the active breakpoint changes. |

---

### `utils.ts` — Generic Utility Types

Three general-purpose TypeScript utility types used throughout the codebase.

#### Exports

| Export | Kind | Definition | Description |
|---|---|---|---|
| `Mutable<T>` | `type` | `{ -readonly [P in keyof T]: T[P] }` | Strips `readonly` from all properties. Used to cast `LayoutItem` to a mutable form in functions that intentionally mutate (e.g., `correctBounds`, `moveElement`). |
| `DeepPartial<T>` | `type` | `{ [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P] }` | Makes all properties and nested properties optional. Useful for partial configuration overrides. |
| `ArrayElement<T>` | `type` | `T extends readonly (infer U)[] ? U : never` | Extracts the element type from an array type. |

---

### `index.ts` — Public Barrel

```ts
export * from "./layout.js";
export * from "./events.js";
export * from "./config.js";
export * from "./strategies.js";
export * from "./responsive.js";
export * from "./utils.js";
```

---

## Key Concepts & Architecture

### Pure Types + Default Constants

This folder is almost entirely type-level — no runtime functions. The only runtime exports are the four `default*Config` constants (`defaultGridConfig`, `defaultDragConfig`, `defaultResizeConfig`, `defaultDropConfig`), which provide sensible defaults for the component layer.

### Strategy Contracts as Interfaces

The three strategy interfaces (`Compactor`, `PositionStrategy`, `LayoutConstraint`) are defined here but **implemented** in `../strategies/`. This separation ensures:
- Types can be imported without pulling in implementation code.
- Custom implementations can satisfy the interface without depending on built-in strategies.
- Tree-shaking works correctly — unused strategies are eliminated.

### Generic Responsive Types

The responsive types (`Breakpoints<B>`, `ResponsiveLayouts<B>`, etc.) are generic over `B extends Breakpoint`. This allows consumers to use either the default `string`-based breakpoints or define a strict union (e.g., `type MyBreakpoint = "lg" | "md" | "sm"`) for compile-time safety.

### `Layout` is `readonly`

`Layout` is defined as `readonly LayoutItem[]`, enforcing that layout arrays should not be mutated. Functions that need to mutate must explicitly cast via `Mutable<LayoutItem>` — this makes mutation points visible in the codebase.

---

## Dependencies

This folder has **zero internal `core` dependencies** (except one circular reference: `layout.ts` imports `LayoutConstraint` from `strategies.ts`, and `strategies.ts` imports `LayoutItem`/`ResizeHandleAxis` from `layout.ts`). The only external dependency is `React` (type-only import for `React.CSSProperties`, `React.ReactNode`, `React.Ref`).

| Dependency | Source | Used By |
|---|---|---|
| `React` (type only) | `react` | `config.ts`, `strategies.ts` |
