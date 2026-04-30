/**
 * ProjectStatusBadge Component
 * Displays project status with color coding (GitHub-style)
 */

import { constants } from "@/shared";

interface ProjectStatusBadgeProps {
    status: string;
    label?: string;
    size?: "sm" | "md";
}

/**
 * Get status colors from constants
 */
export const getProjectStatusColors = (status: string) => {
    const colors = constants.optionColor.projectStatus.colors[status];
    return colors || constants.optionColor.projectStatus.default;
};

export function ProjectStatusBadge({ status, label, size = "md" }: ProjectStatusBadgeProps) {
    const colors = getProjectStatusColors(status);

    const sizeClasses = size === "sm"
        ? "px-2.5 py-1 text-xs"
        : "px-3 py-1.5 text-sm";

    return (
        <span
            className={`inline-flex items-center font-semibold rounded-sm uppercase tracking-wide ${sizeClasses}`}
            style={{
                backgroundColor: colors.bg,
                color: colors.text,
            }}
        >
            {label || status}
        </span>
    );
}
