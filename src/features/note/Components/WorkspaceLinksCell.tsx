/**
 * WorkspaceLinksCell - Displays workspace links count with tooltip
 * Used in NoteGrid to show which workspaces reference a note
 */

import React, { useState } from "react";
import { shellConstants } from "@/shell";
import type { WorkspaceLink } from "../types/note.types";
import { constants } from "@/shared";
import { useWorkspaceStore } from "@/features/workspace";

interface WorkspaceLinksCellProps {
    source?: string;
    count: number;
    links?: WorkspaceLink[];
    onWorkspaceClick?: (workspaceId: number, workspaceItemId: number) => void;
    tooltipPosition?: "top" | "bottom";
}

export function WorkspaceLinksCell({ source, count, links, onWorkspaceClick, tooltipPosition = "top" }: WorkspaceLinksCellProps) {
    const [showTooltip, setShowTooltip] = useState(false);
    const { selectedWorkspaceId } = useWorkspaceStore();

    if (count === 0 || !links || links.length === 0) {
        return <span className="text-sm text-muted-foreground"></span>;
    }

    const isTop = tooltipPosition === "top";

    return (
        <div className="relative inline-flex items-center justify-center cursor-pointer pl-2" onMouseEnter={() => setShowTooltip(true)} onMouseLeave={() => setShowTooltip(false)}>
            <div className="flex items-center gap-1 text-center">
                <span className="text-sm text-gray-400">{count}</span>
            </div>

            {showTooltip && (
                <div
                    className={`absolute ${isTop ? "bottom-full" : "top-[0px] mt-2"} right-[12px] bottom-[-50px] z-50 pointer-events-auto border border-gray-700 rounded`}
                    onClick={(e) => e.stopPropagation()}
                >
                    <div className="bg-gray-900 text-white text-xs py-4 px-5 rounded shadow-lg min-w-[200px]">
                        <div className="font-semibold mb-2">Locations:</div>
                        <div className="flex flex-col gap-1">
                            {links.map((link) => (
                                <div
                                    key={link.workspaceItemId}
                                    onClick={(e) => {
                                        if (source === "Note") {
                                            e.stopPropagation();
                                            onWorkspaceClick?.(link.workspaceId, link.workspaceItemId);
                                        }
                                    }}
                                    className={`${source === "Note" ? "text-blue-400 hover:underline cursor-pointer" : "text-gray-400"}`}
                                >
                                    • {link.workspaceName} {selectedWorkspaceId === link.workspaceId ? "(current)" : ""}
                                </div>
                            ))}
                        </div>
                        {source === "Note" && <div className="text-gray-400 text-xs mt-2 italic border-t border-gray-700 pt-1">Click to navigate to workspace</div>}
                    </div>
                    <div
                        className={`absolute ${isTop ? "top-full -mt-[1px]" : "bottom-full -mb-[1px]"} right-3`}
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className={`border-4 border-transparent ${isTop ? "border-t-gray-900" : "border-b-gray-900"}`} />
                    </div>
                </div>
            )}
        </div>
    );
}



