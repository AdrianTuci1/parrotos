import { useEffect, useMemo, useState } from "react";

/**
 * React translation of the `@tanstack/svelte-virtual` `createVirtualizer` usage
 * in `DimensionTable.svelte`.
 *
 * `@tanstack/react-virtual` is not (yet) a web-common dependency, and the
 * svelte-virtual store is not usable from React, so this hook re-implements the
 * windowing math needed by the dimension table: given a scrollable element and a
 * per-item size the caller supplies, it returns the virtual items (with their
 * `start`/`size`/`key`), the total scroll height/width, and the live scroll
 * offset. It mirrors the semantics the Svelte view relies on:
 *
 * - item `start` is measured from the top/left of the scroll content AND
 *   INCLUDES `paddingStart` (so the sticky column header band is reserved), and
 *   `totalSize` includes `paddingStart`.
 * - `overscan` items are rendered beyond the visible window on both sides.
 * - the `getScrollElement`/`estimateSize`/`getItemKey`/`initialOffset` options
 *   map to `scrollElement` / `getSize` / `getItemKey` / the live scroll offset.
 *
 * The scroll element is observed with a resize observer so the visible window
 * recomputes when the container or data changes.
 */
export interface VirtualItem {
  index: number;
  start: number;
  size: number;
  key: string | number;
}

export interface UseVirtualizerOptions {
  /** The scrollable element the window is computed against (shared by rows and columns). */
  scrollElement: HTMLElement | null;
  count: number;
  /** Per-item size in px. The caller derives this (rowHeight / column sizes). */
  getSize: (index: number) => number;
  horizontal?: boolean;
  /** Reserved content at the start of the scroll content (e.g. column header band). */
  paddingStart?: number;
  overscan?: number;
  getItemKey?: (index: number) => string | number;
}

export function useVirtualizer({
  scrollElement,
  count,
  getSize,
  horizontal = false,
  paddingStart = 0,
  overscan = 5,
  getItemKey,
}: UseVirtualizerOptions) {
  const [scrollOffset, setScrollOffset] = useState(0);
  const [viewportSize, setViewportSize] = useState(0);

  // Track the live scroll offset and the container size along the scroll axis.
  useEffect(() => {
    if (!scrollElement) return;
    const update = () => {
      setScrollOffset(
        horizontal ? scrollElement.scrollLeft : scrollElement.scrollTop,
      );
      setViewportSize(
        horizontal ? scrollElement.clientWidth : scrollElement.clientHeight,
      );
    };
    update();
    scrollElement.addEventListener("scroll", update);
    const observer = new ResizeObserver(update);
    observer.observe(scrollElement);
    return () => {
      scrollElement.removeEventListener("scroll", update);
      observer.disconnect();
    };
  }, [scrollElement, horizontal]);

  // Item sizes and cumulative start offsets (including paddingStart).
  const sizes = useMemo(
    () => Array.from({ length: count }, (_, i) => getSize(i)),
    [count, getSize],
  );
  const starts = useMemo(() => {
    const out = new Array<number>(count);
    let acc = paddingStart;
    for (let i = 0; i < count; i++) {
      out[i] = acc;
      acc += sizes[i];
    }
    return out;
  }, [count, sizes, paddingStart]);

  const totalSize = count > 0 ? starts[count - 1] + sizes[count - 1] : paddingStart;

  const virtualItems = useMemo(() => {
    if (count === 0) return [] as VirtualItem[];
    // First index whose item extends past the current scroll offset.
    let lo = 0;
    let hi = count - 1;
    let first = 0;
    while (lo <= hi) {
      const mid = (lo + hi) >> 1;
      if (starts[mid] + sizes[mid] > scrollOffset) {
        first = mid;
        hi = mid - 1;
      } else {
        lo = mid + 1;
      }
    }
    const startIndex = Math.max(0, first - overscan);

    // Last index whose item begins before the visible window ends.
    const windowEnd = scrollOffset + viewportSize;
    let last = startIndex;
    while (last < count && starts[last] < windowEnd) last++;
    const endIndex = Math.min(count - 1, last - 1 + overscan);

    const items: VirtualItem[] = [];
    for (let i = startIndex; i <= endIndex; i++) {
      items.push({
        index: i,
        start: starts[i],
        size: sizes[i],
        key: getItemKey ? getItemKey(i) : i,
      });
    }
    return items;
  }, [count, starts, sizes, scrollOffset, viewportSize, overscan, getItemKey]);

  return { virtualItems, totalSize, scrollOffset };
}
