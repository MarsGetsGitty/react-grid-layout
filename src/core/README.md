# `core/` — Grid Layout Engine Architecture

> Pure TypeScript layout algorithms and types. No React dependencies — can be used with any framework.

---

## Module Map

```mermaid
graph TD
    subgraph "core/"
        ENGINE["engine.ts\n(PhysicsEngine Facade)"]
        INDEX["index.ts\n(Public Barrel)"]

        subgraph "types/"
            TYPES["layout · events · config\nstrategies · responsive · utils"]
        end

        subgraph "spatial/"
            COLLISION["collision.ts\n(AABB overlap)"]
            SORT["sort.ts\n(layout ordering)"]
        end

        subgraph "math/"
            CALC["calculate.ts\n(grid ↔ pixel)"]
            RESIZE_GEOM["resize-geometry.ts\n(directional resize)"]
        end

        subgraph "layout/"
            QUERIES["queries.ts\n(bottom, getItem, statics)"]
            UTILS["utils.ts\n(clone, modify, validate)"]
            BOUNDS["bounds.ts\n(correctBounds)"]
            MOVEMENT["movement.ts\n(moveElement)"]
            RESPONSIVE["responsive.ts\n(breakpoints)"]
        end

        subgraph "strategies/"
            COMPACTORS["compactors.ts\n(vertical, horizontal, no, overlap)"]
            CONSTRAINTS["constraints.ts\n(gridBounds, minMax, aspect, snap)"]
            CSS["css-strategies.ts\n(transform, absolute, scaled)"]
        end

        subgraph "engines/"
            SWAP["swap-strategy.ts\n(trySwap)"]
            SQUASH["squash-push-strategy.ts\n(resolveResizeCollisions)"]
        end
    end

    TYPES --> COLLISION
    TYPES --> SORT
    TYPES --> CALC
    TYPES --> RESIZE_GEOM
    TYPES --> QUERIES
    TYPES --> UTILS
    TYPES --> BOUNDS
    TYPES --> MOVEMENT
    TYPES --> COMPACTORS
    TYPES --> CONSTRAINTS
    TYPES --> CSS
    TYPES --> SWAP
    TYPES --> SQUASH

    COLLISION --> BOUNDS
    COLLISION --> MOVEMENT
    COLLISION --> SWAP
    COLLISION --> SQUASH
    COLLISION --> COMPACTORS

    SORT --> MOVEMENT
    SORT --> COMPACTORS

    QUERIES --> UTILS
    QUERIES --> BOUNDS
    QUERIES --> COMPACTORS

    UTILS --> MOVEMENT
    UTILS --> COMPACTORS

    BOUNDS --> RESPONSIVE
    UTILS --> RESPONSIVE

    COMPACTORS --> RESPONSIVE

    ENGINE --> UTILS
    ENGINE --> BOUNDS
    ENGINE --> QUERIES
    ENGINE --> MOVEMENT
    ENGINE --> COLLISION
    ENGINE --> COMPACTORS

    style ENGINE fill:#4a9eff,color:#fff
    style TYPES fill:#6c757d,color:#fff
    style COLLISION fill:#28a745,color:#fff
    style SORT fill:#28a745,color:#fff
    style CALC fill:#fd7e14,color:#fff
    style RESIZE_GEOM fill:#fd7e14,color:#fff
    style COMPACTORS fill:#e83e8c,color:#fff
    style CONSTRAINTS fill:#e83e8c,color:#fff
    style CSS fill:#e83e8c,color:#fff
    style SWAP fill:#6f42c1,color:#fff
    style SQUASH fill:#6f42c1,color:#fff
```

---

## Dependency Hierarchy

The modules form a **clean DAG** (directed acyclic graph) with `types` at the root and `engine` at the top:

```mermaid
graph BT
    TYPES["types/"] --> SPATIAL["spatial/"]
    TYPES --> MATH["math/"]
    SPATIAL --> LAYOUT["layout/"]
    SPATIAL --> ENGINES["engines/"]
    SPATIAL --> STRATEGIES["strategies/"]
    LAYOUT --> STRATEGIES
    LAYOUT --> ENGINES
    LAYOUT --> ENGINE_FACADE["engine.ts"]
    SPATIAL --> ENGINE_FACADE
    STRATEGIES --> ENGINE_FACADE
    STRATEGIES --> LAYOUT

    style TYPES fill:#6c757d,color:#fff
    style SPATIAL fill:#28a745,color:#fff
    style MATH fill:#fd7e14,color:#fff
    style LAYOUT fill:#17a2b8,color:#fff
    style STRATEGIES fill:#e83e8c,color:#fff
    style ENGINES fill:#6f42c1,color:#fff
    style ENGINE_FACADE fill:#4a9eff,color:#fff
```

**Reading bottom-to-top:**
1. **`types/`** — Zero deps. Pure type definitions + default config constants.
2. **`spatial/`** — Depends only on types. AABB collision detection + sorting.
3. **`math/`** — Depends only on types. Grid↔pixel coordinate math.
4. **`layout/`** — Depends on types + spatial. Cloning, queries, bounds, movement.
5. **`strategies/`** — Depends on types + spatial + layout. Compactors, constraints, CSS.
6. **`engines/`** — Depends on types + spatial. Drag swap + resize squash-push.
7. **`engine.ts`** — Depends on layout + spatial + strategies. The PhysicsEngine facade.

---

## Data Flow: Drag Operation

What happens when a user drags a widget from position A to position B:

```mermaid
sequenceDiagram
    participant User
    participant React as React Component
    participant Math as math/
    participant Engine as engine.ts
    participant Layout as layout/movement
    participant Spatial as spatial/collision
    participant Compact as strategies/compactors
    participant Constraints as strategies/constraints

    User->>React: mousedown + mousemove
    React->>Math: calcXY(pixelTop, pixelLeft) → {x, y}
    React->>Constraints: applyPositionConstraints(x, y)
    Constraints-->>React: constrained {x, y}
    React->>Engine: moveItem(layout, id, x, y)

    Engine->>Layout: cloneLayout(layout)
    Engine->>Layout: moveElement(cloned, item, x, y)
    Layout->>Spatial: sortLayoutItems(layout, compactType)
    Layout->>Spatial: getAllCollisions(sorted, item)

    alt No collisions
        Layout-->>Engine: layout with moved item
    else Has collisions (normal)
        loop For each collision
            Layout->>Layout: moveElementAwayFromCollision()
        end
        Layout-->>Engine: layout with cascaded moves
    else Has collisions (preventCollision)
        Layout-->>Engine: original layout (reverted)
    else Has collisions (allowOverlap)
        Layout-->>Engine: cloned layout (items stack)
    end

    Engine->>Compact: compactor.compact(layout, cols)
    Compact->>Spatial: sortLayoutItems → collision checks
    Compact-->>Engine: compacted layout
    Engine-->>React: new Layout
    React->>Math: calcGridItemPosition(x, y, w, h) → pixels
    React-->>User: DOM updated
```

---

## Data Flow: Resize Operation

What happens when a user resizes a widget by dragging a handle:

```mermaid
sequenceDiagram
    participant User
    participant React as React Component
    participant Math as math/
    participant ResizeGeom as math/resize-geometry
    participant Constraints as strategies/constraints
    participant Engine as engine.ts
    participant Layout as layout/
    participant Spatial as spatial/collision
    participant Compact as strategies/compactors

    User->>React: drag resize handle
    React->>ResizeGeom: resizeItemInDirection(handle, current, new, containerWidth)
    ResizeGeom-->>React: clamped {top, left, width, height}
    React->>Math: calcWH(width, height, x, y, handle) → {w, h}
    React->>Math: calcXY(top, left) → {x, y} (for N/W handles)
    React->>Constraints: applySizeConstraints(w, h, handle)
    Constraints-->>React: constrained {w, h}
    React->>Engine: resizeItem(layout, id, w, h, x?, y?)

    Engine->>Layout: cloneLayout(layout)

    alt preventCollision mode
        Engine->>Spatial: getAllCollisions(clone, proposedItem)
        alt Collisions found
            Engine-->>React: unchanged layout (reject)
        end
    end

    Engine->>Layout: withLayoutItem(clone, id, applyNewDims)

    alt Position changed (N/W handles)
        Engine->>Layout: moveElement(resized, item, x, y)
        Layout->>Spatial: collision cascade
    end

    Engine->>Layout: correctBounds(layout, {cols})
    Engine->>Compact: compactor.compact(layout, cols)
    Engine-->>React: new Layout
    React->>Math: calcGridItemPosition → pixels
    React-->>User: DOM updated
```

---

## Data Flow: Custom Collision Resolution (Swap + Squash-Push)

When the app uses the `CollisionResolver` prop for custom physics:

```mermaid
sequenceDiagram
    participant React as React Component
    participant Math as math/
    participant SwapEngine as engines/swap-strategy
    participant SquashEngine as engines/squash-push-strategy
    participant Spatial as spatial/collision

    Note over React: Drag tick — widget moved to new position
    React->>Math: calcXY(pixel) → grid {x, y}

    rect rgb(230, 230, 250)
        Note over React,SwapEngine: Drag Collision Resolution
        React->>SwapEngine: trySwap(layout, draggedId, dragSlot)
        SwapEngine->>Spatial: getAllCollisions(layout, dragged)

        alt 0 or 2+ collisions
            SwapEngine-->>React: null (brick wall)
        else 1 collision, dimensions don't match
            SwapEngine-->>React: null (brick wall)
        else 1 collision, dimensions match
            SwapEngine->>Spatial: getAllCollisions(tentative, swapped)
            alt Secondary collisions
                SwapEngine-->>React: null (reject)
            else Clean swap
                SwapEngine-->>React: new layout with swap
            end
        end
    end

    rect rgb(255, 230, 230)
        Note over React,SquashEngine: Resize Collision Resolution
        React->>SquashEngine: resolveResizeCollisions(layout, id, old, new, maxRows, cols)
        SquashEngine->>SquashEngine: inferResizeHandles(old, new)
        SquashEngine->>SquashEngine: clone layout + apply new geometry

        loop For each axis (vertical, then horizontal)
            SquashEngine->>Spatial: getAllCollisions + swept-edge filter

            loop For each collision target
                Note over SquashEngine: Phase 1: Squash toward minH/minW
                Note over SquashEngine: Phase 2: Push remaining displacement
                Note over SquashEngine: Phase 3: Boundary check
                Note over SquashEngine: Phase 4: Recurse for chain reactions
            end
        end

        alt All resolved within bounds
            SquashEngine-->>React: new layout
        else Boundary hit at any point
            SquashEngine-->>React: null (reject entire resize)
        end
    end
```

---

## Data Flow: Responsive Breakpoint Change

What happens when the container width crosses a breakpoint threshold:

```mermaid
sequenceDiagram
    participant Window as Browser Resize
    participant React as ResponsiveGridLayout
    participant Responsive as layout/responsive
    participant Layout as layout/
    participant Compact as strategies/compactors

    Window->>React: container width changed
    React->>Responsive: getBreakpointFromWidth(breakpoints, width)
    Responsive-->>React: newBreakpoint (e.g., "md")

    alt Breakpoint unchanged
        React-->>React: no-op
    else Breakpoint changed
        React->>Responsive: getColsFromBreakpoint("md", cols)
        Responsive-->>React: colCount (e.g., 10)
        React->>Responsive: findOrGenerateResponsiveLayout(layouts, breakpoints, "md", lastBP, 10, compactor)

        alt Layout exists for "md"
            Responsive->>Layout: cloneLayout(layouts["md"])
            Responsive-->>React: cloned layout
        else No layout for "md"
            Responsive->>Responsive: search upward for nearest layout
            Responsive->>Layout: cloneLayout(nearestLayout)
            Responsive->>Layout: correctBounds(cloned, {cols: 10})
            Responsive->>Compact: compactor.compact(corrected, 10)
            Responsive-->>React: adapted layout
        end

        React-->>React: setState + fire onBreakpointChange
    end
```

---

## Data Flow: Compaction Pipeline

How the vertical compactor processes a layout after any change:

```mermaid
flowchart TD
    INPUT["Input Layout"] --> CLONE["cloneLayout()"]
    CLONE --> STATICS["getStatics() → compareWith[]"]
    STATICS --> SORT["sortLayoutItemsByRowCol()"]
    SORT --> LOOP{"For each\nnon-static item"}

    LOOP --> CLONE_ITEM["cloneLayoutItem()"]
    CLONE_ITEM --> FIX_NEG["Fix negative x, y"]
    FIX_NEG --> CAP_Y["Cap y to maxY"]
    CAP_Y --> MOVE_UP{"Move up\nwhile y > 0 &&\nno collision"}

    MOVE_UP -->|"No collision"| DEC_Y["y--"]
    DEC_Y --> MOVE_UP
    MOVE_UP -->|"Collision or y=0"| RESOLVE{"Collision\nexists?"}

    RESOLVE -->|"Yes"| PUSH_DOWN["resolveCompactionCollision()\ny = collision.y + collision.h"]
    PUSH_DOWN --> RESOLVE
    RESOLVE -->|"No"| FINALIZE["Add to compareWith\nUpdate maxY\nClear moved flag"]

    FINALIZE --> LOOP
    LOOP -->|"All items done"| OUTPUT["Output: compacted Layout\n(original array order restored)"]

    style INPUT fill:#6c757d,color:#fff
    style OUTPUT fill:#28a745,color:#fff
    style MOVE_UP fill:#fd7e14,color:#fff
    style RESOLVE fill:#e83e8c,color:#fff
    style PUSH_DOWN fill:#e83e8c,color:#fff
```

---

## Data Flow: Constraint Pipeline

How position and size constraints are applied during drag/resize:

```mermaid
flowchart LR
    subgraph "Grid-Level Constraints (applied first)"
        GC1["gridBounds\n(clamp to grid)"]
        GC2["minMaxSize\n(per-item min/max)"]
        GC3["snapToGrid(2)\n(optional)"]
    end

    subgraph "Item-Level Constraints (applied second)"
        IC1["aspectRatio(16/9)\n(item.constraints)"]
        IC2["boundedY\n(item.constraints)"]
    end

    INPUT["Proposed\n{x, y, w, h}"] --> GC1
    GC1 --> GC2
    GC2 --> GC3
    GC3 --> IC1
    IC1 --> IC2
    IC2 --> OUTPUT["Constrained\n{x, y, w, h}"]

    style INPUT fill:#6c757d,color:#fff
    style OUTPUT fill:#28a745,color:#fff
    style GC1 fill:#4a9eff,color:#fff
    style GC2 fill:#4a9eff,color:#fff
    style GC3 fill:#4a9eff,color:#fff
    style IC1 fill:#e83e8c,color:#fff
    style IC2 fill:#e83e8c,color:#fff
```

Each constraint receives the **output of the previous one** — it's a pipeline, not parallel application. Order matters.

---

## The PhysicsEngine Facade

`engine.ts` is the **top-level orchestrator**. It wraps all the lower-level modules into a clean, immutable API. Every method follows the same pattern:

```mermaid
flowchart LR
    INPUT["Input Layout\n(immutable)"] --> CLONE["cloneLayout()"]
    CLONE --> OPERATION["Core Operation\n(move, resize, add, remove)"]
    OPERATION --> NORMALIZE["correctBounds()\n+ compactor.compact()"]
    NORMALIZE --> OUTPUT["Output Layout\n(new immutable array)"]

    style INPUT fill:#6c757d,color:#fff
    style CLONE fill:#fd7e14,color:#fff
    style OPERATION fill:#4a9eff,color:#fff
    style NORMALIZE fill:#e83e8c,color:#fff
    style OUTPUT fill:#28a745,color:#fff
```

**Immutability invariant**: The input layout is **never** mutated. `cloneLayout()` always runs first.

### PhysicsEngine API

| Method | Pipeline | Description |
|---|---|---|
| `initializeLayout(layout)` | clone → correctBounds → compact | Normalize a raw layout for initial render. |
| `moveItem(layout, id, x, y)` | clone → moveElement → compact | Drag a widget, cascade collisions, compact. |
| `resizeItem(layout, id, w, h, x?, y?)` | clone → collision check → withLayoutItem → moveElement? → correctBounds → compact | Resize a widget with optional reposition. |
| `addItem(layout, item)` | clone → dedup → append → correctBounds → compact | Add a widget (auto-deduplicates by ID). |
| `removeItem(layout, id)` | clone → filter → compact | Remove a widget and fill gaps. |
| `compact(layout)` | clone → correctBounds → compact | Re-compact after manual mutations. |
| `bottom(layout)` | — | Query: highest occupied row. |
| `getItem(layout, id)` | — | Query: find item by ID. |

---

## Subfolder Quick Reference

| Folder | Purpose | Key Exports | README |
|---|---|---|---|
| [`types/`](./types/) | Type definitions & config defaults | `LayoutItem`, `Layout`, `Compactor`, `LayoutConstraint`, `PositionStrategy`, `GridConfig` | [README](./types/README.md) |
| [`spatial/`](./spatial/) | Collision detection & sorting | `collides`, `getAllCollisions`, `getFirstCollision`, `sortLayoutItems` | [README](./spatial/README.md) |
| [`math/`](./math/) | Grid ↔ pixel coordinate math | `calcGridItemPosition`, `calcXY`, `calcWH`, `resizeItemInDirection` | [README](./math/README.md) |
| [`layout/`](./layout/) | Layout manipulation & queries | `cloneLayout`, `moveElement`, `correctBounds`, `bottom`, `findOrGenerateResponsiveLayout` | [README](./layout/README.md) |
| [`strategies/`](./strategies/) | Compactors, constraints, CSS | `verticalCompactor`, `gridBounds`, `applyPositionConstraints`, `transformStrategy` | [README](./strategies/README.md) |
| [`engines/`](./engines/) | Collision resolution strategies | `trySwap`, `resolveResizeCollisions`, `inferResizeHandles` | [README](./engines/README.md) |

---

## Design Principles

### 1. Pure Functions, No Side Effects
Every function in `core/` is a pure function (with explicit exceptions noted in each README). Given the same inputs, you always get the same outputs. This makes the engine testable, predictable, and framework-agnostic.

### 2. Immutability by Default
`Layout` is `readonly LayoutItem[]`. Functions that need to mutate use `Mutable<LayoutItem>` casts and document it clearly. The PhysicsEngine facade enforces the immutability boundary — inputs are never mutated.

### 3. Strategy Pattern Everywhere
Three pluggable strategy families (compactors, constraints, CSS positioning) all follow the same pattern: define an interface in `types/`, provide built-in implementations in `strategies/`, let consumers swap at runtime.

### 4. Composition Over Configuration
Constraints pipeline through in array order. Compactors are selected per-grid. CSS strategies are swappable per-grid. Per-item overrides (`item.constraints`, `item.isDraggable`, etc.) compose with grid-level settings.

### 5. Tree-Shakeability
Each strategy is an independent export. Unused compactors, constraints, and CSS strategies are eliminated by bundlers. The `wrapCompactor` is deliberately in `extras/` to avoid bloating `core/`.
