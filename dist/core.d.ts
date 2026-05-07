import { c as LayoutItem, j as LayoutConstraint, k as ConstraintContext, R as ResizeHandleAxis, P as Position, L as Layout, a as Compactor } from './layout-CFHbwcvs.js';
export { d as CollisionResolver, C as CompactType, f as DragConfig, l as DragOverEvent, h as DropConfig, D as DroppingPosition, E as EventCallback, e as GridConfig, G as GridDragEvent, b as GridResizeEvent, O as OnLayoutChangeCallback, m as PartialPosition, i as PositionStrategy, n as ReactDraggableCallbackData, g as ResizeConfig, S as Size, o as defaultDragConfig, p as defaultDropConfig, q as defaultGridConfig, r as defaultResizeConfig } from './layout-CFHbwcvs.js';
export { B as Breakpoint, b as BreakpointCols, a as Breakpoints, O as OnBreakpointChangeCallback, R as ResponsiveLayouts } from './responsive-CAtIWshU.js';
export { c as collides, f as findOrGenerateResponsiveLayout, g as getAllCollisions, a as getBreakpointFromWidth, b as getColsFromBreakpoint, d as getFirstCollision, i as getIndentationValue, m as moveElement, j as moveElementAwayFromCollision, k as sortBreakpoints, s as sortLayoutItems, e as sortLayoutItemsByColRow, h as sortLayoutItemsByRowCol } from './responsive-DQyi_m3X.js';
export { i as absoluteStrategy, b as bottom, c as cloneLayout, a as cloneLayoutItem, j as createScaledStrategy, k as defaultPositionStrategy, g as getCompactor, d as getLayoutItem, l as getStatics, h as horizontalCompactor, m as horizontalOverlapCompactor, o as modifyLayout, n as noCompactor, p as noOverlapCompactor, q as perc, s as setTopLeft, e as setTransform, t as transformStrategy, v as validateLayout, f as verticalCompactor, r as verticalOverlapCompactor, w as withLayoutItem } from './css-strategies-QLCl-0rx.js';
export { G as GridCellConfig, d as GridCellDimensions, P as PositionParams, e as calcGridCellDimensions, f as calcGridColWidth, c as calcGridItemPosition, g as calcGridItemWHPx, h as calcMaxRows, a as calcWH, i as calcWHRaw, b as calcXY, j as calcXYRaw, k as clamp } from './calculate-znRG1-du.js';
export { a as ADAPTIVE_DEFAULTS, b as AdaptiveMetrics, A as AdaptiveOptionsInput, R as ResolvedAdaptiveOptions, c as computeAdaptiveMetrics } from './adaptive-metrics-BljnZr6R.js';
export { p as pcdCollisionResolver } from './pcd-collision-resolver-BBeMHAuF.js';
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
 * Proportional Layout Conversion — Pure Functions
 *
 * Converts between absolute grid coordinates ({x, y, w, h} in integer grid units)
 * and proportional fractions ({xF, yF, wF, hF} as 0..1 floats relative to grid size).
 *
 * Proportional layouts are screen-independent: a widget at wF=0.5 is always
 * half the grid width regardless of the actual column count. This enables
 * cross-screen portability — layouts saved on a 24-col monitor render correctly
 * on a 12-col laptop.
 *
 * Design decisions:
 * - Full proportional (Approach A): both x/w AND y/h are fractional.
 *   This ensures vertical portability across different maxRows.
 * - Reference for vertical: maxRows from adaptive metrics (Option 1).
 *   "What you see is what you save."
 * - Conversion is pure — no overlap resolution. Use repairLayout() after
 *   fromProportionalLayout() to fix rounding artifacts.
 *
 * @see 2A.9.extra-1_Adaptive_Grid_System.md — Session 4 (Proportional Layout Spike)
 */

/**
 * Proportional coordinates — all values are fractions in the range [0, 1].
 *
 * - xF: horizontal position as fraction of total cols
 * - yF: vertical position as fraction of total rows (maxRows)
 * - wF: width as fraction of total cols
 * - hF: height as fraction of total rows (maxRows)
 */
interface ProportionalCoords {
    xF: number;
    yF: number;
    wF: number;
    hF: number;
}
/**
 * Proportional layout item — a LayoutItem's identity + proportional coords.
 */
interface ProportionalLayoutItem extends ProportionalCoords {
    /** Item identifier (same as LayoutItem.i) */
    i: string;
}
/**
 * Grid context for conversion. Defines the grid dimensions to convert
 * between absolute and proportional coordinates.
 */
interface GridContext {
    /** Number of columns in the grid */
    cols: number;
    /** Number of rows in the grid (from adaptive metrics or manual config) */
    maxRows: number;
}
/**
 * Convert a single layout item to proportional coordinates.
 *
 * @param item - Layout item with absolute grid coordinates
 * @param ctx - Grid context (cols, maxRows) for the current grid
 * @returns Proportional coordinates (xF, yF, wF, hF) in [0, 1]
 *
 * @example
 * ```ts
 * toProportional({ i: "a", x: 6, y: 3, w: 6, h: 3 }, { cols: 12, maxRows: 12 })
 * // → { xF: 0.5, yF: 0.25, wF: 0.5, hF: 0.25 }
 * ```
 */
declare function toProportional(item: Pick<LayoutItem, "x" | "y" | "w" | "h">, ctx: GridContext): ProportionalCoords;
/**
 * Convert proportional coordinates back to absolute grid coordinates.
 *
 * Rounds to nearest integer. Clamps w/h to minimum 1, and ensures
 * x+w ≤ cols and y+h ≤ maxRows.
 *
 * @param frac - Proportional coordinates
 * @param ctx - Target grid context (may differ from the original)
 * @returns Absolute coordinates { x, y, w, h } as integers
 *
 * @example
 * ```ts
 * fromProportional({ xF: 0.5, yF: 0.25, wF: 0.5, hF: 0.25 }, { cols: 24, maxRows: 17 })
 * // → { x: 12, y: 4, w: 12, h: 4 }
 * ```
 */
declare function fromProportional(frac: ProportionalCoords, ctx: GridContext): {
    x: number;
    y: number;
    w: number;
    h: number;
};
/**
 * Convert an entire layout to proportional coordinates.
 *
 * @param layout - Array of layout items with absolute coordinates
 * @param ctx - Grid context for the current grid
 * @returns Array of proportional layout items (with identifiers preserved)
 */
declare function toProportionalLayout(layout: readonly LayoutItem[], ctx: GridContext): ProportionalLayoutItem[];
/**
 * Convert an entire proportional layout back to absolute coordinates.
 *
 * Preserves all non-coordinate properties from the original layout items
 * (minW, minH, maxW, maxH, static, etc.) when an originals map is provided.
 *
 * @param proportional - Array of proportional layout items
 * @param ctx - Target grid context (may differ from original)
 * @param originals - Optional map of original LayoutItems keyed by `i`,
 *   used to carry forward non-coordinate properties (minW, minH, etc.)
 * @returns Array of LayoutItems with absolute coordinates
 */
declare function fromProportionalLayout(proportional: readonly ProportionalLayoutItem[], ctx: GridContext, originals?: ReadonlyMap<string, LayoutItem>): LayoutItem[];
/**
 * Compute the total occupied rows in a layout (max y + h across all items).
 * Useful as a fallback reference when maxRows is Infinity.
 *
 * @param layout - Layout to measure
 * @returns The bottom edge of the lowest item, or 0 for empty layouts
 */
declare function totalOccupiedRows(layout: readonly LayoutItem[]): number;

/**
 * Proportional Layout Repair — Post-Conversion Artifact Resolution
 *
 * After converting a proportional layout to absolute coordinates via
 * fromProportionalLayout(), rounding can introduce:
 * 1. Boundary violations (items extending past cols/maxRows)
 * 2. Min/max size violations (widget rounded below its minW/minH)
 * 3. Overlapping items (two items rounded into the same cell)
 *
 * This module provides a deterministic repair pass that resolves all
 * three classes of artifacts without fundamentally altering the layout.
 *
 * The repair strategy is conservative: clamp first, enforce constraints
 * second, resolve overlaps last (via vertical push-down). Items are
 * processed in reading order (top-to-bottom, left-to-right) to ensure
 * deterministic output.
 *
 * @see 2A.9.extra-1_Adaptive_Grid_System.md — Session 4 (Proportional Layout Spike)
 */

/**
 * Size constraints for a single item. Optional — if not provided,
 * the item's own minW/minH/maxW/maxH are used.
 */
interface ItemConstraints {
    minW?: number;
    minH?: number;
    maxW?: number;
    maxH?: number;
}
/**
 * Grid bounds for the repair pass.
 */
interface RepairContext {
    cols: number;
    maxRows: number;
}
/**
 * Repair a layout that may contain rounding artifacts from proportional
 * conversion.
 *
 * The repair is deterministic and processes items in reading order
 * (top-to-bottom, left-to-right). The algorithm:
 *
 * 1. **Boundary clamp** — items can't extend past cols or maxRows
 * 2. **Constraint enforcement** — apply minW/minH/maxW/maxH
 * 3. **Overlap resolution** — push overlapping items down
 *
 * @param layout - Layout items (may have overlaps/boundary violations)
 * @param ctx - Grid bounds (cols, maxRows)
 * @param constraints - Optional per-item constraints keyed by item.i
 * @returns A new layout array with all artifacts resolved. Never mutates input.
 */
declare function repairLayout(layout: readonly LayoutItem[], ctx: RepairContext, constraints?: ReadonlyMap<string, ItemConstraints>): LayoutItem[];
/**
 * Check if any items in the layout overlap.
 *
 * @param layout - Layout to check
 * @returns true if any two items overlap
 */
declare function hasOverlaps(layout: readonly LayoutItem[]): boolean;
/**
 * Check if any items extend past the grid bounds.
 *
 * @param layout - Layout to check
 * @param ctx - Grid bounds
 * @returns true if any item extends past cols or maxRows
 */
declare function hasOverflow(layout: readonly LayoutItem[], ctx: RepairContext): boolean;

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

export { type ArrayElement, Compactor, ConstraintContext, type DeepPartial, type DragCollisionResolver, type DragSlot, type GridContext, type ItemConstraints, Layout, LayoutConstraint, LayoutItem, type Mutable, type PhysicsEngine, type PhysicsEngineConfig, Position, type ProportionalCoords, type ProportionalLayoutItem, type RepairContext, type ResizeCollisionResolver, ResizeHandleAxis, applyPositionConstraints, applySizeConstraints, aspectRatio, boundedX, boundedY, containerBounds, correctBounds, createPhysicsEngine, defaultConstraints, fromProportional, fromProportionalLayout, gridBounds, hasOverflow, hasOverlaps, inferResizeHandles, maxSize, minMaxSize, minSize, repairLayout, resizeItemInDirection, resolveResizeCollisions, snapToGrid, toProportional, toProportionalLayout, totalOccupiedRows, trySwap };
