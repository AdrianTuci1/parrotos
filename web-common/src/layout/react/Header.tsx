// React translation of `layout/header/Header.svelte` — the application
// top-bar wrapper. Children fill the default slot; `borderBottom` toggles the
// bottom border (kept transparent on deploy/preview pages).
import type { ReactNode } from "react";

export default function Header({
  borderBottom = false,
  children,
}: {
  borderBottom?: boolean;
  children?: ReactNode;
}) {
  return (
    <header
      className={`flex items-center w-full pr-4 pl-2 py-1 bg-surface-base ${borderBottom ? "border-b" : "border-transparent border-b"}`}
    >
      {children}
    </header>
  );
}
