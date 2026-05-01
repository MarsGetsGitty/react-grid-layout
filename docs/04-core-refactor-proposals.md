# Proposals for Refactoring `react-grid-layout/src/core/`

Based on the architectural audit, `src/core/` is functionally sound (no circular dependencies, pure functions) but suffers from file overload (`layout.ts` is a 510-line "God module", `types.ts` is massive) and mixed responsibilities (`position.ts`). 

Here are three potential directions for refactoring the core, ranging from minimal cleanups to deep architectural shifts tailored for our physics engine.

---

## Option 1: The "Surgical" Split (Low Risk, Quick Win)
Focus solely on decomposing the overloaded files into single-responsibility modules while keeping the flat directory structure.

**Actions:**
1. **Delete Dead Code:** Remove `compact-compat.ts` entirely (233 lines of unused v1 legacy logic).
2. **Decompose `position.ts` (333 lines):**
   - `css-strategies.ts`: `transformStrategy`, `absoluteStrategy`, etc.
   - `resize-geometry.ts`: `resizeItemInDirection` and the 8 directional handlers.
3. **Decompose `layout.ts` (510 lines):**
   - `layout-queries.ts`: `bottom()`, `getLayoutItem()`, `getStatics()`
   - `layout-clone.ts`: `cloneLayout()`, `withLayoutItem()`
   - `layout-movement.ts`: `moveElement()`, `moveElementAwayFromCollision()` (The heavy lifters)
4. **Update `index.ts`:** Re-export everything so the `src/react/` layer doesn't need to change its imports.

> **Pros:** Minimal risk of regressions. Fast to execute. The barrel file (`index.ts`) abstracts the changes from the rest of the codebase.
> **Cons:** The folder remains a flat list of 13+ files. `types.ts` is still massive. Doesn't fundamentally improve the architecture for custom physics.

---

## Option 2: Domain-Driven Folders (Medium Effort, High Clarity)
Reorganize the core into explicit subdirectories that mirror the architectural map we built. This makes the codebase self-documenting.

**Directory Structure:**
```text
src/core/
├── types/                 ← Split types.ts (627 lines) into logical groups
│   ├── config.ts          ← GridConfig, DragConfig, etc.
│   ├── events.ts          ← EventCallback, GridDragEvent
│   ├── layout.ts          ← LayoutItem, Layout
│   └── index.ts
├── math/                  ← Pure math, no spatial awareness
│   ├── calculate.ts       ← px ↔ grid unit math
│   ├── resize-math.ts     ← directional geometry 
│   └── sort.ts            
├── spatial/               ← 2D spatial awareness & collision
│   ├── collision.ts       
│   └── movement.ts        ← moveElement & recursive pushing
├── strategies/            ← Pluggable behaviors
│   ├── compactors/        
│   ├── constraints/       
│   └── positioning/       ← CSS strategies
└── index.ts               ← Main barrel
```

> **Pros:** Excellent discoverability for new agents/devs. Isolates pure math from state mutations. Breaking up `types.ts` prevents massive git conflicts.
> **Cons:** Requires updating a lot of relative import paths across `src/react/` and tests.

---

## Option 3: "Physics-First" Pipeline Architecture (High Effort, High Reward)
Since PCD's ultimate goal is a custom physics-based dashboard (swap, squash-push), we can refactor the core to natively support **Pluggable Physics Engines**, rather than fighting RGL's hardcoded "brick-wall" logic.

Right now, PCD bypasses RGL's collision system by setting `allowOverlap = true` and doing the physics math externally in `DashboardLayout.tsx`. We could formalize this.

**Actions:**
1. **Extract Collision Resolution:** Pull the recursive pushing logic out of `moveElement()` into a formal `CollisionEngine` interface.
2. **First-Class Engines:** 
   - Extract RGL's default push logic into `engines/StandardPushEngine.ts`.
   - Port PCD's `swapEngine.ts` and `squashPushEngine.ts` directly into `src/core/engines/`.
3. **Pipeline Refactor:** Rewrite `moveElement` to be a pure state machine:
   `Input → Apply Constraints → Detect Collision → Route to active Engine → Output Layout`

> **Pros:** Elevates PCD's swap/push logic to first-class citizens. Removes the "hacky" feeling of bypassing compactors. Makes the physics highly testable in isolation (without React).
> **Cons:** Deviates heavily from upstream RGL. Significant architectural rewrite. Requires careful porting of PCD's existing engine logic.

---

### Recommendation
If the goal is purely to make the fork readable for agents: **Option 2** is the best balance of effort vs. clarity.
If the goal is to permanently fork RGL and make it the ultimate physics dashboard engine for PCD: **Option 3** sets the best long-term foundation.
