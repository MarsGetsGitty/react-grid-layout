# PCD Fork — What We Changed and Why

> **Upstream:** [react-grid-layout v2.2.3](https://github.com/react-grid-layout/react-grid-layout)
> **Fork:** `pcd-stable` branch on [MarsGetsGitty/react-grid-layout](https://github.com/MarsGetsGitty/react-grid-layout)
> **Linked as:** pnpm workspace submodule at `packages/react-grid-layout`

This document catalogues every PCD-specific addition to the upstream
react-grid-layout v2 codebase. Upstream's core architecture is preserved;
our changes add capabilities that upstream does not provide, without
modifying upstream's existing behaviour.

---

## Summary of Changes

| Area | What | Why |
|------|------|-----|
| **Module decomposition** | Split monolithic core into `core/`, `react/`, `extras/`, `legacy/` | Tree-shakeable imports, cleaner internal boundaries |
| **Collision resolver API** | `CollisionResolver` type + `collisionResolver` prop on GridLayout | Lets consumers own collision physics instead of relying on upstream's one-size-fits-all |
| **Swap engine** | `core/engines/swap-strategy.ts` | Dimension-matched 1:1 widget swapping during drag |
| **Squash-push engine** | `core/engines/squash-push-strategy.ts` | Resize collision resolution via squash → push → reject pipeline |
| **PCD collision resolver** | `extras/pcdCollisionResolver.ts` | Swap-then-push drag resolver with whole-layout validation |
| **Ghost drag** | `ghostDrag` prop on GridLayout | Real widget stays at grid position, translucent ghost follows cursor |
| **Compactor hardening** | Moved-flag normalization across all 6 compactor variants | Prevents drag-frame "freeze" bugs from stale `moved=true` flags |
| **Hook lifecycle hardening** | Deep cloning in `useGridLayoutDrag` | Prevents rejected moves from mutating committed layout state |

---

## Detailed Changelog

### 1. Module Decomposition

**Commit:** `62d75ed`

Upstream ships a single flat source tree. We decomposed it into domain
modules with explicit public APIs:

```
src/
├── core/           # Pure layout math — no React
│   ├── engines/    # PCD-specific collision engines (swap, squash-push)
│   ├── layout/     # Layout CRUD, movement, utils
│   ├── math/       # Calculate-utils (coordinate math)
│   ├── spatial/    # Collision detection, sorting
│   ├── strategies/ # Compactors (pluggable compaction algorithms)
│   └── types/      # All TypeScript interfaces
├── react/          # React bindings (hooks, components)
├── extras/         # Optional tree-shakeable add-ons
└── legacy/         # Backwards-compatible wrappers
```

**Import paths:**
```ts
import { GridLayout } from "react-grid-layout";            // main
import { getCompactor, type Layout } from "react-grid-layout/core";
import { useContainerWidth } from "react-grid-layout/react";
import { pcdCollisionResolver } from "react-grid-layout/extras";
```

### 2. Collision Resolver API

**Files:** `core/types/events.ts`, `react/hooks/useGridLayoutDrag.ts`

Added a `collisionResolver` prop to `GridLayout` that intercepts the
drag pipeline. When provided, the resolver replaces upstream's default
`moveElement → compact` cycle entirely.

```ts
type CollisionResolver = (
  tentativeLayout: Layout,
  movedItem: LayoutItem,
  originalPosition: { x: number; y: number },
  context?: CollisionResolverContext
) => Layout | null;

interface CollisionResolverContext {
  cols: number;
  compactType?: CompactType;
}
```

**Contract:**
- Return a valid `Layout` → **accept** (layout is committed)
- Return `null` → **reject** (layout stays at last valid state, placeholder still tracks cursor)

**Hook behaviour when resolver is present:**
- Tentative layout is built from cloned items (never mutates committed state)
- `moveElement` is called with `allowOverlap=true` to place the item at the cursor position
- Resolver receives the tentative layout and decides accept/reject
- On accept: result is compacted, committed, and reported to `onDrag` callback
- On reject: last valid layout is reported to `onDrag`, placeholder still tracks cursor
- On drag stop: last accepted layout is committed (no re-resolve at drop position)

### 3. Swap Engine (`trySwap`)

**File:** `core/engines/swap-strategy.ts`

Pure function that attempts a 1:1 widget swap during drag.

**Rules:**
1. Exactly ONE widget must overlap the dragged widget (multi-collision → reject)
2. The target must have the **exact same** `w` and `h` (dimension match)
3. The swap must not create secondary collisions (target at drag origin must be collision-free)

If all three rules pass, the target teleports to the drag origin slot.
Otherwise returns `null`.

**Why dimension match?** Without it, dragging a 4×3 widget onto an 8×8
widget would teleport the 8×8 into the 4×3 slot, causing permanent
overlap (the "absorb bug").

### 4. Squash-Push Engine (`resolveResizeCollisions`)

**File:** `core/engines/squash-push-strategy.ts`

Recursive collision resolution engine for **resize** operations.
Uses a 4-phase cascade per collision:

```
Phase 1: Squash — shrink the target toward the resize edge (respects minW/minH)
Phase 2: Push  — translate the target away from the resize edge
Phase 3: Boundary check — reject if pushed past viewport (maxRows/cols)
Phase 4: Recurse — resolve chain-reaction collisions from the pushed target
```

**Safety guards:**
- Max recursion depth (16)
- Global budget (64 operations)
- Swept-edge band filtering (only recurse into the path of movement)

### 5. PCD Collision Resolver

**File:** `extras/pcdCollisionResolver.ts`

The main drag collision resolver used by the PCD dashboard. Orchestrates
a 3-phase pipeline:

```
1. Try Swap  — dimension-matched 1:1 swap via trySwap()
2. Try Push  — fallback to moveElement() with collision resolution
3. Reject    — returns null
```

**Hardening:**
- Both swap and push results are validated with `hasAnyCollisions()` before acceptance
- Push fallback resets the dragged item to `originalPosition` before calling `moveElement` (so it sees the position delta and resolves collisions correctly)
- Stale `moved` flags are cleared before push to prevent freeze bugs
- Missing `cols` context → immediate reject
- Explicit vertical/horizontal push semantics based on `compactType`

**Known limitation:** Push fallback resets to drag-start position, not
previous accepted position. This can cause incorrect direction inference
when reversing drag direction mid-drag. Tracked in
`docs/tickets/RGL-001-push-fallback-previous-position.md`.

### 6. Ghost Drag

**Commits:** `70ad4c1`, `cad9e5a`

Added `ghostDrag` prop to `GridLayout`. When enabled:
- The real widget stays at its committed grid position
- A translucent ghost element follows the cursor
- The placeholder shows where the widget would land

This eliminates the visual jank of the widget teleporting between grid
cells during drag.

### 7. Compactor Hardening

**File:** `core/strategies/compactors.ts`

All 6 compactor variants now consistently:
- Clone the layout array (immutability)
- Clear `moved = false` on every item

Without this, items with stale `moved=true` from prior drag frames could
not be pushed by `moveElement`, causing a "freeze" bug where repeated
drags on the same item would stop resolving collisions.

**Affected compactors:**
- `verticalCompactor` / `horizontalCompactor` (already cleared `moved`)
- `noCompactor` (added cloning + clearing)
- `verticalOverlapCompactor` / `horizontalOverlapCompactor` (added cloning + clearing)
- `noOverlapCompactor` (inherits from `noCompactor`)

### 8. Hook Lifecycle Hardening

**File:** `react/hooks/useGridLayoutDrag.ts`

- `latestDragLayoutRef` is deep-cloned at drag start, so in-drag work
  happens against a private copy
- Rejected resolver moves report `currentLayout` (last valid) to
  `onDrag` callback, not the tentative invalid layout
- Accepted resolver moves report the compacted resolved layout with
  the correct `acceptedItem`
- Drag stop commits `latestDragLayoutRef` (last accepted), does NOT
  re-resolve at the raw drop position

---

## Test Coverage

PCD-specific tests live in `test/spec/`:

| File | Tests | Covers |
|------|-------|--------|
| `pcd-collision-resolver.test.ts` | 12 | Context validation, free-space, swap, push, compactType, moved flags, immutability |
| `compactor-moved-flag.test.ts` | 11 | All 6 compactors clear `moved`, repeated drag regression |
| `use-grid-layout-drag-resolver.test.ts` | 7 | Reject/accept callbacks, context passing, snapshot immutability |
| `collision-strategies.test.ts` | 28 | Squash-push engine: boundary, chain, static items, budget limits |

Run with:
```bash
npx jest --testPathPatterns "pcd-collision-resolver|compactor-moved-flag|use-grid-layout-drag-resolver|collision-strategies"
```

---

## Upstream Sync Policy

We track upstream `main` but do NOT auto-merge. When upstream releases:

1. Create a branch from `pcd-stable`
2. Merge upstream changes
3. Run the full test suite
4. Verify no regressions in PCD-specific behaviour
5. Rebuild `dist/` and update the submodule pointer in `pcd`

Our changes are additive — they should not conflict with upstream's
internal changes unless upstream modifies `moveElement`, compactors,
or the drag hook lifecycle.
