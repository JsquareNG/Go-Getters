import * as React from "react";
import * as PopoverPrimitive from "@radix-ui/react-popover";
import { cn } from "@/lib/utils";

const Popover = PopoverPrimitive.Root;
const PopoverTrigger = PopoverPrimitive.Trigger;

const PopoverContent = React.forwardRef(
  (
    {
      className,
      align = "end",
      side = "bottom",
      sideOffset = 8,
      ...props
    },
    ref,
  ) => (
    <PopoverPrimitive.Portal>
      <PopoverPrimitive.Content
        ref={ref}
        align={align}
        side={side}
        sideOffset={sideOffset}
        avoidCollisions
        collisionPadding={12}
        sticky="partial"
        updatePositionStrategy="always"
        // ✅ this is the big one for fixed headers / scroll containers
        // (Radix supports this prop)
        // If your Radix version doesn't, see Fix B below.
        strategy="fixed"
        className={cn(
          "z-50 rounded-md border bg-white text-popover-foreground shadow-md outline-none",
          // ✅ clamp width so it NEVER becomes 500px+
          "w-[360px] max-w-[calc(100vw-16px)]",
          // ✅ if content is long, don't grow wider — wrap instead
          "break-words",
          // animations (keep yours)
          "data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95",
          "data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2",
          className,
        )}
        {...props}
      />
    </PopoverPrimitive.Portal>
  ),
);

PopoverContent.displayName = PopoverPrimitive.Content.displayName;

export { Popover, PopoverTrigger, PopoverContent };