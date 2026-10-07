import * as React from "react";
import * as CheckboxPrimitive from "@radix-ui/react-checkbox";
import { Check } from "lucide-react";

import { cn } from "@/lib/utils";

const Checkbox = React.forwardRef<React.ElementRef<typeof CheckboxPrimitive.Root>, React.ComponentPropsWithoutRef<typeof CheckboxPrimitive.Root>>(
    ({ className, ...props }, ref) => (
        <CheckboxPrimitive.Root
            ref={ref}
            className={cn(
                "peer h-3.5 w-3.5 shrink-0 rounded-[4px] border border-muted-foreground/60 ring-offset-background transition-colors duration-100 hover:border-foreground/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 disabled:cursor-not-allowed disabled:opacity-50 data-[state=checked]:border-sa-amber data-[state=checked]:bg-sa-amber data-[state=checked]:text-sa-on-amber data-[state=indeterminate]:border-sa-amber data-[state=indeterminate]:bg-sa-amber data-[state=indeterminate]:text-sa-on-amber",
                className,
            )}
            {...props}
        >
            <CheckboxPrimitive.Indicator className={cn("flex items-center justify-center text-current")}>
                <Check className="h-3 w-3" strokeWidth={3} />
            </CheckboxPrimitive.Indicator>
        </CheckboxPrimitive.Root>
    ),
);
Checkbox.displayName = CheckboxPrimitive.Root.displayName;

export { Checkbox };
