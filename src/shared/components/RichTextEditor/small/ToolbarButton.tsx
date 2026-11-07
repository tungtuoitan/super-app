/**
 * RichTextEditor toolbar button (moved out of RichTextEditor.tsx, unchanged)
 */

import React from "react";
import { cn } from "@/lib/utils";
import type { ToolbarButtonProps } from "../richTextEditor.type";

export const ToolbarButton: React.FC<ToolbarButtonProps> = ({ onClick, isActive, disabled, children, title }) => (
    <button
        type="button"
        onClick={onClick}
        disabled={disabled}
        title={title}
        className={cn(
            "inline-flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground hover:bg-sa-hover-strong hover:text-foreground transition-colors duration-100",
            isActive && "bg-sa-hover-strong text-sa-amber-ink",
            disabled && "opacity-50 cursor-not-allowed"
        )}
    >
        {children}
    </button>
);
