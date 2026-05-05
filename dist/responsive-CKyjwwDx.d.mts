import { L as Layout } from './layout-o8aKmB_k.mjs';

/**
 * Breakpoint name (e.g., 'lg', 'md', 'sm', 'xs', 'xxs').
 */
type Breakpoint = string;
/**
 * Map of breakpoint name to pixel width.
 * Generic type B allows custom breakpoint strings.
 */
type Breakpoints<B extends Breakpoint = Breakpoint> = Record<B, number>;
/**
 * Map of breakpoint name to number of columns.
 * Generic type B allows custom breakpoint strings.
 */
type BreakpointCols<B extends Breakpoint = Breakpoint> = Record<B, number>;
/**
 * Map of breakpoint name to layout.
 * Generic type B allows custom breakpoint strings.
 */
type ResponsiveLayouts<B extends Breakpoint = Breakpoint> = Partial<Record<B, Layout>>;
/**
 * Callback when breakpoint changes.
 */
type OnBreakpointChangeCallback<B extends Breakpoint = Breakpoint> = (newBreakpoint: B, cols: number) => void;

export type { Breakpoint as B, OnBreakpointChangeCallback as O, ResponsiveLayouts as R, Breakpoints as a, BreakpointCols as b };
