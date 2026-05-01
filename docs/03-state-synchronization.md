# State Synchronization (Controlled Layout Model)

## The Loop

PCD uses RGL in **controlled mode**: layout state lives outside RGL, passed in via the `layout` prop. RGL also has internal state. Keeping them in sync is the hardest part of the integration.

```
┌─────────────────────────────────────────────────────┐
│ PCD DashboardLayout                                 │
│   state: layout[]                                   │
│     ↓ passes as prop                                │
│ ┌─────────────────────────────────────────────────┐ │
│ │ RGL GridLayout                                  │ │
│ │   prop: layout (from PCD)                       │ │
│ │   internal state: layout                        │ │
│ │                                                 │ │
│ │   Sync effect (line 436):                       │ │
│ │     if prop changed → sync internal state       │ │
│ │                                                 │ │
│ │   Drag/Resize handlers:                         │ │
│ │     → moveElement / withLayoutItem              │ │
│ │     → compact                                   │ │
│ │     → setLayout (internal)                      │ │
│ │     → fire callback (onDrag, onResize, etc.)    │ │
│ │       ↓                                         │ │
│ └─────────────────────────────────────────────────┘ │
│     PCD callback receives layout                    │
│     PCD decides: accept? modify? reject?            │
│     PCD calls setLayout(newLayout)                  │
│       ↓ triggers prop change                        │
│     RGL sync effect picks it up                     │
└─────────────────────────────────────────────────────┘
```

## Three ways PCD can respond to a drag/resize callback

### 1. Accept (pass-through)
```typescript
// Don't override anything — RGL's internal state already has the result
// The onLayoutChange callback will fire and PCD can persist it
```

### 2. Modify (custom physics)
```typescript
onDrag={(newLayout, oldItem, newItem, ...) => {
  // Run custom collision resolution
  const resolved = trySwap(newLayout, newItem, dragSlot, cols);
  if (resolved) {
    setLayout(resolved);  // PCD's state updates → prop changes → RGL sync effect
  }
  // If not resolved, don't update — RGL's internal state stays as-is
}}
```

### 3. Reject (snap back)
```typescript
onDrag={(newLayout, oldItem, newItem, ...) => {
  // Don't call setLayout — keep previous valid layout
  // RGL already updated its internal state, but on next prop-sync cycle,
  // PCD's unchanged layout prop will override RGL's internal state
}}
```

## The activeDrag Guard (PCD Fork Modification)

### Stock RGL (line 437):
```typescript
if (activeDrag) return; // Block prop-sync during drag
```

This means:
- During drag, RGL ignores layout prop changes
- PCD's `setLayout()` calls during drag are invisible to RGL
- Custom physics can't feed corrected layouts back to RGL in real-time

### PCD Fork:
```typescript
// if (activeDrag) return; // PCD: Removed for live smart-swapping
```

This means:
- During drag, RGL's sync effect WILL process layout prop changes
- PCD's `setLayout()` during `onDrag` callback → prop update → RGL syncs
- **Enables real-time swap/push feedback**

### Risk:
- If PCD's callback modifies layout AND RGL's internal state also modified layout,
  the sync effect runs `synchronizeLayoutWithChildren()` which may produce unexpected results
- The deepEqual guard (line 455) prevents infinite loops but doesn't prevent a single incorrect reconciliation

## onLayoutChange Timing

```typescript
// Line 474-485
useEffect(() => {
  if (!activeDrag && !deepEqual(layout, prevLayoutRef.current)) {
    prevLayoutRef.current = layout;
    const publicLayout = layout.filter(l => l.i !== droppingItem.i);
    onLayoutChange(publicLayout);
  }
}, [layout, activeDrag, onLayoutChange, droppingItem.i]);
```

**Key:** `onLayoutChange` only fires when `activeDrag` is null (drag/resize finished). 
During drag, `onDrag` fires on every tick but `onLayoutChange` does NOT.
After `onDragStop`, both `onDragStop` AND `onLayoutChange` fire.
