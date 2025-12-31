/**
 * Spinner Component
 * Loading spinner with consistent styling
 */

import React from "react";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface SpinnerProps {
    size?: number;
    fullPage?: boolean;
    message?: string;
    className?: string;
}

export function Spinner({ size = 40, fullPage = false, message, className }: SpinnerProps) {
    const content = (
        <>
            <Loader2 className={cn("animate-spin text-primary", className)} size={size} />
            {message && <div className="mt-2 text-center text-muted-foreground">{message}</div>}
        </>
    );

    if (fullPage) {
        return <div className="flex flex-col justify-center items-center h-screen w-full">{content}</div>;
    }

    return <div className="flex flex-col justify-center items-center p-5">{content}</div>;
}
