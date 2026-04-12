import React, { useState } from "react";
import {useKStore} from "../../store/K.store";
import {WorkspaceLink} from "../../types/note.types";

interface StatusDotProps {
    isUnsaved: boolean;
    isDuplicate: boolean;
    itemType: "Note" | "File" | "Folder";
    itemName: string;
    targetWorkspaceName?: string;
    workspaceLinks?: WorkspaceLink[]; // List of workspaces that link to this item
    onWorkspaceClick?: (workspaceId: number, workspaceItemId: number) => void; // Callback when workspace is clicked
}

export function KStatusDot({ isUnsaved, isDuplicate, itemType, itemName, targetWorkspaceName, workspaceLinks, onWorkspaceClick }: StatusDotProps) {
    const [showTooltip, setShowTooltip] = useState(false);
    const {selectedKId} = useKStore();

    // Calculate total workspace links (excluding current workspace if in workspace tree)
    const workspaceLinkCount = workspaceLinks?.length || 0;
    // Only show badge when there are MORE than 1 workspace (>1, not >=1)
    const hasMultipleWorkspaces = workspaceLinkCount > 1; 

    if (!isUnsaved && !isDuplicate && !hasMultipleWorkspaces) {
        return null;
    }

    // Badge color
    const badgeColor = isUnsaved ? "bg-green-900 text-white" : hasMultipleWorkspaces ? "bg-yellow-900 text-white" : "dark:bg-yellow-900 text-white";

    // Build tooltip message
    let tooltipContent: React.ReactNode;
    if (isUnsaved) {
        tooltipContent = `New ${itemType}`;
    } else if (hasMultipleWorkspaces && workspaceLinks) {
        // Sort workspace links alphabetically by workspace name
        const sortedWorkspaceLinks = [...workspaceLinks].sort((a, b) => a.workspaceName.localeCompare(b.workspaceName));
        tooltipContent = (
            <div className="flex flex-col gap-1">
                <div className="font-semibold mb-1 text-left">
                    Another locations:
                </div>
                {sortedWorkspaceLinks.map((link) => (
                    <div
                        key={link.workspaceItemId}
                        onClick={(e) => {
                            e.stopPropagation();
                            if(link.workspaceId !== selectedKId) 
                                onWorkspaceClick?.(link.workspaceId, link.workspaceItemId);
                        }}
                        className={` text-left py-0.5 text-gray-400 ${link.workspaceId === selectedKId ? "" : "cursor-pointer hover:text-blue-400 hover:underline"}`}
                    >
                        • {link.workspaceName.length > 30 ? link.workspaceName.slice(0, 27) + "..." : link.workspaceName} {link.workspaceId === selectedKId ? "(current)" : ""}
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
                    <div className="bg-gray-900 text-white text-xs py-4 px-5 rounded shadow-lg ">{tooltipContent}</div>
                    {/* Arrow */}
                    <div className="absolute top-full right-2 -mt-[1px]">
                        <div className="border-4 border-transparent border-t-gray-900" />
                    </div>
                </div>
            )}
        </div>
    );
}
