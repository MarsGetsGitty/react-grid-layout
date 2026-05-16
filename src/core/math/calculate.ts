/**
 * Grid calculation utilities.
 *
 * These functions convert between grid units and pixel positions.
 */

import type { Position, ResizeHandleAxis } from "../types/index.js";

// ============================================================================
// Types
// ============================================================================

/**
 * Parameters needed for position calculations.
 *
 * When `columnWidths` is provided, columns have unequal pixel widths
 * instead of the default equal-division model. Values are fractions
 * (0–1) that must sum to 1.0. Length must equal `cols`.
 */
export interface PositionParams {
  readonly margin: readonly [number, number];
  readonly containerPadding: readonly [number, number];
  readonly containerWidth: number;
  readonly cols: number;
  readonly rowHeight: number;
  readonly maxRows: number;
  /** Per-column width fractions (0–1, sum to 1.0). When absent, equal widths. */
  readonly columnWidths?: readonly number[];
}

// ============================================================================
// Column Width Helpers (private)
// ============================================================================

/**
 * Total usable width after subtracting padding and inter-column margins.
 * This is the space distributed among columns.
 */
function usableWidth(params: PositionParams): number {
  const { margin, containerPadding, containerWidth, cols } = params;
  return containerWidth - margin[0] * (cols - 1) - containerPadding[0] * 2;
}

/**
 * Pixel width of a single column.
 *
 * When `columnWidths` is absent, returns the equal-division width.
 * When present, returns `fraction * usableWidth`.
 *
 * @param params - Grid parameters
 * @param col - Column index (default 0)
 */
function calcColumnWidthPx(params: PositionParams, col: number = 0): number {
  const { columnWidths, cols } = params;
  if (!columnWidths) {
    return Math.max(1, usableWidth(params) / cols);
  }
  const fraction = columnWidths[clamp(col, 0, cols - 1)] ?? (1 / cols);
  return Math.max(1, fraction * usableWidth(params));
}

/**
 * Pixel offset to the left edge of column `col`.
 *
 * When `columnWidths` is absent, uses `(colWidth + margin) * col + padding`.
 * When present, sums widths of columns 0..col-1 plus margins.
 *
 * Handles `col >= cols` (one-past-the-end) by returning the right inner edge
 * of the container. This is needed for margin rounding corrections.
 *
 * @param params - Grid parameters
 * @param col - Column index (0-based). May equal `cols` for boundary calc.
 */
function calcColumnLeft(params: PositionParams, col: number): number {
  const { margin, containerPadding, cols, columnWidths } = params;

  if (!columnWidths) {
    const colWidth = Math.max(1, usableWidth(params) / cols);
    return (colWidth + margin[0]) * col + containerPadding[0];
  }

  // Clamp to [0, cols] — col=cols gives the right inner edge
  const c = clamp(col, 0, cols);
  const uw = usableWidth(params);
  let left = containerPadding[0];
  for (let i = 0; i < c; i++) {
    const fraction = columnWidths[i] ?? (1 / cols);
    left += Math.max(1, fraction * uw) + margin[0];
  }
  return left;
}

/**
 * Find which column index a pixel offset falls into.
 * Uses midpoint-crossing: snaps when cursor crosses the visual center
 * between two column boundaries.
 *
 * @param params - Grid parameters (must have columnWidths)
 * @param leftPx - Left pixel offset (relative to container)
 * @returns Column index (0-based)
 */
function findColumnAtPixel(params: PositionParams, leftPx: number): number {
  const { cols } = params;
  // Find the column whose left edge is closest to leftPx
  let best = 0;
  let bestDist = Infinity;
  for (let c = 0; c < cols; c++) {
    const dist = Math.abs(leftPx - calcColumnLeft(params, c));
    if (dist < bestDist) {
      bestDist = dist;
      best = c;
    }
  }
  return best;
}

// ============================================================================
// Grid Column/Row Calculations
// ============================================================================

/**
 * Calculate the width of a grid column in pixels.
 *
 * When `columnWidths` is absent, all columns are equal and `colIndex` is ignored.
 * When present, returns the width of the specified column.
 *
 * @param positionParams - Grid parameters
 * @param colIndex - Column index (default 0). Only meaningful with `columnWidths`.
 * @returns Column width in pixels (minimum 1px)
 */
export function calcGridColWidth(positionParams: PositionParams, colIndex: number = 0): number {
  return calcColumnWidthPx(positionParams, colIndex);
}

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
export function calcGridItemWHPx(
  gridUnits: number,
  colOrRowSize: number,
  marginPx: number
): number {
  // 0 * Infinity === NaN, which causes problems with resize constraints
  if (!Number.isFinite(gridUnits)) return gridUnits;
  return Math.round(
    colOrRowSize * gridUnits + Math.max(0, gridUnits - 1) * marginPx
  );
}

// ============================================================================
// Position Calculations
// ============================================================================

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
export function calcGridItemPosition(
  positionParams: PositionParams,
  x: number,
  y: number,
  w: number,
  h: number,
  dragPosition?: { top: number; left: number } | null,
  resizePosition?: {
    top: number;
    left: number;
    height: number;
    width: number;
  } | null
): Position {
  const { margin, containerPadding, rowHeight, columnWidths } = positionParams;
  const colWidth = calcGridColWidth(positionParams, x);

  let width: number;
  let height: number;
  let top: number;
  let left: number;

  // If resizing, use the exact width and height from resize callbacks
  if (resizePosition) {
    width = Math.round(resizePosition.width);
    height = Math.round(resizePosition.height);
  } else {
    // Calculate from grid units
    if (columnWidths) {
      // With unequal columns, width = sum of column widths + inter-column margins
      // For w=1 (body sections), this is just calcColumnWidthPx(params, x)
      width = Math.round(
        calcColumnLeft(positionParams, x + w) - calcColumnLeft(positionParams, x) - margin[0]
      );
      // Ensure minimum 1px
      width = Math.max(1, width);
    } else {
      width = calcGridItemWHPx(w, colWidth, margin[0]);
    }
    height = calcGridItemWHPx(h, rowHeight, margin[1]);
  }

  // If dragging, use the exact left/top from drag callbacks
  if (dragPosition) {
    top = Math.round(dragPosition.top);
    left = Math.round(dragPosition.left);
  } else if (resizePosition) {
    // If resizing, use the exact left/top from resize position
    top = Math.round(resizePosition.top);
    left = Math.round(resizePosition.left);
  } else {
    // Calculate from grid units
    top = Math.round((rowHeight + margin[1]) * y + containerPadding[1]);
    left = Math.round(calcColumnLeft(positionParams, x));
  }

  // When not dragging or resizing, fix margin inconsistencies caused by rounding.
  // Due to Math.round(), the gap between adjacent items can differ from the
  // expected margin (e.g., 0px or 2px instead of 1px). We fix this by comparing
  // where the next sibling would start vs where this item ends, and adjusting
  // the width/height to maintain consistent margins.
  if (!dragPosition && !resizePosition) {
    if (Number.isFinite(w)) {
      // Calculate where the next column's item would start
      const siblingLeft = Math.round(calcColumnLeft(positionParams, x + w));
      // Calculate actual margin: sibling start - (our left + our width)
      const actualMarginRight = siblingLeft - left - width;
      // Adjust width if margin doesn't match
      if (actualMarginRight !== margin[0]) {
        width += actualMarginRight - margin[0];
      }
    }

    if (Number.isFinite(h)) {
      // Calculate where the next row's item would start
      const siblingTop = Math.round(
        (rowHeight + margin[1]) * (y + h) + containerPadding[1]
      );
      // Calculate actual margin: sibling start - (our top + our height)
      const actualMarginBottom = siblingTop - top - height;
      // Adjust height if margin doesn't match
      if (actualMarginBottom !== margin[1]) {
        height += actualMarginBottom - margin[1];
      }
    }
  }

  return { top, left, width, height };
}

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
export function calcXY(
  positionParams: PositionParams,
  top: number,
  left: number,
  w: number,
  h: number
): { x: number; y: number } {
  const { margin, containerPadding, cols, rowHeight, maxRows, columnWidths } = positionParams;

  let x: number;
  if (columnWidths) {
    x = findColumnAtPixel(positionParams, left);
  } else {
    const colWidth = calcGridColWidth(positionParams);
    // left = containerPaddingX + x * (colWidth + marginX)
    // x = (left - containerPaddingX) / (colWidth + marginX)
    x = Math.round((left - containerPadding[0]) / (colWidth + margin[0]));
  }
  let y = Math.round((top - containerPadding[1]) / (rowHeight + margin[1]));

  // Clamp to grid bounds
  x = clamp(x, 0, cols - w);
  y = clamp(y, 0, maxRows - h);

  return { x, y };
}

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
export function calcXYRaw(
  positionParams: PositionParams,
  top: number,
  left: number
): { x: number; y: number } {
  const { margin, containerPadding, rowHeight, columnWidths } = positionParams;

  let x: number;
  if (columnWidths) {
    x = findColumnAtPixel(positionParams, left);
  } else {
    const colWidth = calcGridColWidth(positionParams);
    x = Math.round((left - containerPadding[0]) / (colWidth + margin[0]));
  }
  const y = Math.round((top - containerPadding[1]) / (rowHeight + margin[1]));

  return { x, y };
}

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
export function calcWH(
  positionParams: PositionParams,
  width: number,
  height: number,
  x: number,
  y: number,
  handle: ResizeHandleAxis
): { w: number; h: number } {
  const { margin, maxRows, cols, rowHeight, columnWidths } = positionParams;

  let w: number;
  if (columnWidths) {
    // With unequal columns, count how many columns the pixel width spans from x
    let remaining = width + margin[0]; // account for the margin formula
    w = 0;
    for (let c = x; c < cols && remaining > 0; c++) {
      remaining -= calcColumnWidthPx(positionParams, c) + margin[0];
      w++;
    }
    w = Math.max(1, w);
  } else {
    const colWidth = calcGridColWidth(positionParams);
    // width = colWidth * w - (margin * (w - 1))
    // w = (width + margin) / (colWidth + margin)
    w = Math.round((width + margin[0]) / (colWidth + margin[0]));
  }
  const h = Math.round((height + margin[1]) / (rowHeight + margin[1]));

  // Clamp based on resize handle direction
  let _w = clamp(w, 0, cols - x);
  let _h = clamp(h, 0, maxRows - y);

  // West handles can resize to full width
  if (handle === "sw" || handle === "w" || handle === "nw") {
    _w = clamp(w, 0, cols);
  }

  // North handles can resize to full height
  if (handle === "nw" || handle === "n" || handle === "ne") {
    _h = clamp(h, 0, maxRows);
  }

  return { w: _w, h: _h };
}

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
export function calcWHRaw(
  positionParams: PositionParams,
  width: number,
  height: number
): { w: number; h: number } {
  const { margin, rowHeight, columnWidths, cols } = positionParams;

  let w: number;
  if (columnWidths) {
    // With unequal columns, count columns spanned from column 0
    let remaining = width + margin[0];
    w = 0;
    for (let c = 0; c < cols && remaining > 0; c++) {
      remaining -= calcColumnWidthPx(positionParams, c) + margin[0];
      w++;
    }
    w = Math.max(1, w);
  } else {
    const colWidth = calcGridColWidth(positionParams);
    // width = colWidth * w - (margin * (w - 1))
    // w = (width + margin) / (colWidth + margin)
    w = Math.max(1, Math.round((width + margin[0]) / (colWidth + margin[0])));
  }
  const h = Math.max(
    1,
    Math.round((height + margin[1]) / (rowHeight + margin[1]))
  );

  return { w, h };
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Clamp a number between bounds.
 *
 * @param num - Number to clamp
 * @param lowerBound - Minimum value
 * @param upperBound - Maximum value
 * @returns Clamped value
 */
export function clamp(
  num: number,
  lowerBound: number,
  upperBound: number
): number {
  return Math.max(Math.min(num, upperBound), lowerBound);
}

// ============================================================================
// Max Rows Calculation
// ============================================================================

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
export function calcMaxRows(
  containerHeight: number,
  rowHeight: number,
  marginY: number,
  paddingY: number
): number {
  const availableHeight = Math.max(0, containerHeight - paddingY * 2);
  return availableHeight > 0
    ? Math.floor((availableHeight + marginY) / (rowHeight + marginY))
    : Infinity;
}

// ============================================================================
// Grid Background Calculations
// ============================================================================

/**
 * Grid cell dimension information for rendering backgrounds or overlays.
 */
export interface GridCellDimensions {
  /** Width of a single cell in pixels (column 0 when columnWidths is present) */
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
  /** Per-column pixel widths. Only present when columnWidths is provided. */
  readonly cellWidths?: readonly number[];
}

/**
 * Configuration for grid cell dimension calculation.
 */
export interface GridCellConfig {
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
  /** Per-column width fractions (0–1, sum to 1.0). When absent, equal widths. */
  columnWidths?: readonly number[];
}

/**
 * Calculate grid cell dimensions for rendering backgrounds or overlays.
 *
 * This function provides all the measurements needed to render a visual
 * grid background that aligns with the actual grid cells.
 *
 * When `columnWidths` is provided, `cellWidth` returns column 0's width
 * (backward compat) and `cellWidths` provides the full per-column array.
 *
 * @param config - Grid configuration
 * @returns Cell dimensions and offsets
 */
export function calcGridCellDimensions(
  config: GridCellConfig
): GridCellDimensions {
  const {
    width,
    cols,
    rowHeight,
    margin = [10, 10],
    containerPadding,
    columnWidths
  } = config;

  // Container padding defaults to margin if not specified
  const padding = containerPadding ?? margin;

  // Total usable width for column content
  const uw = Math.max(0, width - padding[0] * 2 - margin[0] * (cols - 1));

  if (columnWidths && columnWidths.length === cols) {
    const cellWidths = columnWidths.map(f => Math.max(1, f * uw));
    return {
      cellWidth: cellWidths[0] ?? Math.max(1, uw / cols),
      cellHeight: rowHeight,
      offsetX: padding[0],
      offsetY: padding[1],
      gapX: margin[0],
      gapY: margin[1],
      cols,
      containerWidth: width,
      cellWidths
    };
  }

  // Equal-width path (unchanged)
  const cellWidth = Math.max(1, uw / cols);
  const cellHeight = rowHeight;

  return {
    cellWidth,
    cellHeight,
    offsetX: padding[0],
    offsetY: padding[1],
    gapX: margin[0],
    gapY: margin[1],
    cols,
    containerWidth: width
  };
}

// ============================================================================
// Percentage → Grid Unit Conversion
// ============================================================================

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
export function toGridUnits(fraction: number, totalUnits: number): number {
  // Guard degenerate inputs — NaN, negative, or zero totalUnits
  if (!Number.isFinite(fraction) || !Number.isFinite(totalUnits) || totalUnits < 1) {
    return 1;
  }
  return Math.max(1, Math.min(totalUnits, Math.round(fraction * totalUnits)));
}
