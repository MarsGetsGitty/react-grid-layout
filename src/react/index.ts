/**
 * react-grid-layout/react
 *
 * React bindings for the grid layout system.
 * Provides hooks and components for building grid layouts.
 */

// =============================================================================
// Containers
// =============================================================================

export {
  ContainerGrid,
  type ContainerGridProps
} from "./containers/ContainerGrid.js";

// =============================================================================
// Components
// =============================================================================

export {
  GridItem,
  GridLayout,
  ResponsiveGridLayout,
  GutterHandle,
  type GridItemProps,
  type GridItemCallback,
  type ResizeHandle,
  type GridLayoutProps,
  type ResponsiveGridLayoutProps,
  type GutterHandleProps
} from "./components/index.js";

// =============================================================================
// Hooks
// =============================================================================

export {
  useContainerWidth,
  useGridLayout,
  useResponsiveLayout,
  useGridArrangement,
  useGutterHandles,
  type UseContainerWidthOptions,
  type UseContainerWidthResult,
  type UseGridLayoutOptions,
  type UseGridLayoutResult,
  type DragState,
  type ResizeState,
  type DropState,
  type UseResponsiveLayoutOptions,
  type UseResponsiveLayoutResult,
  type DefaultBreakpoints,
  type UseGridArrangementParams,
  DEFAULT_BREAKPOINTS,
  DEFAULT_COLS
} from "./hooks/index.js";

// =============================================================================
// Re-exported Core Types
// =============================================================================

export type {
  Layout,
  LayoutItem,
  CompactType,
  Position,
  DroppingPosition,
  Breakpoint,
  Breakpoints,
  ResponsiveLayouts,
  Compactor,
  ResizeHandleAxis,
  GridDragEvent,
  GridResizeEvent,
  EventCallback,
  CollisionResolver
} from "../core/index.js";

// =============================================================================
// Re-exported Core Utilities
// =============================================================================

export {
  // Layout utilities
  cloneLayout,
  cloneLayoutItem,
  getLayoutItem,
  bottom,

  // Compactors
  getCompactor,
  verticalCompactor,
  horizontalCompactor,
  noCompactor,

  // Position utilities
  calcGridItemPosition,
  calcXY,
  calcWH,
  setTransform,
  setTopLeft
} from "../core/index.js";
