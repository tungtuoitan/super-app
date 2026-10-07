import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const badgeVariants = cva(
    "inline-flex h-5 items-center gap-1 rounded-md border px-1.5 text-[11px] font-medium transition-colors duration-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-1",
    {
        variants: {
            variant: {
                default: "border-sa-border-strong bg-sa-surface-2 text-foreground",
                secondary: "border-transparent bg-sa-hover-strong text-muted-foreground",
                destructive: "border-sa-danger/35 bg-transparent text-sa-danger",
                outline: "border-sa-border-strong text-muted-foreground",
            },
        },
        defaultVariants: {
            variant: "default",
        },
    },
);

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement>, VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
    return <div className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { Badge, badgeVariants };
