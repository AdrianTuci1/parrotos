// React translation of `layout/navigation/SurfaceControlButton.svelte` — the
// floating control that toggles the navigation sidebar. The Svelte `Button`
// primitive is rendered as a plain `<button>` here (secondary when the nav is
// open, ghost when closed), reproducing the `square` glyph-in-a-box look.
import { m } from "@rilldata/web-common/lib/i18n/gen/messages";
import { HideSidebarIcon, SurfaceViewIcon } from "./icons";

export interface SurfaceControlButtonProps {
  navWidth: number;
  navOpen: boolean;
  resizing?: boolean;
  show?: boolean;
  onClick: () => void;
}

export default function SurfaceControlButton({
  navWidth,
  navOpen,
  resizing = false,
  show = true,
  onClick,
}: SurfaceControlButtonProps) {
  const label = navOpen ? m.nav_close_sidebar() : m.nav_show_sidebar();

  return (
    <span
      className={`text-fg-secondary rounded flex justify-center items-center absolute z-50 w-6 h-6 mt-[10px] ${resizing ? "" : "transition-all duration-300 ease-in-out"} ${show ? "" : "opacity-0"} ${navOpen ? "" : "shift"}`}
      style={{ left: navOpen ? `${navWidth - 32}px` : "12px" }}
      aria-label={label}
      title={label}
    >
      <button
        type="button"
        aria-label={label}
        onClick={onClick}
        className={[
          "flex flex-none text-center items-center justify-center",
          "text-xs leading-snug font-normal select-none cursor-pointer",
          "rounded-[2px] gap-x-2 h-7 min-h-[28px] min-w-fit font-medium pointer-events-auto",
          "p-0 aspect-square text-ellipsis overflow-hidden whitespace-nowrap flex-grow-0 flex-shrink-0",
          navOpen
            ? "bg-transparent border border-accent-primary-action text-accent-primary-action"
            : "bg-transparent text-fg-primary",
        ].join(" ")}
      >
        {navOpen ? (
          <HideSidebarIcon side="left" open={navOpen} size="18px" />
        ) : (
          <SurfaceViewIcon size="16px" />
        )}
      </button>
    </span>
  );
}
