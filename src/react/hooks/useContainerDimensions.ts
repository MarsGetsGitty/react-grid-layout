/**
 * useContainerDimensions hook
 *
 * Observes container width AND height using ResizeObserver and provides
 * reactive dimension updates for responsive/adaptive layouts.
 *
 * @module react/hooks/useContainerDimensions
 */

import {
  useState,
  useEffect,
  useRef,
  useCallback,
  type RefObject
} from "react";

export interface UseContainerDimensionsOptions {
  /**
   * If true, delays initial render until dimensions are measured.
   * Useful for SSR or when you need accurate initial measurements.
   */
  measureBeforeMount?: boolean;

  /**
   * Initial width to use before measurement.
   * Defaults to 1280.
   */
  initialWidth?: number;

  /**
   * Initial height to use before measurement.
   * Defaults to 0 (indicates "not measured yet").
   */
  initialHeight?: number;
}

export interface UseContainerDimensionsResult {
  /**
   * Current container width in pixels.
   */
  width: number;

  /**
   * Current container height in pixels.
   * 0 indicates the container has not been measured yet.
   */
  height: number;

  /**
   * Whether the container has been measured at least once.
   */
  mounted: boolean;

  /**
   * Ref to attach to the container element.
   */
  containerRef: RefObject<HTMLDivElement | null>;

  /**
   * Manually trigger a dimension measurement.
   * Useful when the container size might change without a resize event.
   */
  measureDimensions: () => void;
}

/**
 * Hook to observe and track container width and height.
 *
 * Replaces the WidthProvider HOC with a more composable approach.
 * Also provides height for vertical boundary enforcement.
 *
 * @example
 * ```tsx
 * function MyGrid() {
 *   const { width, height, containerRef, mounted } = useContainerDimensions();
 *
 *   return (
 *     <div ref={containerRef}>
 *       {mounted && <GridLayout width={width} {...props} />}
 *     </div>
 *   );
 * }
 * ```
 */
export function useContainerDimensions(
  options: UseContainerDimensionsOptions = {}
): UseContainerDimensionsResult {
  const { measureBeforeMount = false, initialWidth = 1280, initialHeight = 0 } = options;

  const [width, setWidth] = useState(initialWidth);
  const [height, setHeight] = useState(initialHeight);
  const [mounted, setMounted] = useState(!measureBeforeMount);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const observerRef = useRef<ResizeObserver | null>(null);

  const measureDimensions = useCallback(() => {
    const node = containerRef.current;
    if (node) {
      setWidth(node.offsetWidth);
      setHeight(node.offsetHeight);
      if (!mounted) {
        setMounted(true);
      }
    }
  }, [mounted]);

  useEffect(() => {
    const node = containerRef.current;
    if (!node) return;

    // Initial measurement
    measureDimensions();

    // Set up ResizeObserver
    if (typeof ResizeObserver !== "undefined") {
      let rafId: number | null = null;

      observerRef.current = new ResizeObserver(entries => {
        const entry = entries[0];
        if (entry) {
          // Use contentRect for consistent measurements
          const newWidth = entry.contentRect.width;
          const newHeight = entry.contentRect.height;

          // Defer state update to next paint cycle to avoid
          // "ResizeObserver loop completed with undelivered notifications" error (#1959)
          if (rafId !== null) {
            cancelAnimationFrame(rafId);
          }
          rafId = requestAnimationFrame(() => {
            setWidth(newWidth);
            setHeight(newHeight);
            rafId = null;
          });
        }
      });

      observerRef.current.observe(node);

      return () => {
        // Cancel any pending RAF to prevent state updates on unmounted component
        if (rafId !== null) {
          cancelAnimationFrame(rafId);
        }
        if (observerRef.current) {
          observerRef.current.disconnect();
          observerRef.current = null;
        }
      };
    }

    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
        observerRef.current = null;
      }
    };
  }, [measureDimensions]);

  return {
    width,
    height,
    mounted,
    containerRef,
    measureDimensions
  };
}

export default useContainerDimensions;
