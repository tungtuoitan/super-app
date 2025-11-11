import { cn } from "@/lib/utils";
import React from "react";

export interface IToolbarContainer {
    children: React.ReactNode;
    className?: string;
}

/**
 * Toolbar container component matching portal's ToolbarContainer
 * Provides a consistent styled toolbar for grid layouts
 */
export const ToolbarContainer = ({
    children,
    className,
}: {
    children: React.ReactNode;
    className?: string;
}) => {
    return (
        <div
            className={cn(
                "flex-grow",
                "[&_.isImportant-icon-false]:text-[#D8D8D7]",
                "[&_.isImportant-icon-true]:text-[#C70039]",
                "[&_.selected-true]:bg-[#D8D8D7]",
                className
            )}
        >
            <header
                className="mt-[3px] bg-white shadow-md static"
            >
                <div className="bg-white text-black pl-[18px] min-h-[56px] flex items-center">
                    {children}
                </div>
            </header>
        </div>
    );
};
