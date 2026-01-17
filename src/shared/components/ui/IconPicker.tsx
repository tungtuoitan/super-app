/**
 * IconPicker - Reusable icon picker component
 * Displays icons grouped by category with Material Design colors
 * Includes search functionality
 */

import React, { useState, useMemo } from "react";
import { Search, X } from "lucide-react";
import { Label } from "@/Components/ui/label";
import { Input } from "@/Components/ui/input";
import { cn } from "@/lib/utils";
import {
    IconType,
    ICON_MAP,
    ICON_COLORS,
    ICON_CONFIG,
    getIconsGrouped,
    getIconDefaultColor,
    type IconOption,
    type IconGroup,
} from "@/shared/icons";

export interface IconPickerProps {
    /** Currently selected icon type */
    value: IconType | null;
    /** Callback when icon is selected */
    onChange: (iconType: IconType | null, defaultColor: string) => void;
    /** Label for the picker */
    label?: string;
    /** Whether the picker is disabled */
    disabled?: boolean;
    /** Custom class name */
    className?: string;
    /** Max height for the icon grid */
    maxHeight?: string;
    height?: string;
    /** Number of columns in the grid */
    columns?: 3 | 4 | 5 | 6;
    /** Whether to show the default folder option */
    showDefaultOption?: boolean;
    /** Label for the default option */
    defaultOptionLabel?: string;
    /** Whether to show group labels */
    showGroupLabels?: boolean;
    /** Whether to show search input */
    showSearch?: boolean;
    /** Placeholder text for search */
    searchPlaceholder?: string;
}

export function IconPicker({
    value,
    onChange,
    label = "Icon",
    disabled = false,
    className,
    maxHeight = "300px",
    height = "200px",
    columns = 4,
    showDefaultOption = true,
    defaultOptionLabel = "Default",
    showGroupLabels = true,
    showSearch = true,
    searchPlaceholder = "Search icons...",
}: IconPickerProps) {
    const [searchQuery, setSearchQuery] = useState("");
    const iconGroups = getIconsGrouped();

    // Filter icons based on search query
    const filteredGroups = useMemo(() => {
        if (!searchQuery.trim()) {
            return iconGroups;
        }

        const query = searchQuery.toLowerCase().trim();

        return iconGroups
            .map((group) => ({
                ...group,
                icons: group.icons.filter((icon) => {
                    // Match by label
                    if (icon.label.toLowerCase().includes(query)) {
                        return true;
                    }
                    // Match by keywords
                    const config = ICON_CONFIG[icon.value];
                    if (config?.keywords.some((kw) => kw.toLowerCase().includes(query))) {
                        return true;
                    }
                    return false;
                }),
            }))
            .filter((group) => group.icons.length > 0);
    }, [iconGroups, searchQuery]);

    // Check if we have any results
    const hasResults = filteredGroups.some((g) => g.icons.length > 0);
    const isSearching = searchQuery.trim().length > 0;

    const gridCols = {
        3: "grid-cols-3",
        4: "grid-cols-4",
        5: "grid-cols-5",
        6: "grid-cols-6",
    };

    const handleIconSelect = (iconType: IconType | null) => {
        if (disabled) return;
        const color = getIconDefaultColor(iconType);
        onChange(iconType, color);
    };

    const renderIconButton = (option: IconOption, isSelected: boolean) => (
        <button
            key={option.value}
            type="button"
            onClick={() => handleIconSelect(option.value)}
            disabled={disabled}
            className={cn(
                "flex items-center gap-2 p-2 rounded-md border-2 transition-all",
                isSelected
                    ? "border-primary bg-primary/5"
                    : "border-transparent hover:border-primary/30 hover:bg-accent/50",
                disabled && "opacity-50 cursor-not-allowed"
            )}
        >
            <div
                className="w-5 h-5 flex items-center justify-center flex-shrink-0"
                style={{ color: option.defaultColor }}
            >
                <option.Icon size={18} />
            </div>
            <span className="text-xs truncate">{option.label}</span>
        </button>
    );

    return (
        <div className={cn("space-y-2", className)}>
            {label && <Label htmlFor="icon-picker">{label}</Label>}

            {/* Search Input */}
            {showSearch && (
                <div className="relative">
                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                        type="text"
                        placeholder={searchPlaceholder}
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-8 pr-8 h-8 text-sm"
                        disabled={disabled}
                    />
                    {searchQuery && (
                        <button
                            type="button"
                            onClick={() => setSearchQuery("")}
                            className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                        >
                            <X className="h-4 w-4" />
                        </button>
                    )}
                </div>
            )}

            <div
                className="overflow-y-auto pr-1"
                style={{ maxHeight, height }}
            >
                {/* Default option - only show when not searching */}
                {showDefaultOption && !isSearching && (
                    <div className={cn("grid gap-1 mb-2", gridCols[columns])}>
                        <button
                            type="button"
                            onClick={() => handleIconSelect(null)}
                            disabled={disabled}
                            className={cn(
                                "flex items-center gap-2 p-2 rounded-md border-2 transition-all",
                                value === null
                                    ? "border-primary bg-primary/5"
                                    : "border-transparent hover:border-primary/30 hover:bg-accent/50",
                                disabled && "opacity-50 cursor-not-allowed"
                            )}
                        >
                            <div
                                className="w-5 h-5 flex items-center justify-center flex-shrink-0"
                                style={{ color: ICON_COLORS.GREY }}
                            >
                                {ICON_MAP.FOLDER && <ICON_MAP.FOLDER size={18} />}
                            </div>
                            <span className="text-xs truncate">{defaultOptionLabel}</span>
                        </button>
                    </div>
                )}

                {/* No results message */}
                {isSearching && !hasResults && (
                    <div className="text-center py-6 text-muted-foreground text-sm">
                        No icons found for "{searchQuery}"
                    </div>
                )}

                {/* Grouped icons */}
                {filteredGroups.map((group) => (
                    <div key={group.id} className="mb-3">
                        {showGroupLabels && (
                            <div className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider mb-1 px-1">
                                {group.label}
                            </div>
                        )}
                        <div className={cn("grid gap-1", gridCols[columns])}>
                            {group.icons.map((option) =>
                                renderIconButton(option, value === option.value)
                            )}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}

/**
 * Compact icon display component
 * For showing a single icon with its color
 */
export interface IconDisplayProps {
    iconType: IconType | null;
    size?: number;
    className?: string;
    /** Override the default color */
    color?: string;
}

export function IconDisplay({
    iconType,
    size = 18,
    className,
    color,
}: IconDisplayProps) {
    const Icon = iconType ? ICON_MAP[iconType] : ICON_MAP.FOLDER;
    const iconColor = color ?? getIconDefaultColor(iconType);

    return (
        <div
            className={cn("flex items-center justify-center", className)}
            style={{ color: iconColor }}
        >
            <Icon size={size} />
        </div>
    );
}

/**
 * Icon with label display component
 */
export interface IconWithLabelProps extends IconDisplayProps {
    label?: string;
    labelClassName?: string;
}

export function IconWithLabel({
    iconType,
    size = 18,
    className,
    color,
    label,
    labelClassName,
}: IconWithLabelProps) {
    return (
        <div className={cn("flex items-center gap-2", className)}>
            <IconDisplay iconType={iconType} size={size} color={color} />
            {label && (
                <span className={cn("text-sm", labelClassName)}>{label}</span>
            )}
        </div>
    );
}
