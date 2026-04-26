import React from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";
import { getProjectStatusColors } from "@/features/project";

interface ProjectChipProps {
    project: { id: number; name?: string; status?: string };
    isSelected: boolean;
    onToggle: (id: number) => void;
}

export function ProjectChip({ project, isSelected, onToggle }: ProjectChipProps) {
    const statusColors = getProjectStatusColors(project.status || "");
    return (
        <button
            onClick={() => onToggle(project.id)}
            className={cn(
                "inline-flex items-center gap-2 px-3 py-1.5 rounded-sm text-xs font-semibold transition-all uppercase tracking-wide",
                "border-2 cursor-pointer whitespace-nowrap",
                isSelected
                    ? "bg-primary/15 border-primary text-primary"
                    : "bg-muted/50 border-transparent text-muted-foreground hover:bg-muted hover:border-muted-foreground/30"
            )}
        >
            <span className="w-1 h-4 rounded-sm flex-shrink-0" style={{ backgroundColor: statusColors.bg }} />
            <span className="truncate max-w-[150px]">{project.name}</span>
            {isSelected && <X className="h-3.5 w-3.5 flex-shrink-0 opacity-60 hover:opacity-100" />}
        </button>
    );
}
