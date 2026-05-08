/**
 * Adaptive Grid Metrics
 *
 * Pure, React-free functions for computing dynamic grid column count,
 * row height, and maximum rows from measured container dimensions.
 *
 * The adaptive system works by:
 *   1. Choosing a column count from an approximate `targetCellWidth` hint
 *   2. Computing the real rendered column width via RGL's margin/padding formula
 *   3. Computing maximum rows from available height ÷ minRowHeight
 *   4. Deriving row height so total grid track height does not exceed the container
 *
 * @module core/math/adaptive-metrics
 */
/**
 * User-facing input for adaptive metrics computation.
 * All fields optional — merged with ADAPTIVE_DEFAULTS internally.
 */
interface AdaptiveOptionsInput {
    /**
     * Approximate outer cell slot width (including margin) used to choose cols.
     *
     * `cols = clamp(floor(availableWidth / targetCellWidth), minCols, maxCols)`
     *
     * This is NOT the rendered column width — it is a sizing hint for column
     * count selection. The actual rendered `colWidth` is computed afterward
     * using RGL's real margin/padding formula.
     *
     * @default 120
     */
    targetCellWidth?: number;
    /**
     * Target minimum row height in pixels.
     *
     * Row count is computed from available height while accounting for vertical
     * margins. rowHeight is then derived so the total grid track height does not
     * exceed the available container height.
     *
     * Rows are approximately this height when sufficient space exists. In
     * degenerate containers, the grid clamps to one row and uses the available
     * height.
     *
     * @default 50
     */
    minRowHeight?: number;
    /** Minimum number of columns. @default 6 */
    minCols?: number;
    /** Maximum number of columns. @default 24 */
    maxCols?: number;
    /**
     * [horizontal, vertical] margin between items in pixels.
     * Used for colWidth computation and maxRows derivation.
     * @default [6, 6]
     */
    margin?: readonly [number, number];
    /**
     * [horizontal, vertical] padding inside the container.
     * When null, uses margin values.
     * @default null
     */
    containerPadding?: readonly [number, number] | null;
}
/**
 * Fully resolved options after merging with defaults.
 * Exported for advanced use cases (e.g., inspecting resolved values in tests).
 */
interface ResolvedAdaptiveOptions {
    readonly targetCellWidth: number;
    readonly minRowHeight: number;
    readonly minCols: number;
    readonly maxCols: number;
    readonly margin: readonly [number, number];
    readonly containerPadding: readonly [number, number] | null;
}
/**
 * Output of computeAdaptiveMetrics.
 * All values are ready for direct use in GridConfig / ContainerGrid.
 */
interface AdaptiveMetrics {
    /** Computed number of columns. */
    readonly cols: number;
    /** Computed row height in pixels (derived from minRowHeight and available height). */
    readonly rowHeight: number;
    /** Computed maximum rows that fit in the container (accounts for vertical padding). */
    readonly maxRows: number;
    /** Computed width of a single column in pixels (informational). */
    readonly colWidth: number;
}
/**
 * Default adaptive options.
 * Frozen to prevent accidental mutation.
 *
 * @example
 * ```ts
 * // Use all defaults:
 * const metrics = computeAdaptiveMetrics(1920, 1080);
 *
 * // Override one value:
 * const metrics = computeAdaptiveMetrics(1920, 1080, { targetCellWidth: 150 });
 * ```
 */
declare const ADAPTIVE_DEFAULTS: Readonly<ResolvedAdaptiveOptions>;
/**
 * Compute adaptive grid metrics from container dimensions.
 *
 * Deterministic, side-effect free. Safe to call on every render/resize.
 *
 * @param containerWidth  - Measured container width in pixels
 * @param containerHeight - Measured container height in pixels (0 = not yet measured)
 * @param options         - Partial options, merged with ADAPTIVE_DEFAULTS
 * @returns Computed { cols, rowHeight, maxRows, colWidth }
 */
declare function computeAdaptiveMetrics(containerWidth: number, containerHeight: number, options?: AdaptiveOptionsInput): AdaptiveMetrics;

export { type AdaptiveOptionsInput as A, type ResolvedAdaptiveOptions as R, ADAPTIVE_DEFAULTS as a, type AdaptiveMetrics as b, computeAdaptiveMetrics as c };
