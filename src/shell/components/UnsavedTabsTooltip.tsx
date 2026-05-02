/**
 * UnsavedTabsTooltip - Reusable tooltip component for blocking actions when unsaved tabs exist
 * Used in ActivityBar and WorkspaceView to prevent navigation with unsaved changes
 */

import { ReactNode } from "react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/shared";
import {useEditorTabBarStore} from "../store/EditorTab.store";
import { isTabNewEntity } from "../types/tab.types";
import { shellConstants } from "../shell.constants";

interface UnsavedTabsTooltipProps {
    children: ReactNode;
    side?: "top" | "right" | "bottom" | "left";
    /** Custom message prefix. Default: "Cannot switch" */
    actionText?: string;
    /** Normal label to show when no unsaved tabs. If provided, will show this label tooltip instead of no tooltip */
    normalLabel?: string;
}

/**
 * Tooltip wrapper that shows warning when unsaved tabs exist
 * Automatically checks for unsaved tabs and displays appropriate message
 */
export function UnsavedTabsTooltip({ 
    children, 
    side = "right",
    actionText = "Cannot switch",
    normalLabel
}: UnsavedTabsTooltipProps) {
    const { openTabs } = useEditorTabBarStore();
    // const { currentWorkspace } = useWorkspaceStore();

    // Check if there are unsaved tabs (exclude multiProject tabs which don't have an entity id)
    const hasUnsavedTabs = openTabs.some((tab) => {
        if (tab.type === shellConstants.vscode.tab.tabTypes.multiProject) return false;
        return isTabNewEntity(tab);
    });


    // Show tooltip with unsaved tabs warning
    if (hasUnsavedTabs) {
        return (
            <TooltipProvider delayDuration={0}>
                <Tooltip>
                    <TooltipTrigger asChild>
                        {children}
                    </TooltipTrigger>
                    <TooltipContent side={side} className="max-w-xs py-2 px-4">
                        <p className="font-medium mb-1">⚠️ {actionText}</p>
                        <p className="text-sm text-gray-500">Please save unsaved files first</p>
                        {/* <ul className="text-sm mt-1 list-disc list-inside text-gray-500">
                            {unsavedTabTitles.map((title, idx) => (
                                <li key={idx}>{title.length > 20 ? title.slice(0, 20) + "..." : title}</li>
                            ))}
                        </ul> */}
                    </TooltipContent>
                </Tooltip>
            </TooltipProvider>
        );
    }

    // If normalLabel provided, show normal tooltip
    if (normalLabel) {
        return (
            <TooltipProvider>
                <Tooltip>
                    <TooltipTrigger asChild>
                        {children}
                    </TooltipTrigger>
                    <TooltipContent side={side}>
                        <p>{normalLabel}</p>
                    </TooltipContent>
                </Tooltip>
            </TooltipProvider>
        );
    }

    // No unsaved tabs and no label, render children without tooltip
    return <>{children}</>;
}
