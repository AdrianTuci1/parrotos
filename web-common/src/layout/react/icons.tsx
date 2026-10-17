// React stand-ins for the Svelte icon components used by the Parrot layout shell.
// Each SVG is reproduced from its Svelte source (icons/Parrot.svelte,
// icons/HideSidebar.svelte, icons/SurfaceView.svelte, icons/Github.svelte,
// icons/InfoCircle.svelte). The animated tween in SurfaceView.svelte is dropped
// and only the static `hamburger` form is transferred, matching the rest of the
// port.

export function ParrotLogoIcon({
  width = "27",
  height = "21",
  mode = "adapt",
}: {
  width?: string;
  height?: string;
  mode?: "light" | "dark" | "adapt";
}) {
  // Same rules as `components/icons/Parrot.svelte`: the supplied mark is
  // near-black, with a light fallback so it stays visible on dark surfaces.
  const fillA =
    mode === "dark"
      ? "fill-neutral-100"
      : mode === "light"
        ? "fill-[#0E0E0E]"
        : "fill-[#0E0E0E] dark:fill-neutral-100";
  const fillB =
    mode === "dark"
      ? "fill-neutral-100"
      : mode === "light"
        ? "fill-[#101010]"
        : "fill-[#101010] dark:fill-neutral-100";
  const stroke =
    mode === "dark"
      ? "stroke-neutral-100"
      : mode === "light"
        ? "stroke-black"
        : "stroke-black dark:stroke-neutral-100";
  return (
    <svg
      width={width}
      height={height}
      viewBox="0 0 504 385"
      className="mb-[1px] flex-none"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M196 126.484L503 0.483887C456.167 12.6506 359.2 37.9839 346 41.9839C238.8 -0.0161133 201.333 80.8172 196 126.484Z"
        className={`${fillA} ${stroke}`}
      />
      <path
        d="M327.5 107.484L138.5 384.984L152 233.984L0 195.984L327.5 107.484Z"
        className={fillB}
      />
    </svg>
  );
}

export function HideSidebarIcon({
  size = "1em",
  color = "currentColor",
  open = false,
  side = "right",
}: {
  size?: string;
  color?: string;
  open?: boolean;
  side?: "left" | "right";
}) {
  return (
    <svg
      height={size}
      width={size}
      viewBox="0 0 24 24"
      transform={side === "left" ? "scale(-1, 1)" : ""}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M22 5.5C22 4.67163 21.3284 4 20.5 4H3.5C2.67163 4 2 4.67163 2 5.5V18.5C2 19.3284 2.67163 20 3.5 20H20.5C21.3284 20 22 19.3284 22 18.5V5.5ZM20.5 6C20.5 5.72386 20.2761 5.5 20 5.5H16C15.7239 5.5 15.5 5.72386 15.5 6V18C15.5 18.2761 15.7239 18.5 16 18.5H20C20.2761 18.5 20.5 18.2761 20.5 18V6ZM3.5 6C3.5 5.72386 3.72386 5.5 4 5.5H13.5C13.7761 5.5 14 5.72386 14 6V18C14 18.2761 13.7761 18.5 13.5 18.5H4C3.72386 18.5 3.5 18.2761 3.5 18V6Z"
        fill={color}
      />
      {open ? (
        <path
          d="M16.75 17.625C16.6119 17.625 16.5 17.5131 16.5 17.375L16.5 6.625C16.5 6.48693 16.6119 6.375 16.75 6.375L19.25 6.375C19.3881 6.375 19.5 6.48693 19.5 6.625L19.5 17.375C19.5 17.5131 19.3881 17.625 19.25 17.625H16.75Z"
          fill={color}
        />
      ) : (
        <path
          d="M19.5 7.625C19.5 7.55596 19.444 7.5 19.375 7.5H16.625C16.556 7.5 16.5 7.55596 16.5 7.625V8.375C16.5 8.44404 16.556 8.5 16.625 8.5H19.375C19.444 8.5 19.5 8.44404 19.5 8.375V7.625Z"
          fill={color}
        />
      )}
    </svg>
  );
}

export function SurfaceViewIcon({
  size = "1em",
  color = "currentColor",
}: {
  size?: string;
  color?: string;
}) {
  // Static `hamburger` form of `icons/SurfaceView.svelte`.
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" aria-hidden="true">
      <line
        x1={15}
        x2={85}
        y1={25}
        y2={25}
        stroke={color}
        strokeWidth={12}
        strokeLinecap="round"
      />
      <line
        x1={30}
        x2={70}
        y1={50}
        y2={50}
        stroke={color}
        strokeWidth={12}
        strokeLinecap="round"
      />
      <line
        x1={15}
        x2={85}
        y1={75}
        y2={75}
        stroke={color}
        strokeWidth={12}
        strokeLinecap="round"
      />
    </svg>
  );
}

export function GithubIcon({
  size = "1em",
  className = "",
  color = "currentColor",
}: {
  size?: string;
  className?: string;
  color?: string;
}) {
  return (
    <svg
      height={size}
      width={size}
      viewBox="0 0 16 16"
      className={className}
      fill={color}
      aria-hidden="true"
    >
      <path d="M7.99375 1.19141C4.12969 1.18984 1 4.31797 1 8.17891C1 11.232 2.95781 13.8273 5.68437 14.7805C6.05156 14.8727 5.99531 14.6117 5.99531 14.4336V13.2227C3.875 13.4711 3.78906 12.068 3.64687 11.8336C3.35937 11.343 2.67969 11.218 2.88281 10.9836C3.36562 10.7352 3.85781 11.0461 4.42812 11.8883C4.84062 12.4992 5.64531 12.3961 6.05312 12.2945C6.14219 11.9273 6.33281 11.5992 6.59531 11.3445C4.39844 10.9508 3.48281 9.61016 3.48281 8.01641C3.48281 7.24297 3.7375 6.53203 4.2375 5.95859C3.91875 5.01328 4.26719 4.20391 4.31406 4.08359C5.22187 4.00234 6.16562 4.73359 6.23906 4.79141C6.75469 4.65234 7.34375 4.57891 8.00312 4.57891C8.66562 4.57891 9.25625 4.65547 9.77656 4.79609C9.95312 4.66172 10.8281 4.03359 11.6719 4.11016C11.7172 4.23047 12.0578 5.02109 11.7578 5.95391C12.2641 6.52891 12.5219 7.24609 12.5219 8.02109C12.5219 9.61797 11.6 10.9602 9.39687 11.3477C9.58558 11.5332 9.73541 11.7546 9.83762 11.9987C9.93984 12.2428 9.99238 12.5049 9.99219 12.7695V14.5273C10.0047 14.668 9.99219 14.807 10.2266 14.807C12.9937 13.8742 14.9859 11.2602 14.9859 8.18047C14.9859 4.31797 11.8547 1.19141 7.99375 1.19141Z" />
    </svg>
  );
}

export function InfoCircleIcon({
  size = "1em",
  color = "currentColor",
}: {
  size?: string;
  color?: string;
}) {
  return (
    <svg
      height={size}
      width={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="10" />
      <path d="M12 16v-4" />
      <path d="M12 8h.01" />
    </svg>
  );
}

export { CaretDownIcon } from "@statsparrot/web-common/features/dashboards/time-controls/super-pill/new-time-dropdown/react/icons";
