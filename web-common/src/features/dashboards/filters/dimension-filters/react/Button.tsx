import type { MouseEvent as ReactMouseEvent, ReactNode } from "react";

export interface ButtonProps {
  type?: "primary" | "secondary" | "tertiary" | "ghost" | "link" | "text";
  disabled?: boolean;
  className?: string;
  onClick?: (event: ReactMouseEvent<HTMLButtonElement>) => void;
  children?: ReactNode;
}

/**
 * Minimal React stand-in for the Svelte `Button` component. Translates the subset of
 * `ButtonType` styling used by the dimension filter UI (primary + tertiary).
 */
export default function Button({
  type = "tertiary",
  disabled = false,
  className = "",
  onClick,
  children,
}: ButtonProps) {
  const base =
    "flex flex-none text-center items-center justify-center text-xs leading-snug font-normal " +
    "select-none cursor-pointer rounded-[2px] px-3 gap-x-2 h-7 min-h-[28px] min-w-fit " +
    "font-medium pointer-events-auto";
  const typeClasses =
    type === "primary"
      ? "bg-accent-primary text-fg-inverse disabled:opacity-50"
      : type === "secondary"
        ? "bg-transparent border border-accent-primary-action text-accent-primary-action disabled:opacity-50"
        : "bg-input text-fg-primary border disabled:opacity-50";

  return (
    <button
      type="button"
      role="button"
      disabled={disabled}
      aria-disabled={disabled}
      className={`${base} ${typeClasses} ${className}`}
      onClick={onClick}
    >
      {children}
    </button>
  );
}
