# GridItem → GridLayout Callback Chain

## How mouse events become layout changes

The chain has 3 layers: DOM → GridItem → GridLayout.

```
User grabs widget
    ↓
react-draggable fires DraggableCore.onStart
    ↓
GridItem.onDragStart (line 372)
    ├── Calculates pixel position relative to offsetParent
    ├── Converts pixels → grid units via calcXYRaw()
    ├── Applies constraints via applyPositionConstraints()
    └── Calls GridLayout.onDragStart(i, newX, newY, {e, node, newPosition})
```

### Drag (every mouse-move tick)

```
react-draggable fires DraggableCore.onDrag with deltaX, deltaY
    ↓
GridItem.onDrag (line 455)
    ├── Accumulates delta: top += deltaY, left += deltaX
    ├── If isBounded: clamps pixel position to container edges
    ├── Converts pixels → raw grid units via calcXYRaw()
    ├── Applies constraints via applyPositionConstraints()
    │   ├── Grid-level constraints (e.g., gridBounds, minMaxSize)
    │   └── Per-item constraints (item.constraints[])
    └── Calls GridLayout.onDrag(i, newX, newY, {e, node, newPosition})
            ↓
        GridLayout.onDrag (line 527)
            ├── Gets item `l` from layoutRef.current
            ├── Calls moveElement(layout, l, x, y, true, preventCollision, ...)
            │   ├── Mutates l.x, l.y directly
            │   ├── Checks for collisions via getAllCollisions()
            │   └── Resolves based on allowOverlap / preventCollision flags
            ├── Fires external onDragProp callback
            └── setLayout(compactor.compact(newLayout, cols))
```

### Resize (every mouse-move tick)

```
react-resizable fires onResize with {node, size, handle}
    ↓
GridItem.onResizeHandler (line 614)
    ├── Calls resizeItemInDirection(handle, position, size, containerWidth)
    │   └── Adjusts position for directional handles (sw, w, nw, n, ne)
    ├── Converts pixels → raw grid units via calcWHRaw()
    ├── Applies size constraints via applySizeConstraints()
    │   ├── Grid-level constraints
    │   └── Per-item constraints
    └── Calls GridLayout.onResize(i, newW, newH, {e, node, size, handle})
            ↓
        GridLayout.onResize (line 631)
            ├── Uses withLayoutItem to clone and apply new w, h
            ├── Calculates newX, newY for directional handles (sw, w, nw, n, ne)
            ├── COLLISION CHECK (only if preventCollision && !allowOverlap):
            │   └── If collision: REVERTS all changes
            ├── If shouldMoveItem: moveElement(layout, l, newX, newY, ...)
            ├── Fires external onResizeProp callback
            └── setLayout(compactor.compact(finalLayout, cols))
```

## Key observation: WHERE constraints are applied

Constraints are applied in **GridItem**, NOT in GridLayout:

```
GridItem (constraints pipeline)
    ↓ already-constrained x, y, w, h values
GridLayout (collision/compaction pipeline)
```

This means by the time GridLayout sees the x, y, w, h values, they've already been clamped by gridBounds and minMaxSize. GridLayout then handles collision detection and layout compaction independently.
