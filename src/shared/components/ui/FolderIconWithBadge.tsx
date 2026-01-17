/**
 * FolderIconWithBadge - VS Code Material Icon Theme style folder icon
 * Shows a filled folder icon with an optional badge icon at bottom-right
 */

import React from "react";
import { ICON_MAP, IconType } from "@/shared/icons";

interface FolderIconProps {
    className?: string;
    color: string;
}

// Filled folder icon (closed)
export const FolderFilled: React.FC<FolderIconProps> = ({ className, color }) => (
    <svg
        xmlns="http://www.w3.org/2000/svg"
        width="24"
        height="24"
        viewBox="0 0 24 24"
        fill={color}
        className={className}
    >
        <path stroke="none" d="M0 0h24v24H0z" fill="none" />
        <path d="M9 3a1 1 0 0 1 .608 .206l.1 .087l2.706 2.707h6.586a3 3 0 0 1 2.995 2.824l.005 .176v8a3 3 0 0 1 -2.824 2.995l-.176 .005h-14a3 3 0 0 1 -2.995 -2.824l-.005 -.176v-11a3 3 0 0 1 2.824 -2.995l.176 -.005h4z" />
    </svg>
);

// Filled folder icon (open)
export const FolderOpenFilled: React.FC<FolderIconProps> = ({ className, color }) => (
    <svg
        xmlns="http://www.w3.org/2000/svg"
        width="24"
        height="24"
        viewBox="0 0 24 24"
        fill={color}
        className={className}
    >
        <path stroke="none" d="M0 0h24v24H0z" fill="none" />
        <path d="M2 6c0 -.796 .316 -1.558 .879 -2.121c.563 -.563 1.325 -.879 2.121 -.879h4l.099 .005c.229 .023 .444 .124 .608 .288l2.707 2.707h6.586c.796 0 1.558 .316 2.121 .879c.319 .319 .559 .703 .707 1.121l-14.523 0c-.407 0 -.805 .125 -1.14 .356c-.292 .203 -.525 .48 -.674 .801l-.058 .141l-1.379 3.676c-.194 .517 .068 1.093 .585 1.287c.517 .194 1.094 -.068 1.288 -.585l1.134 -3.027c.146 -.39 .519 -.649 .937 -.649h13.002l.217 .012c.216 .024 .426 .082 .624 .173c.054 .025 .107 .053 .159 .083c.199 .115 .377 .263 .525 .439c.188 .222 .325 .482 .403 .762c.077 .28 .092 .573 .045 .859c-.001 .008 -.003 .016 -.005 .024l-.995 5.21c-.131 .686 -.497 1.304 -1.036 1.749c-.47 .389 -1.046 .624 -1.65 .677l-.261 .012h-14.026c-.796 0 -1.558 -.316 -2.121 -.879c-.563 -.563 -.879 -1.325 -.879 -2.121v-11z" />
    </svg>
);

export interface FolderIconWithBadgeProps {
    /** Icon type for the badge (e.g., "TASK", "IMAGE") */
    iconType?: IconType | string | null;
    /** Folder color */
    color?: string;
    /** Whether the folder is open */
    isOpen?: boolean;
    /** Whether the item is deleted (affects styling) */
    isDeleted?: boolean;
    /** Size variant */
    size?: "sm" | "md" | "lg";
    /** Additional class name */
    className?: string;
}

const sizeConfig = {
    sm: {
        container: "w-3.5 h-3.5",
        folder: "w-3.5 h-3.5",
        badge: "w-2 h-2 -bottom-0.5 -right-0.5",
        strokeWidth: 3,
    },
    md: {
        container: "w-4 h-4",
        folder: "w-4 h-4",
        badge: "w-2.5 h-2.5 -bottom-0.5 -right-0.5",
        strokeWidth: 2.5,
    },
    lg: {
        container: "w-5 h-5",
        folder: "w-5 h-5",
        badge: "w-3 h-3 -bottom-0.5 -right-0.5",
        strokeWidth: 2,
    },
};

/**
 * Folder icon with optional badge icon at bottom-right
 * Similar to VS Code Material Icon Theme
 */
export function FolderIconWithBadge({
    iconType,
    color = "#75beff",
    isOpen = false,
    isDeleted = false,
    size = "md",
    className,
}: FolderIconWithBadgeProps) {
    const config = sizeConfig[size];
    const folderColor = isDeleted ? "#6b7280" : color;
    const badgeColor = isDeleted ? "#9ca3af" : "#ffffff";

    // Check if we have a valid custom icon
    const hasCustomIcon = iconType && ICON_MAP[iconType as IconType];
    const CustomIcon = hasCustomIcon ? ICON_MAP[iconType as IconType] : null;

    // If no custom icon, just render the folder
    if (!CustomIcon) {
        return isOpen ? (
            <FolderOpenFilled className={`${config.folder} ${className || ""}`} color={folderColor} />
        ) : (
            <FolderFilled className={`${config.folder} ${className || ""}`} color={folderColor} />
        );
    }

    // Render folder with badge
    return (
        <div className={`relative ${config.container} ${className || ""}`}>
            {/* Background: Folder icon with color */}
            {isOpen ? (
                <FolderOpenFilled className={`${config.folder} absolute inset-0`} color={folderColor} />
            ) : (
                <FolderFilled className={`${config.folder} absolute inset-0`} color={folderColor} />
            )}
            {/* Overlay: Custom icon at bottom-right, white color */}
            <CustomIcon
                className={`absolute ${config.badge}`}
                style={{ color: badgeColor }}
                strokeWidth={config.strokeWidth}
            />
        </div>
    );
}
