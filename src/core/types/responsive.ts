import type { Layout } from "./layout.js";

/**
 * Breakpoint name (e.g., 'lg', 'md', 'sm', 'xs', 'xxs').
 */
export type Breakpoint = string;

/**
 * Map of breakpoint name to pixel width.
 * Generic type B allows custom breakpoint strings.
 */
export type Breakpoints<B extends Breakpoint = Breakpoint> = Record<B, number>;

/**
 * Map of breakpoint name to number of columns.
 * Generic type B allows custom breakpoint strings.
 */
export type BreakpointCols<B extends Breakpoint = Breakpoint> = Record<
  B,
  number
>;

/**
 * Map of breakpoint name to layout.
 * Generic type B allows custom breakpoint strings.
 */
export type ResponsiveLayouts<B extends Breakpoint = Breakpoint> = Partial<
  Record<B, Layout>
>;

/**
 * Callback when breakpoint changes.
 */
export type OnBreakpointChangeCallback<B extends Breakpoint = Breakpoint> = (
  newBreakpoint: B,
  cols: number
) => void;
