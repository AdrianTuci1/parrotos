/**
 * React translation of `super-pill/components/SyntaxElement.svelte`. Renders a range
 * as a monospace syntax chip. Renders a non-interactive span unless an `onClick` is
 * provided, in which case it becomes a button.
 */
export interface SyntaxElementProps {
  range: string | undefined;
  dark?: boolean;
  onClick?: ((range: string | undefined) => void) | undefined;
  className?: string;
}

export function SyntaxElement({
  range,
  dark = false,
  onClick,
}: SyntaxElementProps) {
  const base =
    "bg-surface-muted text-fg-secondary rounded-[2px] px-1 line-clamp-1 truncate flex-none h-5 flex items-center select-none cursor-default font-medium w-fit";
  const darkClass = dark ? "bg-gray-300 text-fg-inverse" : "";
  const hoverClass = "hover:bg-surface-hover";

  const className = `${base} ${darkClass} ${onClick ? hoverClass : ""}`;
  const role = onClick ? "button" : undefined;

  if (onClick) {
    return (
      <button
        type="button"
        role={role}
        className={className}
        onClick={() => onClick(range)}
      >
        {range}
      </button>
    );
  }

  return (
    <span role={role} className={className}>
      {range}
    </span>
  );
}
