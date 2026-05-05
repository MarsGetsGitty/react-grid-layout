/**
 * GutterHandle — Presentational component for shared-edge resize handles.
 *
 * Renders a thin, invisible div in the margin gap between two adjacent
 * widgets. The ::before pseudo-element expands the click target to ~26px
 * for usability. On hover, a subtle highlight bar appears.
 *
 * This component is purely visual — all drag logic lives in useGutterHandles.
 *
 * @module react/components/GutterHandle
 */

import type { MouseEvent } from "react";

export interface GutterHandleProps {
  type: "horizontal" | "vertical";
  left: number;
  top: number;
  width: number;
  height: number;
  isActive: boolean;
  onMouseDown: (e: MouseEvent) => void;
}

export function GutterHandle({
  type,
  left,
  top,
  width,
  height,
  isActive,
  onMouseDown,
}: GutterHandleProps) {
  const className = [
    "gutter-handle",
    `gutter-handle--${type}`,
    isActive && "gutter-handle--active",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div
      className={className}
      style={{
        position: "absolute",
        left,
        top,
        width,
        height,
      }}
      onMouseDown={onMouseDown}
    />
  );
}
