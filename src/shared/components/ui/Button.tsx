/**
 * Shared Button Component
 * Reusable button component with consistent styling and behavior
 */

import React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

// ============================================
// SHADCN BUTTON (base component)
// ============================================

const buttonVariants = cva(
    "inline-flex items-center justify-center gap-1.5 whitespace-nowrap rounded-lg text-[13px] font-medium ring-offset-background transition-colors duration-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
    {
        variants: {
            variant: {
                default: "bg-primary text-primary-foreground hover:bg-primary/90",
                destructive: "border border-sa-danger/40 bg-transparent text-sa-danger hover:bg-sa-danger/10",
                outline: "border border-sa-border-strong bg-transparent hover:bg-sa-hover-strong hover:text-accent-foreground",
                secondary: "bg-secondary text-secondary-foreground hover:bg-accent",
                ghost: "hover:bg-sa-hover-strong hover:text-accent-foreground",
                link: "text-foreground underline-offset-4 hover:underline",
            },
            size: {
                default: "h-8 px-3",
                sm: "h-7 rounded-md px-2.5 text-xs",
                lg: "h-10 px-5 text-sm",
                icon: "h-8 w-8",
            },
        },
        defaultVariants: {
            variant: "default",
            size: "default",
        },
    },
);

export interface ShadcnButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof buttonVariants> {
    asChild?: boolean;
}

const ShadcnButton = React.forwardRef<HTMLButtonElement, ShadcnButtonProps>(({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return <Comp className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props} />;
});
ShadcnButton.displayName = "ShadcnButton";

export { ShadcnButton, buttonVariants };

// ============================================
// WRAPPER BUTTON (app-level component)
// ============================================

type AppVariant = "primary" | "secondary" | "danger" | "text" | "ghost";
type ShadcnVariant = "default" | "destructive" | "outline" | "secondary" | "ghost" | "link";

export interface ButtonProps extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, "onClick"> {
    children?: React.ReactNode;
    onClick?: (() => void) | (() => Promise<void>) | React.MouseEventHandler<HTMLButtonElement>;
    variant?: AppVariant | ShadcnVariant;
    size?: "default" | "sm" | "lg" | "icon";
    disabled?: boolean;
    loading?: boolean;
    fullWidth?: boolean;
    asChild?: boolean;
}

const variantMap: Record<AppVariant, ShadcnVariant> = {
    primary: "default",
    danger: "destructive",
    text: "link",
    secondary: "outline",
    ghost: "ghost",
};

function resolveVariant(variant: AppVariant | ShadcnVariant): ShadcnVariant {
    return (variantMap as Record<string, ShadcnVariant>)[variant as string] ?? (variant as ShadcnVariant);
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(({ children, onClick, variant = "primary", size, disabled = false, loading = false, fullWidth = false, className, asChild, ...props }, ref) => {
    return (
        <ShadcnButton ref={ref} variant={resolveVariant(variant)} size={size} onClick={onClick as React.MouseEventHandler<HTMLButtonElement>} disabled={disabled || loading} asChild={asChild} className={cn(fullWidth && "w-full", className)} {...props}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : children}
        </ShadcnButton>
    );
});
Button.displayName = "Button";

export { Button, resolveVariant };
