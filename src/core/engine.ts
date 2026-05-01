/**
 * PhysicsEngine Facade
 *
 * Pure, immutable layout orchestration.
 * Every public method clones input before calling any mutating core functions.
 *
 * @module core/engine
 */

import type { Compactor, Layout, LayoutItem, Mutable } from "./types/index.js";
import { cloneLayout } from "./layout/utils.js";
import { correctBounds } from "./layout/bounds.js";
import { getLayoutItem, bottom } from "./layout/queries.js";
import { moveElement } from "./layout/movement.js";
import { withLayoutItem } from "./layout/utils.js";
import { getAllCollisions } from "./spatial/collision.js";

// =============================================================================
// Types
// =============================================================================

/**
 * Configuration for the physics engine.
 */
export interface PhysicsEngineConfig {
  /** Number of columns in the grid */
  cols: number;
  /** Compaction strategy */
  compactor: Compactor;
  /** Whether to block moves/resizes that would cause collisions */
  preventCollision?: boolean;
}

/**
 * Immutable layout orchestration engine.
 *
 * Every method that transforms a layout:
 * 1. Clones the input layout first (immutability invariant)
 * 2. Runs the appropriate core pipeline
 * 3. Returns a new layout — the input is NEVER mutated
 */
export interface PhysicsEngine {
  /**
   * Normalize a layout for the grid: clamp bounds + compact.
   * Use when initializing or resetting layout state.
   *
   * Pipeline: cloneLayout → correctBounds → compact
   */
  initializeLayout(layout: Layout): Layout;

  /**
   * Move an item to a new grid position.
   * Resolves collisions via cascading displacement, then compacts.
   * If item not found, returns layout unchanged (cloned).
   *
   * Pipeline: cloneLayout → getLayoutItem → moveElement(isUserAction=true) → compact
   *
   * INVARIANT: Input layout is never mutated.
   */
  moveItem(layout: Layout, itemId: string, x: number, y: number): Layout;

  /**
   * Resize an item to new dimensions, optionally repositioning.
   * When preventCollision is true and resize would cause overlap,
   * returns the layout UNCHANGED (rejects the resize).
   * When x/y are provided, runs moveElement for collision cascading.
   *
   * Pipeline: cloneLayout → collision check → withLayoutItem → moveElement? → correctBounds → compact
   *
   * INVARIANT: Input layout is never mutated.
   */
  resizeItem(
    layout: Layout,
    itemId: string,
    w: number,
    h: number,
    x?: number,
    y?: number
  ): Layout;

  /**
   * Add an item to the layout.
   * Deduplicates: removes any existing item with the same ID first.
   *
   * Pipeline: cloneLayout → filter(dedup) → append → correctBounds → compact
   *
   * INVARIANT: Input layout is never mutated.
   */
  addItem(layout: Layout, item: LayoutItem): Layout;

  /**
   * Remove an item from the layout and compact to fill gaps.
   *
   * Pipeline: cloneLayout → filter → compact
   *
   * INVARIANT: Input layout is never mutated.
   */
  removeItem(layout: Layout, itemId: string): Layout;

  /**
   * Re-compact a layout (correctBounds + compact).
   * Use after manual batch mutations.
   * Functionally identical to initializeLayout.
   *
   * INVARIANT: Input layout is never mutated.
   */
  compact(layout: Layout): Layout;

  /** Query: highest occupied row (for container height calculation) */
  bottom(layout: Layout): number;

  /** Query: find a specific item */
  getItem(layout: Layout, itemId: string): LayoutItem | undefined;

  /** Exposed config — React layer needs these for rendering decisions */
  readonly compactor: Compactor;
  readonly cols: number;
  readonly preventCollision: boolean;
}

// =============================================================================
// Factory
// =============================================================================

/**
 * Create a new PhysicsEngine instance.
 *
 * @param config - Engine configuration
 * @returns An immutable PhysicsEngine facade
 *
 * @example
 * ```typescript
 * import { createPhysicsEngine, verticalCompactor } from './core';
 *
 * const engine = createPhysicsEngine({
 *   cols: 12,
 *   compactor: verticalCompactor,
 * });
 *
 * const initial = engine.initializeLayout(rawLayout);
 * const moved = engine.moveItem(initial, 'widget-1', 3, 2);
 * ```
 */
export function createPhysicsEngine(config: PhysicsEngineConfig): PhysicsEngine {
  const { cols, compactor } = config;
  const preventCollision = config.preventCollision ?? compactor.preventCollision ?? false;

  // -----------------------------------------------------------------------
  // Internal helpers
  // -----------------------------------------------------------------------

  /**
   * The canonical normalization pipeline: correctBounds → compact.
   * Expects an already-cloned, mutable layout.
   */
  function normalize(mutableLayout: Mutable<LayoutItem>[]): Layout {
    const corrected = correctBounds(mutableLayout, { cols });
    return compactor.compact(corrected, cols);
  }

  // -----------------------------------------------------------------------
  // Public API
  // -----------------------------------------------------------------------

  const engine: PhysicsEngine = {
    compactor,
    cols,
    preventCollision,

    initializeLayout(layout: Layout): Layout {
      const cloned = cloneLayout(layout) as Mutable<LayoutItem>[];
      return normalize(cloned);
    },

    moveItem(layout: Layout, itemId: string, x: number, y: number): Layout {
      const cloned = cloneLayout(layout);
      const item = getLayoutItem(cloned, itemId);

      if (!item) {
        return cloned;
      }

      const moved = moveElement(
        cloned,
        item,
        x,
        y,
        true, // isUserAction — always true from external callers
        preventCollision,
        compactor.type,
        cols,
        compactor.allowOverlap
      );

      return compactor.compact(moved, cols);
    },

    resizeItem(
      layout: Layout,
      itemId: string,
      w: number,
      h: number,
      x?: number,
      y?: number
    ): Layout {
      const cloned = cloneLayout(layout);

      // Step 1: Collision check for preventCollision mode
      if (preventCollision && !compactor.allowOverlap) {
        const proposedX = x ?? getLayoutItem(cloned, itemId)?.x ?? 0;
        const proposedY = y ?? getLayoutItem(cloned, itemId)?.y ?? 0;
        const collisions = getAllCollisions(cloned, {
          i: itemId,
          x: proposedX,
          y: proposedY,
          w,
          h
        } as LayoutItem).filter(li => li.i !== itemId);

        if (collisions.length > 0) {
          return cloned; // Reject — return unchanged (cloned) layout
        }
      }

      // Step 2: Apply new dimensions via withLayoutItem
      const [resized, modifiedItem] = withLayoutItem(cloned, itemId, (item) => {
        (item as Mutable<LayoutItem>).w = w;
        (item as Mutable<LayoutItem>).h = h;
        if (x !== undefined) (item as Mutable<LayoutItem>).x = x;
        if (y !== undefined) (item as Mutable<LayoutItem>).y = y;
        return item;
      });

      if (!modifiedItem) {
        return cloned; // Item not found
      }

      // Step 3: If position changed, run moveElement for collision cascading
      let finalLayout = resized;
      if (x !== undefined || y !== undefined) {
        const movedItem = getLayoutItem(finalLayout, itemId);
        if (movedItem) {
          finalLayout = moveElement(
            finalLayout,
            movedItem,
            movedItem.x,
            movedItem.y,
            true,
            preventCollision,
            compactor.type,
            cols,
            compactor.allowOverlap
          );
        }
      }

      // Step 4: correctBounds + compact
      return normalize(finalLayout as Mutable<LayoutItem>[]);
    },

    addItem(layout: Layout, item: LayoutItem): Layout {
      const cloned = cloneLayout(layout) as Mutable<LayoutItem>[];

      // Dedup: remove any existing item with the same ID
      const deduped = cloned.filter(l => l.i !== item.i) as Mutable<LayoutItem>[];

      // Append the new item (clone it to avoid holding a ref to caller's object)
      deduped.push({ ...item } as Mutable<LayoutItem>);

      return normalize(deduped);
    },

    removeItem(layout: Layout, itemId: string): Layout {
      const cloned = cloneLayout(layout);
      const filtered = cloned.filter(l => l.i !== itemId);
      return compactor.compact(filtered, cols);
    },

    compact(layout: Layout): Layout {
      const cloned = cloneLayout(layout) as Mutable<LayoutItem>[];
      return normalize(cloned);
    },

    bottom(layout: Layout): number {
      return bottom(layout);
    },

    getItem(layout: Layout, itemId: string): LayoutItem | undefined {
      return getLayoutItem(layout, itemId);
    }
  };

  return engine;
}
