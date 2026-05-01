# Constraint System

## Overview

Constraints are composable, pluggable functions that limit position and/or size during drag/resize. They run inside **GridItem** (NOT GridLayout) before the layout update.

## Architecture

```
constraints: LayoutConstraint[]  (grid-level, from props)
item.constraints: LayoutConstraint[]  (per-item, from layout definition)

┌─────────────────────┐
│  applyPositionConstraints(constraints, item, x, y, context)  │
│  ├── for each grid constraint: constrainPosition()           │
│  └── for each item constraint: constrainPosition()           │
└─────────────────────┘

┌─────────────────────┐
│  applySizeConstraints(constraints, item, w, h, handle, context)  │
│  ├── for each grid constraint: constrainSize()                   │
│  └── for each item constraint: constrainSize()                   │
└─────────────────────┘
```

## Built-in Constraints

| Name | Position? | Size? | What it does |
|------|-----------|-------|-------------|
| `gridBounds` | ✅ | ✅ | Clamps x,y to [0, cols-w] and [0, maxRows-h]. Clamps w,h to grid edge. |
| `minMaxSize` | ❌ | ✅ | Enforces per-item `minW/maxW/minH/maxH`. |
| `containerBounds` | ✅ | ❌ | Like gridBounds but uses actual container pixel height instead of maxRows. |
| `boundedX` | ✅ | ❌ | Only clamps x-axis. |
| `boundedY` | ✅ | ❌ | Only clamps y-axis. |

## Constraint Factories

| Factory | Creates | Usage |
|---------|---------|-------|
| `aspectRatio(ratio)` | Size constraint | `aspectRatio(16/9)` - maintains pixel aspect ratio |
| `snapToGrid(stepX, stepY)` | Position constraint | `snapToGrid(2)` - snaps to every 2 grid units |
| `minSize(minW, minH)` | Size constraint | Grid-wide minimum |
| `maxSize(maxW, maxH)` | Size constraint | Grid-wide maximum |

## Default Constraints

```typescript
export const defaultConstraints: LayoutConstraint[] = [gridBounds, minMaxSize];
```

If no `constraints` prop is passed, `gridBounds` + `minMaxSize` are applied.

## ConstraintContext

Every constraint receives a context object:

```typescript
interface ConstraintContext {
  cols: number;              // Grid columns
  maxRows: number;           // Max rows (Infinity if unbounded)
  containerWidth: number;    // Container px width
  containerHeight: number;   // Container px height (0 for auto-height)
  rowHeight: number;         // Row px height
  margin: [number, number];  // [horizontal, vertical] margin
  layout: Layout;            // Current layout state
}
```

**Important:** The `layout` field in the context is accessed via `layoutRef.current` inside callbacks to avoid infinite re-render loops (#2210).

## Constraint vs Collision

These are **two separate systems** that should NOT be confused:

| System | Where | When | What it does |
|--------|-------|------|-------------|
| **Constraints** | GridItem | Before layout update | Clamps proposed position/size to valid range |
| **Collision** | GridLayout (moveElement) | After layout update | Detects overlaps and resolves them (push/block/allow) |

Constraints prevent impossible positions (e.g., x < 0, w > cols).
Collision handles what happens when two items occupy the same space.
