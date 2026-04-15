/**
 * Shared Button Component
 * Reusable button component with consistent styling and behavior
 */

import React from "react";
import { Button as ShadcnButton } from "@/Components/ui/button";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    children: React.ReactNode;
    onClick?: () => void;
    variant?: "primary" | "secondary" | "danger" | "text" | "ghost";
    disabled?: boolean;
    loading?: boolean;
    fullWidth?: boolean;
}

export function Button({ children, onClick, variant = "primary", disabled = false, loading = false, fullWidth = false, className, ...props }: ButtonProps) {
    const getShadcnVariant = () => {
        switch (variant) {
            case "primary":
                return "default";
            case "secondary":
                return "outline";
            case "danger":
                return "destructive";
            case "text":
                return "link";
            case "ghost":
                return "ghost";
            default:
                return "default";
        }
    };

    return (
        <ShadcnButton variant={getShadcnVariant()} onClick={onClick} disabled={disabled || loading} className={cn("min-w-[100px]", fullWidth && "w-full", className)} {...props}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : children}
        </ShadcnButton>
    );
}
