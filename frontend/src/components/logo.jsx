import * as React from "react"

export const LogoIcon = (props) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2.2"
    strokeLinecap="round"
    strokeLinejoin="round"
    {...props}
  >
    <path d="M16 7h.01" />
    <path d="M3.4 18H12a4 4 0 0 0 4-4V7a4 4 0 0 0-4-4H3.4a2 2 0 0 0-1.8 3L4 10.5 1.6 15a2 2 0 0 0 1.8 3Z" />
    <path d="M19 13h2a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-2" />
    <path d="M16 17v2a2 2 0 0 1-2 2H8" />
  </svg>
);

export const Logo = ({ className, ...props }) => (
  <div className={`flex items-center gap-2 font-bold text-xl tracking-tight select-none text-foreground ${className || ""}`} {...props}>
    <LogoIcon className="h-5 w-5 shrink-0" />
    <span>Parrot</span>
  </div>
);
