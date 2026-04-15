/**
 * Back Button for EditorToolbar
 * Shows the icon + label of the entity that opened the current tab.
 */

import React from "react";
import { Cuboid, CheckSquare, FileText, Box, Layers, Activity } from "lucide-react";
import { useGeneralStore } from "@/store/index";
import { useKeywordNavigationHelper } from "@/shared/hooks/useKeywordNavigation.helper";

interface BackButtonProps {
    openedBy: { link: string; label: string };
}

function getTypeFromLink(link: string): "project" | "task" | "note" | "workspace" | "log" | "track" | "unknown" {
    const clean = link.startsWith("sa/") ? link.substring(3) : link;
    const parts = clean.split("/").filter(Boolean);
    if (parts.length === 0) return "unknown";
    const last = parts[parts.length - 1];
    if (last.startsWith("t")) return "task";
    if (last.startsWith("p")) return "project";
    if (last.startsWith("n")) return "note";
    if (last.startsWith("w")) return "workspace";
    if (last.startsWith("l")) return "log";
    if (last.startsWith("tr")) return "track";
    return "unknown";
}

const TYPE_COLORS: Record<string, string> = {
    project: "#4FC3F7",
    task:    "#81C784",
    note:    "#75beff",
    workspace: "#FFB74D",
    log:     "#CE93D8",
    track:   "#F48FB1",
    unknown: "#888",
};

function BackIcon({ type, className }: { type: string; className: string }) {
    const color = TYPE_COLORS[type] ?? TYPE_COLORS.unknown;
    const props = { className, style: { color } };
    switch (type) {
        case "project":   return <Cuboid {...props} />;
        case "task":      return <CheckSquare {...props} />;
        case "workspace": return <Box {...props} />;
        case "log":       return <Layers {...props} />;
        case "track":     return <Activity {...props} />;
        default:          return <FileText {...props} />;
    }
}

export function BackButton({ openedBy }: BackButtonProps) {
    const { allKeywords } = useGeneralStore();
    const { navigateLink } = useKeywordNavigationHelper();

    const type = getTypeFromLink(openedBy.link);

    const handleBack = () => {
        const keyword = allKeywords.find(k => k.link === openedBy.link);
        if (keyword) {
            navigateLink(keyword);
        }
    };

    return (
        <button
            onClick={handleBack}
            title={`Back to ${openedBy.label}`}
            className="flex items-center gap-1 px-1.5 py-0.5 rounded text-xs text-muted-foreground hover:text-white hover:bg-white/10 transition-colors flex-shrink-0"
        >
            <BackIcon type={type} className="w-3.5 h-3.5 flex-shrink-0" />
            <span className="truncate max-w-[160px]">{openedBy.label}</span>
        </button>
    );
}
