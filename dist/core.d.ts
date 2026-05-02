import { c as LayoutItem, e as LayoutConstraint, g as ConstraintContext, R as ResizeHandleAxis, P as Position, L as Layout, a as Compactor } from './layout-BOhCYNcp.js';
export { f as CollisionResolver, C as CompactType, h as DragOverEvent, D as DroppingPosition, E as EventCallback, G as GridDragEvent, b as GridResizeEvent, O as OnLayoutChangeCallback, i as PartialPosition, d as PositionStrategy, j as ReactDraggableCallbackData, S as Size } from './layout-BOhCYNcp.js';
export { B as Breakpoint, d as BreakpointCols, a as Breakpoints, D as DragConfig, c as DropConfig, G as GridConfig, O as OnBreakpointChangeCallback, b as ResizeConfig, R as ResponsiveLayouts, e as defaultDragConfig, f as defaultDropConfig, g as defaultGridConfig, h as defaultResizeConfig } from './responsive--RDVCTfq.js';
export { c as collides, f as findOrGenerateResponsiveLayout, g as getAllCollisions, a as getBreakpointFromWidth, b as getColsFromBreakpoint, d as getFirstCollision, i as getIndentationValue, m as moveElement, j as moveElementAwayFromCollision, k as sortBreakpoints, s as sortLayoutItems, e as sortLayoutItemsByColRow, h as sortLayoutItemsByRowCol } from './responsive-Z3IDAoIw.js';
export { i as absoluteStrategy, b as bottom, c as cloneLayout, a as cloneLayoutItem, j as compactItemHorizontal, k as compactItemVertical, l as createScaledStrategy, m as defaultPositionStrategy, g as getCompactor, d as getLayoutItem, o as getStatics, h as horizontalCompactor, p as horizontalOverlapCompactor, q as modifyLayout, n as noCompactor, r as noOverlapCompactor, t as perc, u as resolveCompactionCollision, s as setTopLeft, e as setTransform, w as transformStrategy, v as validateLayout, f as verticalCompactor, x as verticalOverlapCompactor, y as withLayoutItem } from './css-strategies-BSyipisS.js';
export { G as GridCellConfig, d as GridCellDimensions, P as PositionParams, e as calcGridCellDimensions, f as calcGridColWidth, c as calcGridItemPosition, g as calcGridItemWHPx, a as calcWH, h as calcWHRaw, b as calcXY, i as calcXYRaw, j as clamp } from './calculate-Davk-z0Z.js';
import 'react';

/**
 * Makes all properties in T mutable (removes readonly).
 */
type Mutable<T> = {
    -readonly [P in keyof T]: T[P];
};
/**
 * Deep partial - all properties and nested properties are optional.
 */
type DeepPartial<T> = {
    [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};
/**
 * Extract the element type from an array type.
 */
type ArrayElement<T> = T extends readonly (infer U)[] ? U : never;

/**
 * Ensure all layout items fit within the grid bounds.
 *
 * - Items overflowing right are moved left
 * - Items overflowing left are moved to x=0 and clamped to grid width
 * - Static items that collide with other statics are moved down
 *
 * **IMPORTANT**: This function mutates the layout items in place for performance.
 * The type signature uses `Mutable<LayoutItem>[]` to make this explicit.
 * Clone the layout first (e.g., with `cloneLayout()`) if you need immutability.
 *
 * @param layout - Layout to correct (items WILL be mutated)
 * @param bounds - Grid bounds
 * @returns The same layout array (for chaining)
 */
declare function correctBounds(layout: Mutable<LayoutItem>[], bounds: {
    cols: number;
}): LayoutItem[];

/**
 * Pluggable layout constraints for react-grid-layout v2
 *
 * Constraints control position and size limits during drag/resize operations.
 * They are composable, tree-shakeable, and can be applied at grid or item level.
 */

/**
 * Grid boundary constraint.
 *
 * Ensures items stay within the grid bounds (0 to cols-w for x, 0 to maxRows-h for y).
 * This is the default position constraint.
 */
declare const gridBounds: LayoutConstraint;
/**
 * Min/max size constraint.
 *
 * Enforces per-item minW/maxW/minH/maxH properties.
 * This is applied by default after gridBounds.
 */
declare const minMaxSize: LayoutConstraint;
/**
 * Container bounds constraint.
 *
 * Constrains items to stay within the visible container.
 * Use this as a replacement for the legacy `isBounded` prop.
 *
 * Unlike gridBounds which uses maxRows (which may be Infinity),
 * this constraint calculates visible rows from the actual container height.
 * Falls back to maxRows if containerHeight is 0 (auto-height grids).
 */
declare const containerBounds: LayoutConstraint;
/**
 * Bounded X constraint.
 *
 * Only constrains horizontal position (x-axis).
 * Items can move freely in the vertical direction.
 */
declare const boundedX: LayoutConstraint;
/**
 * Bounded Y constraint.
 *
 * Only constrains vertical position (y-axis).
 * Items can move freely in the horizontal direction.
 */
declare const boundedY: LayoutConstraint;
/**
 * Create an aspect ratio constraint.
 *
 * Maintains a fixed width-to-height ratio **in pixels** during resize operations.
 * Accounts for the different pixel sizes of grid columns vs rows.
 *
 * @param ratio - Width-to-height ratio (e.g., 16/9 for widescreen, 1 for square)
 * @returns A constraint that enforces the aspect ratio
 *
 * @example
 * ```typescript
 * // 16:9 aspect ratio (actual pixel proportions)
 * const layout = [
 *   { i: 'video', x: 0, y: 0, w: 4, h: 2, constraints: [aspectRatio(16/9)] }
 * ];
 *
 * // Square items (in pixels, not grid units)
 * <GridLayout constraints={[gridBounds, minMaxSize, aspectRatio(1)]} />
 * ```
 */
declare function aspectRatio(ratio: number): LayoutConstraint;
/**
 * Create a snap-to-grid constraint.
 *
 * Snaps positions to multiples of the specified step values.
 * Useful for aligning items to a coarser grid.
 *
 * @param stepX - Horizontal snap step in grid units
 * @param stepY - Vertical snap step in grid units (defaults to stepX)
 * @returns A constraint that snaps positions to the grid
 *
 * @example
 * ```typescript
 * // Snap to every 2 grid units
 * <GridLayout constraints={[snapToGrid(2), gridBounds]} />
 *
 * // Different horizontal and vertical snap
 * <GridLayout constraints={[snapToGrid(2, 3), gridBounds]} />
 * ```
 */
declare function snapToGrid(stepX: number, stepY?: number): LayoutConstraint;
/**
 * Create a minimum size constraint.
 *
 * Sets minimum width and height for all items using this constraint.
 * Useful for grid-wide minimums without setting minW/minH on each item.
 *
 * @param minW - Minimum width in grid units
 * @param minH - Minimum height in grid units
 * @returns A constraint that enforces minimum size
 */
declare function minSize(minW: number, minH: number): LayoutConstraint;
/**
 * Create a maximum size constraint.
 *
 * Sets maximum width and height for all items using this constraint.
 * Useful for grid-wide maximums without setting maxW/maxH on each item.
 *
 * @param maxW - Maximum width in grid units
 * @param maxH - Maximum height in grid units
 * @returns A constraint that enforces maximum size
 */
declare function maxSize(maxW: number, maxH: number): LayoutConstraint;
/**
 * Default constraints applied when none are specified.
 *
 * Includes:
 * - gridBounds: Keep items within the grid
 * - minMaxSize: Respect per-item min/max constraints
 */
declare const defaultConstraints: LayoutConstraint[];
/**
 * Apply position constraints to a proposed position.
 *
 * Constraints are applied in array order, allowing composition.
 * Grid-level constraints are applied first, then per-item constraints.
 *
 * @param constraints - Array of constraints to apply
 * @param item - The layout item being positioned
 * @param x - Proposed x position
 * @param y - Proposed y position
 * @param context - Grid context (cols, maxRows, etc.)
 * @returns Constrained position
 */
declare function applyPositionConstraints(constraints: LayoutConstraint[], item: LayoutItem, x: number, y: number, context: ConstraintContext): {
    x: number;
    y: number;
};
/**
 * Apply size constraints to a proposed size.
 *
 * Constraints are applied in array order, allowing composition.
 * Grid-level constraints are applied first, then per-item constraints.
 *
 * @param constraints - Array of constraints to apply
 * @param item - The layout item being resized
 * @param w - Proposed width
 * @param h - Proposed height
 * @param handle - Which resize handle is being used
 * @param context - Grid context (cols, maxRows, etc.)
 * @returns Constrained size
 */
declare function applySizeConstraints(constraints: LayoutConstraint[], item: LayoutItem, w: number, h: number, handle: ResizeHandleAxis, context: ConstraintContext): {
    w: number;
    h: number;
};

/**
 * Resize an item in a specific direction, clamping to container bounds.
 *
 * This handles the complex logic of resizing from different edges/corners,
 * ensuring the item doesn't overflow the container.
 *
 * @param direction - Which edge/corner is being dragged
 * @param currentSize - Current position and size
 * @param newSize - Requested new position and size
 * @param containerWidth - Width of the container
 * @returns Constrained position and size
 */
declare function resizeItemInDirection(direction: ResizeHandleAxis, currentSize: Position, newSize: Position, containerWidth: number): Position;

/**
 * PhysicsEngine Facade
 *
 * Pure, immutable layout orchestration.
 * Every public method clones input before calling any mutating core functions.
 *
 * @module core/engine
 */

/**
 * Configuration for the physics engine.
 */
interface PhysicsEngineConfig {
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
interface PhysicsEngine {
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
    resizeItem(layout: Layout, itemId: string, w: number, h: number, x?: number, y?: number): Layout;
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
declare function createPhysicsEngine(config: PhysicsEngineConfig): PhysicsEngine;

/**
 * Collision Strategy Types
 *
 * Function type definitions for pluggable collision resolution.
 * Consumers provide concrete implementations (e.g., trySwap, resolveResizeCollisions)
 * that satisfy these signatures.
 *
 * @module core/engines/types
 */

/** The origin slot a dragged widget came from (grid coordinates). */
interface DragSlot {
    x: number;
    y: number;
}
/**
 * Resolve collisions caused by a drag operation.
 *
 * Given the current layout and the dragged item's origin slot,
 * returns a new layout with the collision resolved (e.g., a swap),
 * or `null` to reject the move (brick-wall behavior).
 *
 * Implementations MUST NOT mutate the input layout.
 *
 * @param layout    - Current layout
 * @param draggedId - The `i` of the widget being dragged
 * @param dragSlot  - The grid slot the dragged widget came from
 * @returns A new layout with the collision resolved, or `null` to reject.
 */
type DragCollisionResolver = (layout: LayoutItem[], draggedId: string, dragSlot: DragSlot) => LayoutItem[] | null;
/**
 * Resolve collisions caused by a resize operation.
 *
 * Given the layout after resize and the item's before/after state,
 * returns a new layout with collisions resolved (e.g., squash + push),
 * or `null` to reject the resize (boundary hit).
 *
 * Implementations MUST NOT mutate the input layout.
 *
 * @param layout    - Current layout (will NOT be mutated)
 * @param resizedId - The `i` of the widget being resized
 * @param oldItem   - Item state BEFORE the resize
 * @param newItem   - Item state AFTER the resize (from RGL callback)
 * @param maxRows   - Maximum rows in the grid (viewport boundary)
 * @param cols      - Number of columns in the grid
 * @returns A new layout with collisions resolved, or `null` to reject.
 */
type ResizeCollisionResolver = (layout: LayoutItem[], resizedId: string, oldItem: LayoutItem, newItem: LayoutItem, maxRows: number, cols: number) => LayoutItem[] | null;

/**
 * swapStrategy — Dimension-Aware Widget Swapping
 *
 * Pure function: given a layout, the dragged widget ID, and the slot
 * it came from, returns a new layout with a swap applied — or null
 * if no valid swap target exists.
 *
 * Rules:
 *  1. Exactly ONE widget must overlap the dragged widget (multi-collision = brick wall).
 *  2. The overlapping widget must have the EXACT same w and h (dimension match).
 *  3. If both conditions pass, the target teleports to the drag origin slot.
 *
 * @see smart_physics_engine_design.md §2
 * @module core/engines/swap-strategy
 */

/**
 * Attempt a dimension-aware swap during drag.
 *
 * @param layout   - Current layout (will NOT be mutated)
 * @param draggedId - The `i` of the widget being dragged
 * @param dragSlot  - The grid slot the dragged widget came from
 * @returns A new layout array with the swap applied, or `null` if no valid swap.
 */
declare function trySwap(layout: LayoutItem[], draggedId: string, dragSlot: DragSlot): LayoutItem[] | null;

/**
 * squashPushStrategy — Recursive Squash-then-Push Resize Collision Resolution
 *
 * Pure function: given a layout after a resize operation, resolves all
 * collisions by first squashing overlapping widgets (reducing their size
 * toward minH/minW), then pushing them along the resize axis, and finally
 * checking boundary constraints. If any widget would leave the viewport,
 * the entire operation is rejected (returns null).
 *
 * Algorithm:
 *  1. Infer resize direction from oldItem vs newItem deltas
 *  2. For each axis with a delta, run recursive collision resolution:
 *     a. Calculate directional penetration depth (minimum displacement
 *        in the push direction to fully separate source and target)
 *     b. SQUASH: reduce target size toward its min, absorbing penetration
 *     c. PUSH: slide target along the axis for remaining penetration
 *     d. BOUNDARY CHECK: reject if target exits viewport
 *     e. RECURSE: if pushing created new collisions, repeat for those
 *
 * Collision filtering uses swept active-edge interval overlap to ensure
 * only targets in the path of the expanding/moving edge are processed.
 * This prevents "backfire" — accidentally pushing wrong-side widgets.
 *
 * Cycle prevention relies on monotonic push direction under the
 * directional separation invariant, with depth and work-budget guards
 * as safety valves for malformed layouts or zero/invalid dimensions.
 *
 * @see smart_physics_engine_design.md §3
 * @module core/engines/squash-push-strategy
 */

interface ResizeAxes {
    vertical: "n" | "s" | null;
    horizontal: "w" | "e" | null;
}
/**
 * Infer which resize handle is being used by comparing the item
 * state before and after the resize. Each handle produces a unique
 * delta signature, so inference is deterministic.
 */
declare function inferResizeHandles(oldItem: LayoutItem, newItem: LayoutItem): ResizeAxes;
/**
 * Resolve all collisions caused by a resize operation.
 *
 * @param layout     - Current layout (will NOT be mutated)
 * @param resizedId  - The `i` of the widget being resized
 * @param oldItem    - Item state BEFORE the resize
 * @param newItem    - Item state AFTER the resize (from RGL callback)
 * @param maxRows    - Maximum rows in the grid (viewport boundary)
 * @param cols       - Number of columns in the grid
 * @returns A new layout with collisions resolved, or `null` if boundary hit.
 */
declare function resolveResizeCollisions(layout: LayoutItem[], resizedId: string, oldItem: LayoutItem, newItem: LayoutItem, maxRows: number, cols: number): LayoutItem[] | null;

export { type ArrayElement, Compactor, ConstraintContext, type DeepPartial, type DragCollisionResolver, type DragSlot, Layout, LayoutConstraint, LayoutItem, type Mutable, type PhysicsEngine, type PhysicsEngineConfig, Position, type ResizeCollisionResolver, ResizeHandleAxis, applyPositionConstraints, applySizeConstraints, aspectRatio, boundedX, boundedY, containerBounds, correctBounds, createPhysicsEngine, defaultConstraints, gridBounds, inferResizeHandles, maxSize, minMaxSize, minSize, resizeItemInDirection, resolveResizeCollisions, snapToGrid, trySwap };
