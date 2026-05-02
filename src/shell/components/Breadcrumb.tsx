/**
 * Breadcrumb Navigation Component
 * Displays workspace/folder/note path in EditorToolbar
 */

import React from "react";
import { Layers, FileText } from "lucide-react";
import type { BreadcrumbItem } from "../utils/breadcrumb.utils";
import { useKeywordNavigationHelper } from "../commandPallete/useKeywordNavigation.helper";
import { ICON_MAP, IconKey, useKeywordSelector } from "@/shared";
import { FolderIconWithBadge } from "@/shared";
import type { Keyword } from "@/shared";

interface BreadcrumbProps {
    items: BreadcrumbItem[];
}

export function Breadcrumb({ items }: BreadcrumbProps) {
    const { navigateLink } = useKeywordNavigationHelper();
    const { allKeywords } = useKeywordSelector();

    if (!items || items.length === 0) {
        return null;
    }

    const handleClick = (item: BreadcrumbItem, index: number) => {
        if (item.disabled) return;

        // Find keyword by link
        const keyword = allKeywords.find((k: Keyword) => k.link === item.link);
        if (keyword) {
            navigateLink(keyword);
        }
    };

    return (
        <div className="flex items-center gap-1 text-sm text-muted-foreground">
            {items.map((item, index) => {
                const isDisabled = !!item.disabled;
                const isLast = index === items.length - 1;
                const NoteIcon = item.icon && ICON_MAP[item.icon as IconKey]
                    ? ICON_MAP[item.icon as IconKey]
                    : FileText;

                return (
                    <React.Fragment key={item.link}>
                        {/* Breadcrumb Item */}
                        <button
                            onClick={() => handleClick(item, index)}
                            disabled={isDisabled}
                            className={`
                                flex items-center gap-1.5 px-1.5 py-0.5 rounded
                                ${isDisabled
                                    ? "cursor-default"
                                    : "cursor-pointer hover:underline decoration-white/60 hover:text-white"
                                }
                                transition-colors
                                `}
                        >
                            {/* Icon */}
                            {item.type === "workspace" && (
                                <Layers
                                    className="w-3.5 h-3.5"
                                    style={{ color: item.color || "#75beff" }}
                                />
                            )}
                            {item.type === "folder" && (
                                <FolderIconWithBadge
                                    iconType={item.icon as IconKey}
                                    color={item.color || "#75beff"}
                                    size="sm"
                                />
                            )}
                            {item.type === "note" && (
                                <NoteIcon
                                    className="w-3.5 h-3.5"
                                    style={{ color: item.isNew ? "#a78bfa" : (item.color || (isDisabled ? "#4FC3F7" : "#75beff")) }}
                                />
                            )}

                            {/* Name */}
                            <span
                                className={`text-xs truncate max-w-[200px] ${
                                    item.isNew
                                        ? "text-purple-400"
                                        : (isDisabled ? "text-editor-fg" : "text-muted-foreground")
                                }`}
                            >
                                {item.name}
                            </span>
                        </button>

                        {/* Separator */}
                        {!isLast && (
                            <span className="text-white/30">/</span>
                        )}
                    </React.Fragment>
                );
            })}
        </div>
    );
}
