/**
 * react-grid-layout/core
 *
 * Pure TypeScript layout algorithms and types.
 * No React dependencies - can be used with any framework.
 */

// =============================================================================
// Types
// =============================================================================

export type {
  // Resize handles
  ResizeHandleAxis,

  // Layout
  LayoutItem,
  Layout,

  // Position & Size
  Position,
  PartialPosition,
  Size,
  DroppingPosition,

  // Events
  ReactDraggableCallbackData,
  GridDragEvent,
  GridResizeEvent,
  DragOverEvent,

  // Compaction
  CompactType,

  // Callbacks
  EventCallback,
  OnLayoutChangeCallback,
  CollisionResolver,

  // Composable interfaces
  Compactor,
  PositionStrategy,
  LayoutConstraint,
  ConstraintContext,

  // Configuration
  GridConfig,
  DragConfig,
  ResizeConfig,
  DropConfig,

  // Responsive
  Breakpoint,
  Breakpoints,
  BreakpointCols,
  ResponsiveLayouts,
  OnBreakpointChangeCallback,

  // Utility types
  Mutable,
  DeepPartial,
  ArrayElement
} from "./types/index.js";

// Default configuration objects
export {
  defaultGridConfig,
  defaultDragConfig,
  defaultResizeConfig,
  defaultDropConfig
} from "./types/index.js";

// =============================================================================
// Spatial Math & Geometry
// =============================================================================

export { collides, getFirstCollision, getAllCollisions } from "./spatial/collision.js";
export {
  sortLayoutItems,
  sortLayoutItemsByRowCol,
  sortLayoutItemsByColRow
} from "./spatial/sort.js";

// =============================================================================
// Layout Utilities
// =============================================================================

export {
  // Queries
  bottom,
  getLayoutItem,
  getStatics,

  // Cloning
  cloneLayoutItem,
  cloneLayout,

  // Modification
  modifyLayout,
  withLayoutItem,

  // Bounds
  correctBounds,

  // Movement
  moveElement,
  moveElementAwayFromCollision,

  // Validation
  validateLayout
} from "./layout/index.js";

// =============================================================================
// Strategies (Compaction, Constraints, CSS)
// =============================================================================

// Compactor implementations
export {
  verticalCompactor,
  horizontalCompactor,
  noCompactor,
  verticalOverlapCompactor,
  horizontalOverlapCompactor,
  noOverlapCompactor,
  getCompactor
} from "./strategies/compactors.js";

export {
  // Built-in constraints
  gridBounds,
  minMaxSize,
  containerBounds,
  boundedX,
  boundedY,
  // Constraint factories
  aspectRatio,
  snapToGrid,
  minSize,
  maxSize,
  // Default constraints
  defaultConstraints,
  // Apply functions
  applyPositionConstraints,
  applySizeConstraints
} from "./strategies/constraints.js";

export {
  setTransform,
  setTopLeft,
  perc,
  // Position strategies
  transformStrategy,
  absoluteStrategy,
  createScaledStrategy,
  defaultPositionStrategy
} from "./strategies/css-strategies.js";

export { resizeItemInDirection } from "./math/resize-geometry.js";

// =============================================================================
// Grid Calculations
// =============================================================================

export type {
  PositionParams,
  GridCellDimensions,
  GridCellConfig
} from "./math/calculate.js";

export {
  calcGridColWidth,
  calcGridItemWHPx,
  calcGridItemPosition,
  calcXY,
  calcWH,
  calcXYRaw,
  calcWHRaw,
  clamp,
  calcMaxRows,
  calcGridCellDimensions
} from "./math/calculate.js";

// =============================================================================
// Adaptive Metrics
// =============================================================================

export type {
  AdaptiveOptionsInput,
  ResolvedAdaptiveOptions,
  AdaptiveMetrics
} from "./math/adaptive-metrics.js";

export {
  computeAdaptiveMetrics,
  ADAPTIVE_DEFAULTS
} from "./math/adaptive-metrics.js";

// =============================================================================
// Proportional Layout Conversion
// =============================================================================

export type {
  ProportionalCoords,
  ProportionalLayoutItem,
  GridContext
} from "./math/proportional.js";

export {
  toProportional,
  fromProportional,
  toProportionalLayout,
  fromProportionalLayout,
  totalOccupiedRows
} from "./math/proportional.js";

export type {
  ItemConstraints,
  RepairContext
} from "./math/proportional-repair.js";

export {
  repairLayout,
  hasOverlaps,
  hasOverflow
} from "./math/proportional-repair.js";

// =============================================================================
// Responsive Utilities
// =============================================================================

export {
  sortBreakpoints,
  getBreakpointFromWidth,
  getColsFromBreakpoint,
  findOrGenerateResponsiveLayout,
  getIndentationValue
} from "./layout/responsive.js";

// =============================================================================
// Engine Facade
// =============================================================================

export {
  createPhysicsEngine,
  type PhysicsEngine,
  type PhysicsEngineConfig
} from "./engine.js";

// =============================================================================
// Collision Strategies
// =============================================================================

export type {
  DragSlot,
  DragCollisionResolver,
  ResizeCollisionResolver
} from "./engines/index.js";

export {
  trySwap,
  resolveResizeCollisions,
  inferResizeHandles,
  pcdCollisionResolver
} from "./engines/index.js";
