import type { Layout, LayoutItem, ResizeHandleAxis } from "./layout.js";

/**
 * Pixel position and size of an element.
 */
export interface Position {
  left: number;
  top: number;
  width: number;
  height: number;
}

/**
 * Partial position (just coordinates, no size).
 */
export interface PartialPosition {
  left: number;
  top: number;
}

/**
 * Size in pixels.
 */
export interface Size {
  width: number;
  height: number;
}

/**
 * Position when dropping an external element onto the grid.
 */
export interface DroppingPosition {
  left: number;
  top: number;
  e: Event;
}

/**
 * Data provided by react-draggable during drag operations.
 */
export interface ReactDraggableCallbackData {
  node: HTMLElement;
  x?: number;
  y?: number;
  deltaX: number;
  deltaY: number;
  lastX?: number;
  lastY?: number;
}

/**
 * Grid-level drag event data.
 */
export interface GridDragEvent {
  e: Event;
  node: HTMLElement;
  newPosition: PartialPosition;
}

/**
 * Grid-level resize event data.
 */
export interface GridResizeEvent {
  e: Event;
  node: HTMLElement;
  size: Size;
  handle: ResizeHandleAxis;
}

/**
 * Drag-over event with layer coordinates.
 */
export interface DragOverEvent extends MouseEvent {
  nativeEvent: Event & {
    layerX: number;
    layerY: number;
  };
}

/**
 * Standard callback signature for layout change events.
 *
 * @param layout - The current layout after the change
 * @param oldItem - The item before the change (null if not applicable)
 * @param newItem - The item after the change (null if not applicable)
 * @param placeholder - The placeholder item during drag/resize (null at start)
 * @param event - The DOM event that triggered the change
 * @param element - The DOM element being manipulated (null if not applicable)
 */
export type EventCallback = (
  layout: Layout,
  oldItem: LayoutItem | null,
  newItem: LayoutItem | null,
  placeholder: LayoutItem | null,
  event: Event,
  element: HTMLElement | null
) => void;

/**
 * Callback when layout changes for any reason.
 */
export type OnLayoutChangeCallback = (layout: Layout) => void;
