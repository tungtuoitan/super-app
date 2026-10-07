import * as React from "react"
import * as SliderPrimitive from "@radix-ui/react-slider"

import { cn } from "@/lib/utils"

const Slider = React.forwardRef<
  React.ElementRef<typeof SliderPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof SliderPrimitive.Root>
>(({ className, ...props }, ref) => (
  <SliderPrimitive.Root
    ref={ref}
    className={cn(
      "relative flex w-full touch-none select-none items-center",
      className
    )}
    {...props}
  >
    <SliderPrimitive.Track className="relative h-1 w-full grow overflow-hidden rounded-full bg-sa-border-strong">
      <SliderPrimitive.Range className="absolute h-full bg-sa-amber/70" />
    </SliderPrimitive.Track>
    <SliderPrimitive.Thumb className="relative block h-3.5 w-3.5 rounded-full border border-sa-amber bg-background hover:bg-accent ring-offset-background transition-colors duration-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 data-[state=active]:bg-sa-amber disabled:pointer-events-none disabled:opacity-50 before:content-[''] before:absolute before:inset-[-8px] before:rounded-full" />
    <SliderPrimitive.Thumb className="relative block h-3.5 w-3.5 rounded-full border border-sa-amber bg-background hover:bg-accent ring-offset-background transition-colors duration-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 data-[state=active]:bg-sa-amber disabled:pointer-events-none disabled:opacity-50 before:content-[''] before:absolute before:inset-[-8px] before:rounded-full" />
  </SliderPrimitive.Root>
))
Slider.displayName = SliderPrimitive.Root.displayName

export { Slider }
