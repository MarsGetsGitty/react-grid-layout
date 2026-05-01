import type { Position, PartialPosition, PositionStrategy } from "../types/index.js";
import type * as React from "react";

// ============================================================================
// CSS Style Generation
// ============================================================================

/**
 * Generate CSS transform-based positioning styles.
 *
 * Using transforms is more performant than top/left positioning
 * because it doesn't trigger layout recalculations.
 *
 * @param position - Position in pixels
 * @returns CSS style object
 */
export function setTransform({
  top,
  left,
  width,
  height
}: Position): Record<string, string> {
  const translate = `translate(${left}px,${top}px)`;
  return {
    transform: translate,
    WebkitTransform: translate,
    MozTransform: translate,
    msTransform: translate,
    OTransform: translate,
    width: `${width}px`,
    height: `${height}px`,
    position: "absolute"
  };
}

/**
 * Generate CSS top/left positioning styles.
 *
 * Use this when transforms are not suitable (e.g., for printing
 * or when transform causes issues with child elements).
 *
 * @param position - Position in pixels
 * @returns CSS style object
 */
export function setTopLeft({
  top,
  left,
  width,
  height
}: Position): Record<string, string> {
  return {
    top: `${top}px`,
    left: `${left}px`,
    width: `${width}px`,
    height: `${height}px`,
    position: "absolute"
  };
}

/**
 * Convert a number to a percentage string.
 *
 * @param num - Number to convert (0-1 range typically)
 * @returns Percentage string (e.g., "50%")
 */
export function perc(num: number): string {
  return num * 100 + "%";
}

// ============================================================================
// Position Strategies (v2 Composable Interface)
// ============================================================================

/**
 * CSS transform-based positioning strategy.
 *
 * Uses CSS transforms for positioning, which is more performant
 * as it doesn't trigger layout recalculations.
 *
 * This is the default strategy.
 */
export const transformStrategy: PositionStrategy = {
  type: "transform",
  scale: 1,

  calcStyle(pos: Position): React.CSSProperties {
    return setTransform(pos) as React.CSSProperties;
  }
};

/**
 * Absolute (top/left) positioning strategy.
 *
 * Uses CSS top/left for positioning. Use this when CSS transforms
 * cause issues (e.g., printing, certain child element positioning).
 */
export const absoluteStrategy: PositionStrategy = {
  type: "absolute",
  scale: 1,

  calcStyle(pos: Position): React.CSSProperties {
    return setTopLeft(pos) as React.CSSProperties;
  }
};

/**
 * Create a scaled transform strategy.
 *
 * Use this when the grid container is inside a scaled element
 * (e.g., `transform: scale(0.5)`). The scale factor adjusts
 * drag/resize calculations to account for the parent transform.
 *
 * @param scale - Scale factor (e.g., 0.5 for half size)
 * @returns Position strategy with scaled calculations
 *
 * @example
 * ```tsx
 * <div style={{ transform: 'scale(0.5)' }}>
 *   <GridLayout positionStrategy={createScaledStrategy(0.5)} />
 * </div>
 * ```
 */
export function createScaledStrategy(scale: number): PositionStrategy {
  return {
    type: "transform",
    scale,

    calcStyle(pos: Position): React.CSSProperties {
      return setTransform(pos) as React.CSSProperties;
    },

    calcDragPosition(
      clientX: number,
      clientY: number,
      offsetX: number,
      offsetY: number
    ): PartialPosition {
      return {
        left: (clientX - offsetX) / scale,
        top: (clientY - offsetY) / scale
      };
    }
  };
}

/** Default position strategy (transform-based) */
export const defaultPositionStrategy = transformStrategy;
