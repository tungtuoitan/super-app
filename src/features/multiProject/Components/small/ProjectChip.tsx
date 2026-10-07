import React from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";
import { TaskStatusIcon } from "@/shared";

interface ProjectChipProps {
    project: { id: number; name?: string; status?: string };
    isSelected: boolean;
    onToggle: (id: number) => void;
}

export function ProjectChip({ project, isSelected, onToggle }: ProjectChipProps) {
    return (
        <button
            onClick={() => onToggle(project.id)}
            className={cn(
                "inline-flex h-7 items-center gap-1.5 px-2.5 rounded-full text-[13px] transition-colors duration-100",
                "border cursor-pointer whitespace-nowrap",
                isSelected
                    ? "bg-sa-surface-2 border-sa-border-strong text-foreground"
                    : "border-transparent text-muted-foreground hover:bg-sa-hover hover:text-foreground"
            )}
        >
            <TaskStatusIcon status={project.status} size={12} />
            <span className="truncate max-w-[150px]">{project.name}</span>
            {isSelected && <X className="h-3 w-3 flex-shrink-0 opacity-50 hover:opacity-100" />}
        </button>
    );
}
