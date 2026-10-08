import React, { useState } from "react";
import type { WorkspaceLink } from "@/features/note";
import {useWorkspaceStore} from "../../store/workspace.store";

interface StatusDotProps {
    isUnsaved: boolean;
    isDuplicate: boolean;
    itemType: "Note" | "File" | "Link" | "Folder";
    itemName: string;
    targetWorkspaceName?: string;
    workspaceLinks?: WorkspaceLink[]; // List of workspaces that link to this item
    onWorkspaceClick?: (workspaceId: number, workspaceItemId: number) => void; // Callback when workspace is clicked
}

export function StatusDot({ isUnsaved, isDuplicate, itemType, itemName, targetWorkspaceName, workspaceLinks, onWorkspaceClick }: StatusDotProps) {
    const [showTooltip, setShowTooltip] = useState(false);
    const {selectedWorkspaceId} = useWorkspaceStore();

    // Calculate total workspace links (excluding current workspace if in workspace tree)
    const workspaceLinkCount = workspaceLinks?.length || 0;
    // Only show badge when there are MORE than 1 workspace (>1, not >=1)
    const hasMultipleWorkspaces = workspaceLinkCount > 1;

    if (!isUnsaved && !isDuplicate && !hasMultipleWorkspaces) {
        return null;
    }

    // Badge color
    const badgeColor = isUnsaved ? "bg-sa-good" : hasMultipleWorkspaces ? "bg-sa-amber/80" : "bg-sa-amber/50";

    // Build tooltip message
    let tooltipContent: React.ReactNode;
    if (isUnsaved) {
        tooltipContent = `New ${itemType}`;
    } else if (hasMultipleWorkspaces && workspaceLinks) {
        // Sort workspace links alphabetically by workspace name
        const sortedWorkspaceLinks = [...workspaceLinks].sort((a, b) => a.workspaceName.localeCompare(b.workspaceName));
        tooltipContent = (
            <div className="flex flex-col gap-1">
                <div className="mb-1 text-left text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                    Another locations:
                </div>
                {sortedWorkspaceLinks.map((link) => (
                    <div
                        key={link.workspaceItemId}
                        onClick={(e) => {
                            e.stopPropagation();
                            if(link.workspaceId !== selectedWorkspaceId) 
                                onWorkspaceClick?.(link.workspaceId, link.workspaceItemId);
                        }}
                        className={`text-left py-0.5 ${link.workspaceId === selectedWorkspaceId ? "text-muted-foreground" : "cursor-pointer text-foreground/80 hover:text-foreground hover:underline underline-offset-2"}`}
                    >
                        • {link.workspaceName.length > 30 ? link.workspaceName.slice(0, 27) + "..." : link.workspaceName} {link.workspaceId === selectedWorkspaceId ? "(current)" : ""}
                    </div>
                ))}
            </div>
        );
    } else if (isDuplicate && targetWorkspaceName) {
        tooltipContent = `This ${itemType.toLowerCase()} is existing in workspace "${targetWorkspaceName}" also`;
    }

    return (
        <div
            className="relative flex items-center justify-center w-5 h-5 ml-auto mr-1 cursor-pointer"
            onMouseEnter={() => setShowTooltip(true)}
            onMouseLeave={() => setShowTooltip(false)}
        >
            {/* Badge */}
            <div className={`w-1.5 h-1.5 rounded-full ${badgeColor}`} />

            {/* Tooltip */}
            {showTooltip && tooltipContent && (
                <div className="absolute bottom-full mb-2 right-5 top-[-20px] z-50 pointer-events-auto w-40" onClick={(e) => e.stopPropagation()}>
                    <div className="bg-popover text-popover-foreground border border-sa-border-strong sa-shadow-pop text-xs py-2.5 px-3 rounded-lg">{tooltipContent}</div>
                </div>
            )}
        </div>
    );
}
