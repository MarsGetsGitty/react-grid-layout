/**
 * react-grid-layout/extras
 *
 * Optional components and utilities that extend react-grid-layout.
 * These are tree-shakeable and won't be included unless explicitly imported.
 */

export { GridBackground } from "./GridBackground.js";
export type { GridBackgroundProps } from "./GridBackground.js";

export {
  fastVerticalCompactor,
  fastVerticalOverlapCompactor
} from "./fastVerticalCompactor.js";

export {
  fastHorizontalCompactor,
  fastHorizontalOverlapCompactor
} from "./fastHorizontalCompactor.js";
export { wrapCompactor, wrapOverlapCompactor } from "./wrapCompactor.js";
export { pcdCollisionResolver } from "../core/engines/pcd-collision-resolver.js";

// =============================================================================
// Hooks & Components
// =============================================================================

export { useGridArrangement } from "./hooks/useGridArrangement.js";
export type { UseGridArrangementParams } from "./hooks/useGridArrangement.js";

export { useGutterHandles } from "./hooks/useGutterHandles.js";

export { GutterHandle } from "./components/GutterHandle.js";
export type { GutterHandleProps } from "./components/GutterHandle.js";
