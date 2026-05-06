/**
 * React hooks for grid layout.
 *
 * These hooks provide a composable way to build grid layouts,
 * extracting state management from the class components.
 */

// Container dimension observation (width + height)
export {
  useContainerDimensions,
  type UseContainerDimensionsOptions,
  type UseContainerDimensionsResult
} from "./useContainerDimensions.js";

// Core grid layout state management
export {
  useGridLayout,
  type UseGridLayoutOptions,
  type UseGridLayoutResult,
  type DragState,
  type ResizeState,
  type DropState
} from "./useGridLayout.js";

// Responsive breakpoint management
export {
  useResponsiveLayout,
  type UseResponsiveLayoutOptions,
  type UseResponsiveLayoutResult,
  type DefaultBreakpoints,
  DEFAULT_BREAKPOINTS,
  DEFAULT_COLS
} from "./useResponsiveLayout.js";

// GridItem behavior hooks (extracted from GridItem.tsx)
export {
  useGridItemDrag,
  type UseGridItemDragOptions,
  type UseGridItemDragResult
} from "./useGridItemDrag.js";

export {
  useGridItemResize,
  type UseGridItemResizeOptions,
  type UseGridItemResizeResult
} from "./useGridItemResize.js";

export {
  useGridItemDrop,
  type UseGridItemDropOptions
} from "./useGridItemDrop.js";

// GridLayout behavior hooks (extracted from GridLayout.tsx)
export {
  useGridLayoutDrag,
  type UseGridLayoutDragOptions,
  type UseGridLayoutDragResult
} from "./useGridLayoutDrag.js";

export {
  useGridLayoutResize,
  type UseGridLayoutResizeOptions,
  type UseGridLayoutResizeResult
} from "./useGridLayoutResize.js";

export {
  useGridLayoutDrop,
  type UseGridLayoutDropOptions,
  type UseGridLayoutDropResult
} from "./useGridLayoutDrop.js";

// PCD collision resolution & gutter resize hooks
export {
  useGridArrangement,
  type UseGridArrangementParams
} from "./useGridArrangement.js";

export { useGutterHandles } from "./useGutterHandles.js";
