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

import { clamp } from "./calculate.js";

// ============================================================================
// Types
// ============================================================================

/**
 * User-facing input for adaptive metrics computation.
 * All fields optional — merged with ADAPTIVE_DEFAULTS internally.
 */
export interface AdaptiveOptionsInput {
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
export interface ResolvedAdaptiveOptions {
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
export interface AdaptiveMetrics {
  /** Computed number of columns. */
  readonly cols: number;

  /** Computed row height in pixels (derived from minRowHeight and available height). */
  readonly rowHeight: number;

  /** Computed maximum rows that fit in the container (accounts for vertical padding). */
  readonly maxRows: number;

  /** Computed width of a single column in pixels (informational). */
  readonly colWidth: number;
}

// ============================================================================
// Defaults
// ============================================================================

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
export const ADAPTIVE_DEFAULTS: Readonly<ResolvedAdaptiveOptions> = Object.freeze({
  targetCellWidth: 120,
  minRowHeight: 50,
  minCols: 6,
  maxCols: 24,
  margin: Object.freeze([6, 6]) as readonly [number, number],
  containerPadding: null,
});

// ============================================================================
// Core Function
// ============================================================================

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
export function computeAdaptiveMetrics(
  containerWidth: number,
  containerHeight: number,
  options: AdaptiveOptionsInput = {}
): AdaptiveMetrics {
  // ── 1. Resolve options ──────────────────────────────────
  const resolved = resolveOptions(options);
  const { minCols, maxCols, margin, containerPadding } = resolved;
  const targetCellWidth = Math.max(1, resolved.targetCellWidth);
  const effectivePadding = containerPadding ?? margin;

  // ── 2. Compute cols from available width ────────────────
  // availableWidth excludes horizontal container padding.
  // targetCellWidth is an approximate slot size used to choose cols.
  const availableWidth = Math.max(1, containerWidth - effectivePadding[0] * 2);

  const effectiveMaxCols = Math.max(minCols, maxCols);
  const rawCols = Math.floor(availableWidth / targetCellWidth);
  const cols = clamp(rawCols, minCols, effectiveMaxCols);

  // ── 3. Compute actual rendered column width ─────────────
  // Same formula as calcGridColWidth in calculate.ts:
  //   colWidth = (containerWidth - margin[0] * (cols - 1) - padding[0] * 2) / cols
  const rawColWidth =
    (containerWidth - margin[0] * (cols - 1) - effectivePadding[0] * 2) / cols;
  const colWidth = Math.max(1, rawColWidth);

  // ── 4. Compute rows from available height ───────────────
  const { minRowHeight } = resolved;
  const availableHeight = Math.max(0, containerHeight - effectivePadding[1] * 2);

  let rowHeight: number;
  let maxRows: number;

  if (availableHeight <= 0) {
    // Container not measured yet or degenerate.
    // maxRows=Infinity is EXISTING behavior (see test #7) — downstream
    // code (ContainerGrid, DashboardGridShell, serialization) already handles it.
    rowHeight = Math.max(1, minRowHeight);
    maxRows = Infinity;
  } else {
    // maxRows: how many rows of minRowHeight fit, accounting for inter-row margins.
    // availableHeight >= maxRows * minRowHeight + (maxRows - 1) * marginY
    // => maxRows <= (availableHeight + marginY) / (minRowHeight + marginY)
    const effectiveMinRowHeight = Math.max(1, minRowHeight);
    maxRows = Math.max(1, Math.floor(
      (availableHeight + margin[1]) / (effectiveMinRowHeight + margin[1])
    ));

    // rowHeight: does not exceed available height.
    // Uses floor() — may leave a few slack pixels. Intentional.
    // Contract: "does not exceed", not "fills exactly."
    rowHeight = Math.max(1, Math.floor(
      (availableHeight - (maxRows - 1) * margin[1]) / maxRows
    ));
  }

  return { cols, rowHeight, maxRows, colWidth };
}

// ============================================================================
// Internal Helpers
// ============================================================================

/**
 * Merge user input with defaults.
 * Does NOT mutate ADAPTIVE_DEFAULTS.
 */
function resolveOptions(input: AdaptiveOptionsInput): ResolvedAdaptiveOptions {
  return {
    targetCellWidth: input.targetCellWidth ?? ADAPTIVE_DEFAULTS.targetCellWidth,
    minRowHeight: input.minRowHeight ?? ADAPTIVE_DEFAULTS.minRowHeight,
    minCols: input.minCols ?? ADAPTIVE_DEFAULTS.minCols,
    maxCols: input.maxCols ?? ADAPTIVE_DEFAULTS.maxCols,
    margin: input.margin ?? ADAPTIVE_DEFAULTS.margin,
    containerPadding:
      input.containerPadding !== undefined
        ? input.containerPadding
        : ADAPTIVE_DEFAULTS.containerPadding,
  };
}
