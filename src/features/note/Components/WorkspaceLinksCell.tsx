/**
 * WorkspaceLinksCell - Displays workspace links count with tooltip
 * Used in NoteGrid to show which workspaces reference a note
 */

import React, { useState } from "react";
import type { WorkspaceLink } from "../types/note.types";
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
                <span className="font-mono text-[12px] text-muted-foreground">{count}</span>
            </div>

            {showTooltip && (
                <div
                    className={`absolute ${isTop ? "bottom-full" : "top-[0px] mt-2"} right-[12px] bottom-[-50px] z-50 pointer-events-auto`}
                    onClick={(e) => e.stopPropagation()}
                >
                    <div className="bg-popover text-popover-foreground border border-sa-border-strong sa-shadow-pop text-xs py-2.5 px-3 rounded-lg min-w-[200px]">
                        <div className="mb-1.5 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">Locations</div>
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
                                    className={`${source === "Note" ? "text-foreground/90 hover:text-foreground hover:underline underline-offset-2 cursor-pointer" : "text-muted-foreground"}`}
                                >
                                    • {link.workspaceName} {selectedWorkspaceId === link.workspaceId ? "(current)" : ""}
                                </div>
                            ))}
                        </div>
                        {source === "Note" && <div className="text-muted-foreground text-[11px] mt-2 border-t border-sa-border pt-1.5">Click to navigate to workspace</div>}
                    </div>
                </div>
            )}
        </div>
    );
}



