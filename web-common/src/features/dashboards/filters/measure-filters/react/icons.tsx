import type { SVGProps } from "react";

const iconProps: SVGProps<SVGSVGElement> = {
  xmlns: "http://www.w3.org/2000/svg",
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 2,
  strokeLinecap: "round",
  strokeLinejoin: "round",
} as const;

/** React stand-in for `CaretDownIcon` (used for the measure chip caret). */
export function CaretDownIcon({
  size = "10px",
}: {
  size?: string;
}) {
  return (
    <svg {...iconProps} width={size} height={size} aria-hidden="true">
      <path d="m6 9 6 6 6-6" />
    </svg>
  );
}

/** React stand-in for the `CancelCircle` icon (remove button on a chip). */
export function CancelCircleIcon({
  size = "16px",
}: {
  size?: string;
}) {
  return (
    <svg {...iconProps} width={size} height={size} aria-hidden="true">
      <circle cx="12" cy="12" r="10" />
      <path d="m15 9-6 6" />
      <path d="m9 9 6 6" />
    </svg>
  );
}

/** React stand-in for the `Pin` / `PinOff` icons used by the measure chip + pin toggle. */
export function PinIcon({
  pinned,
  size = "15",
}: {
  pinned: boolean;
  size?: string | number;
}) {
  return (
    <svg
      {...iconProps}
      width={size}
      height={size}
      fill={pinned ? "currentColor" : "none"}
      aria-hidden="true"
    >
      <path d="M12 17v5" />
      <path d="M9 10.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24V16a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-.76a2 2 0 0 0-1.11-1.79l-1.78-.9A2 2 0 0 1 15 10.76V7h1a2 2 0 0 0 0-4H8a2 2 0 0 0 0 4h1z" />
    </svg>
  );
}
