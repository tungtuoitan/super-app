/**
 * ProjectStatusBadge Component
 * Displays project status as a Linear-style icon + label (#1514)
 */

import { TaskStatusIcon } from "@/shared";
import { projectConstants } from "@/features/project/project.constants";

interface ProjectStatusBadgeProps {
    status: string;
    label?: string;
    size?: "sm" | "md";
}

/**
 * Get status colors from constants
 */
export const getProjectStatusColors = (status: string) => {
    const colors = projectConstants.optionColor.projectStatus.colors[status];
    return colors || projectConstants.optionColor.projectStatus.default;
};

export function ProjectStatusBadge({ status, label, size = "md" }: ProjectStatusBadgeProps) {
    // #1514: status = Linear-style icon + label (no filled block)
    return (
        <span className={`inline-flex items-center gap-1.5 text-muted-foreground ${size === "sm" ? "text-[12px]" : "text-[13px]"}`}>
            <TaskStatusIcon status={status} size={size === "sm" ? 12 : 14} title={label || status} />
            {label || status}
        </span>
    );
}
