"use client"

import * as React from "react"
import { Select as SelectPrimitive } from "@base-ui/react/select"

import { cn } from "@/lib/utils"
import { CheckIcon, ChevronDownIcon } from "lucide-react"

function Select({ className, ...props }) {
  return (
    <SelectPrimitive.Root
      data-slot="select"
      className={cn("group/select", className)}
      {...props}
    />
  );
}

function SelectValue({ className, ...props }) {
  return (
    <SelectPrimitive.Value
      data-slot="select-value"
      className={cn("truncate", className)}
      {...props}
    />
  );
}

function SelectTrigger({ className, children, ...props }) {
  return (
    <SelectPrimitive.Trigger
      data-slot="select-trigger"
      className={cn(
        "group flex h-8 w-full select-none items-center justify-between gap-2 rounded-[2px] border border-input px-2 py-1 text-sm text-foreground outline-none transition-[border,box-shadow,color] data-placeholder:text-muted-foreground data-popup-open:border-ring focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/25 disabled:pointer-events-none disabled:opacity-50",
        className
      )}
      {...props}>
      {children ?? <SelectValue />}
      <SelectIcon />
    </SelectPrimitive.Trigger>
  );
}

function SelectIcon({ className, ...props }) {
  return (
    <SelectPrimitive.Icon
      data-slot="select-icon"
      className={cn(
        "shrink-0 text-muted-foreground transition-[transform,color] duration-150 group-data-popup-open:rotate-180 group-data-popup-open:text-foreground",
        className
      )}
      {...props}>
      <ChevronDownIcon className="h-3 w-3" />
    </SelectPrimitive.Icon>
  );
}

function SelectContent({
  className,
  children,
  sideOffset = 4,
  ...props
}) {
  return (
    <SelectPrimitive.Portal>
      <SelectPrimitive.Positioner className="isolate z-50" sideOffset={sideOffset}>
        <SelectPrimitive.Popup
          data-slot="select-content"
          className={cn(
            "relative z-50 min-w-(--anchor-width) overflow-hidden rounded-[2px] border border-border bg-popover p-1 text-popover-foreground shadow-md data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95 data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-95",
            className
          )}
          {...props}>
          <SelectPrimitive.List className="w-full p-0">{children}</SelectPrimitive.List>
        </SelectPrimitive.Popup>
      </SelectPrimitive.Positioner>
    </SelectPrimitive.Portal>
  );
}

function SelectItem({ className, children, ...props }) {
  return (
    <SelectPrimitive.Item
      data-slot="select-item"
      className={cn(
        "relative flex w-full cursor-pointer select-none items-center rounded-[2px] py-1.5 pl-2 pr-8 text-sm outline-none data-highlighted:bg-accent data-highlighted:text-accent-foreground data-selected:font-medium data-disabled:pointer-events-none data-disabled:opacity-50",
        className
      )}
      {...props}>
      <span className="pointer-events-none absolute right-2 flex h-3.5 w-3.5 items-center justify-center">
        <SelectPrimitive.ItemIndicator>
          <CheckIcon className="h-3 w-3" />
        </SelectPrimitive.ItemIndicator>
      </span>
      <SelectPrimitive.ItemText className="flex-1 truncate">
        {children}
      </SelectPrimitive.ItemText>
    </SelectPrimitive.Item>
  );
}

function SelectLabel({ className, ...props }) {
  return (
    <SelectPrimitive.GroupLabel
      data-slot="select-label"
      className={cn("px-2 py-1.5 text-sm font-semibold", className)}
      {...props}
    />
  );
}

function SelectSeparator({ className, ...props }) {
  return (
    <SelectPrimitive.Separator
      data-slot="select-separator"
      className={cn("-mx-1 my-1 h-px bg-border", className)}
      {...props}
    />
  );
}

export {
  Select,
  SelectValue,
  SelectTrigger,
  SelectIcon,
  SelectContent,
  SelectItem,
  SelectLabel,
  SelectSeparator,
}
