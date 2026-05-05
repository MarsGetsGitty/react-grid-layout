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
// Hooks & Components (promoted to react/ — re-exported for backward compat)
// =============================================================================

export { useGridArrangement } from "../react/hooks/useGridArrangement.js";
export type { UseGridArrangementParams } from "../react/hooks/useGridArrangement.js";

export { useGutterHandles } from "../react/hooks/useGutterHandles.js";

export { GutterHandle } from "../react/components/GutterHandle.js";
export type { GutterHandleProps } from "../react/components/GutterHandle.js";

