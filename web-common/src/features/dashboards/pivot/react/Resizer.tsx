import { useRef, useState, type ReactNode, type MouseEvent } from "react";
import { clamp } from "@rilldata/web-common/lib/clamp";

type Direction = "NS" | "EW";
type Side = "left" | "right" | "top" | "bottom";
type Justify = "center" | "start" | "end";

/**
 * React translation of @rilldata/web-common/layout/Resizer.svelte. Renders a
 * drag handle that reports a new dimension via `onUpdate`. The parent owns the
 * dimension value, so during a drag we persist the starting dimension ref and
 * recompute the delta on each mousemove.
 */
export function Resizer({
  dimension,
  direction = "EW",
  side,
  max = 440,
  min = 200,
  basis = 200,
  absolute = true,
  onMouseDown,
  onUpdate,
  onMouseUp,
  disabled = false,
  justify = "center",
  hang = true,
  children,
}: {
  dimension: number;
  direction?: Direction;
  side?: Side;
  max?: number;
  min?: number;
  basis?: number;
  absolute?: boolean;
  onMouseDown?: ((e: MouseEvent) => void) | null;
  onUpdate?: ((dimension: number) => void) | null;
  onMouseUp?: (() => void) | null;
  disabled?: boolean;
  justify?: Justify;
  hang?: boolean;
  children?: ReactNode;
}) {
  const effectiveSide: Side = side ?? (direction === "EW" ? "left" : "top");
  const [resizing, setResizing] = useState(false);
  const [hover, setHover] = useState(false);
  const startRef = useRef(0);
  const startingDimensionRef = useRef(dimension);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const dimensionRef = useRef(dimension);
  dimensionRef.current = dimension;

  const handleMouseUp = () => {
    setResizing(false);
    setHover(false);
    if (onMouseUp) onMouseUp();
    window.removeEventListener("mousemove", onMouseMove);
    window.removeEventListener("mouseup", handleMouseUp);
  };

  const onMouseMove = (e: globalThis.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    let delta = 0;
    if (direction === "EW") {
      delta = effectiveSide === "left" ? startRef.current - e.clientX : e.clientX - startRef.current;
    } else {
      delta = effectiveSide === "top" ? startRef.current - e.clientY : e.clientY - startRef.current;
    }
    requestAnimationFrame(() => {
      const next = Math.min(max, Math.max(min, startingDimensionRef.current + delta));
      dimensionRef.current = next;
      if (onUpdate) onUpdate(next);
    });
  };

  const handleMousedown = (e: MouseEvent) => {
    startingDimensionRef.current = dimensionRef.current;
    setResizing(true);
    startRef.current = direction === "EW" ? e.clientX : e.clientY;
    if (onMouseDown) onMouseDown(e);
    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
  };

  const handleDoubleClick = () => {
    dimensionRef.current = basis;
    if (onUpdate) onUpdate(basis);
  };

  const className = [
    absolute ? "absolute" : "",
    "flex-none pointer-events-auto flex items-center",
    direction === "EW" ? "w-2 h-full cursor-col-resize" : "w-full h-2 pr-8 cursor-row-resize",
    effectiveSide,
    `justify-${justify}`,
    hang ? "hang" : "",
    dimension === min ? "minned" : "",
    dimension === max ? "maxed" : "",
    disabled ? "cursor-default" : "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <button
      type="button"
      disabled={disabled}
      className={className}
      onMouseDown={(e) => {
        e.stopPropagation();
        e.preventDefault();
        handleMousedown(e);
      }}
      onDoubleClick={(e) => {
        e.stopPropagation();
        handleDoubleClick();
      }}
      onMouseEnter={() => {
        if (timeoutRef.current) clearTimeout(timeoutRef.current);
        timeoutRef.current = setTimeout(() => setHover(true), 150);
      }}
      onMouseLeave={() => {
        if (timeoutRef.current) clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
        setHover(false);
      }}
    >
      {hover || resizing ? children : null}
    </button>
  );
}
