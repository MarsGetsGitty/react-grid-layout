import { P as Position, R as ResizeHandleAxis } from './layout-CFHbwcvs.mjs';

/**
 * Grid calculation utilities.
 *
 * These functions convert between grid units and pixel positions.
 */

/**
 * Parameters needed for position calculations.
 */
interface PositionParams {
    readonly margin: readonly [number, number];
    readonly containerPadding: readonly [number, number];
    readonly containerWidth: number;
    readonly cols: number;
    readonly rowHeight: number;
    readonly maxRows: number;
}
/**
 * Calculate the width of a single grid column in pixels.
 *
 * @param positionParams - Grid parameters
 * @returns Column width in pixels (minimum 1px)
 */
declare function calcGridColWidth(positionParams: PositionParams): number;
/**
 * Calculate the pixel size for a grid unit dimension (width or height).
 *
 * Can be called as:
 * - calcGridItemWHPx(w, colWidth, margin[0]) for width
 * - calcGridItemWHPx(h, rowHeight, margin[1]) for height
 *
 * @param gridUnits - Size in grid units
 * @param colOrRowSize - Column width or row height in pixels
 * @param marginPx - Margin between items in pixels
 * @returns Size in pixels
 */
declare function calcGridItemWHPx(gridUnits: number, colOrRowSize: number, marginPx: number): number;
/**
 * Calculate pixel position for a grid item.
 *
 * Returns left, top, width, height in pixels.
 *
 * @param positionParams - Grid parameters
 * @param x - X coordinate in grid units
 * @param y - Y coordinate in grid units
 * @param w - Width in grid units
 * @param h - Height in grid units
 * @param dragPosition - If present, use exact left/top from drag callbacks
 * @param resizePosition - If present, use exact dimensions from resize callbacks
 * @returns Position in pixels
 */
declare function calcGridItemPosition(positionParams: PositionParams, x: number, y: number, w: number, h: number, dragPosition?: {
    top: number;
    left: number;
} | null, resizePosition?: {
    top: number;
    left: number;
    height: number;
    width: number;
} | null): Position;
/**
 * Translate pixel coordinates to grid units.
 *
 * @param positionParams - Grid parameters
 * @param top - Top position in pixels (relative to parent)
 * @param left - Left position in pixels (relative to parent)
 * @param w - Width in grid units (for clamping)
 * @param h - Height in grid units (for clamping)
 * @returns x and y in grid units
 */
declare function calcXY(positionParams: PositionParams, top: number, left: number, w: number, h: number): {
    x: number;
    y: number;
};
/**
 * Translate pixel coordinates to grid units without clamping.
 *
 * Use this with the constraint system for custom boundary control.
 *
 * @param positionParams - Grid parameters
 * @param top - Top position in pixels (relative to parent)
 * @param left - Left position in pixels (relative to parent)
 * @returns x and y in grid units (unclamped)
 */
declare function calcXYRaw(positionParams: PositionParams, top: number, left: number): {
    x: number;
    y: number;
};
/**
 * Calculate grid units from pixel dimensions.
 *
 * @param positionParams - Grid parameters
 * @param width - Width in pixels
 * @param height - Height in pixels
 * @param x - X coordinate in grid units (for clamping)
 * @param y - Y coordinate in grid units (for clamping)
 * @param handle - Resize handle being used
 * @returns w, h in grid units
 */
declare function calcWH(positionParams: PositionParams, width: number, height: number, x: number, y: number, handle: ResizeHandleAxis): {
    w: number;
    h: number;
};
/**
 * Calculate grid units from pixel dimensions without clamping.
 *
 * Use this with the constraint system for custom size control.
 *
 * @param positionParams - Grid parameters
 * @param width - Width in pixels
 * @param height - Height in pixels
 * @returns w, h in grid units (unclamped, minimum 1)
 */
declare function calcWHRaw(positionParams: PositionParams, width: number, height: number): {
    w: number;
    h: number;
};
/**
 * Clamp a number between bounds.
 *
 * @param num - Number to clamp
 * @param lowerBound - Minimum value
 * @param upperBound - Maximum value
 * @returns Clamped value
 */
declare function clamp(num: number, lowerBound: number, upperBound: number): number;
/**
 * Calculate the maximum number of fully-fitting rows from a container height.
 *
 * Subtracts vertical container padding before computing. Returns Infinity
 * when containerHeight is 0 (auto-height / not-yet-measured).
 *
 * This is the single source of truth for the maxRows formula. All call sites
 * (adaptive-metrics, ContainerGrid, constraints) should use this function.
 *
 * @param containerHeight - Measured container height in pixels (0 = auto)
 * @param rowHeight       - Height of a single row in pixels
 * @param marginY         - Vertical margin between items in pixels
 * @param paddingY        - Vertical container padding in pixels
 * @returns Maximum number of fully-fitting rows, or Infinity if auto-height
 */
declare function calcMaxRows(containerHeight: number, rowHeight: number, marginY: number, paddingY: number): number;
/**
 * Grid cell dimension information for rendering backgrounds or overlays.
 */
interface GridCellDimensions {
    /** Width of a single cell in pixels */
    readonly cellWidth: number;
    /** Height of a single cell in pixels */
    readonly cellHeight: number;
    /** Horizontal offset from container edge to first cell */
    readonly offsetX: number;
    /** Vertical offset from container edge to first cell */
    readonly offsetY: number;
    /** Horizontal gap between cells */
    readonly gapX: number;
    /** Vertical gap between cells */
    readonly gapY: number;
    /** Number of columns */
    readonly cols: number;
    /** Total container width */
    readonly containerWidth: number;
}
/**
 * Configuration for grid cell dimension calculation.
 */
interface GridCellConfig {
    /** Container width in pixels */
    width: number;
    /** Number of columns */
    cols: number;
    /** Row height in pixels */
    rowHeight: number;
    /** Margin between items [x, y] */
    margin?: readonly [number, number];
    /** Container padding [x, y], defaults to margin if not specified */
    containerPadding?: readonly [number, number] | null;
}
/**
 * Calculate grid cell dimensions for rendering backgrounds or overlays.
 *
 * This function provides all the measurements needed to render a visual
 * grid background that aligns with the actual grid cells.
 *
 * @param config - Grid configuration
 * @returns Cell dimensions and offsets
 *
 * @example
 * ```tsx
 * import { calcGridCellDimensions } from 'react-grid-layout/core';
 *
 * const dims = calcGridCellDimensions({
 *   width: 1200,
 *   cols: 12,
 *   rowHeight: 30,
 *   margin: [10, 10],
 *   containerPadding: [10, 10]
 * });
 *
 * // dims.cellWidth = 88.33...
 * // dims.cellHeight = 30
 * // dims.offsetX = 10 (containerPadding[0])
 * // dims.offsetY = 10 (containerPadding[1])
 * // dims.gapX = 10 (margin[0])
 * // dims.gapY = 10 (margin[1])
 * ```
 */
declare function calcGridCellDimensions(config: GridCellConfig): GridCellDimensions;
/**
 * Convert a fraction (0–1) to grid units, rounded to the nearest integer.
 * Clamps the result to [1, totalUnits].
 *
 * Handles degenerate inputs defensively:
 * - NaN / negative fraction → treated as 0 → clamped to 1
 * - NaN / zero / negative totalUnits → returns 1
 *
 * @param fraction - Value in [0, 1] representing percentage of a grid axis
 * @param totalUnits - Total grid units on that axis (cols or maxRows)
 * @returns Grid units, clamped to [1, totalUnits]
 */
declare function toGridUnits(fraction: number, totalUnits: number): number;

export { type GridCellConfig as G, type PositionParams as P, calcWH as a, calcXY as b, calcGridItemPosition as c, type GridCellDimensions as d, calcGridCellDimensions as e, calcGridColWidth as f, calcGridItemWHPx as g, calcMaxRows as h, calcWHRaw as i, calcXYRaw as j, clamp as k, toGridUnits as t };
