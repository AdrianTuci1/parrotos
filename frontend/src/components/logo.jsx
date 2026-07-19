import * as React from "react"

export const LogoIcon = (props) => (
  <img src='/logo.svg' width='35px'></img>
);

export const Logo = ({ className, ...props }) => (
  <div className={`flex items-center gap-2 font-bold text-xl tracking-tight select-none text-foreground ${className || ""}`} {...props}>
    <LogoIcon className="h-[35px] w-[35px]" />
    <span>Parrot</span>
  </div>
);
