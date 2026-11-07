import React from "react";
import { ChevronsDownUp, ChevronsUpDown } from "lucide-react";

interface ExpandCollapseButtonProps {
    phase: 0 | 1 | 2;
    onClick: (e: React.MouseEvent) => void;
}

export function ExpandCollapseButton({ phase, onClick }: ExpandCollapseButtonProps) {
    const titles = ["Expand children", "Expand all descendants", "Collapse all"] as const;
    return (
        <button
            onClick={onClick}
            title={titles[phase]}
            className="ml-0.5 shrink-0 p-0.5 rounded-md text-muted-foreground hover:bg-sa-hover-strong hover:text-foreground transition-colors duration-100"
        >
            {phase === 2
                ? <ChevronsDownUp className="w-3 h-3" />
                : <ChevronsUpDown className="w-3 h-3" />}
        </button>
    );
}
