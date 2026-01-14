/**
 * Breadcrumb Navigation Component
 * Displays workspace/folder/note path in EditorToolbar
 */

import React from "react";
import { Layers, Folder, FolderOpen, FileText } from "lucide-react";
import { BreadcrumbItem } from "@/utils/breadcrumb.utils";
import { useKeywordNavigationHelper } from "@/hooks/keyword/useKeywordNavigation.helper";
import { useGeneralStore } from "@/store/index";

interface BreadcrumbProps {
    items: BreadcrumbItem[];
}

export function Breadcrumb({ items }: BreadcrumbProps) {
    const { navigateLink } = useKeywordNavigationHelper();
    const { allKeywords } = useGeneralStore();

    if (!items || items.length === 0) {
        return null;
    }

    const handleClick = (item: BreadcrumbItem, index: number) => {
        // Don't navigate if clicking on last item (current file)
        if (index === items.length - 1) {
            return;
        }

        // Find keyword by link
        const keyword = allKeywords.find(k => k.link === item.link);
        if (keyword) {
            navigateLink(keyword);
        }
    };

    return (
        <div className="flex items-center gap-1 text-sm text-muted-foreground">
            {items.map((item, index) => {
                const isLast = index === items.length - 1;

                return (
                    <React.Fragment key={item.link}>
                        {/* Breadcrumb Item */}
                        <button
                            onClick={() => handleClick(item, index)}
                            disabled={isLast}
                            className={`
                                flex items-center gap-1.5 px-1.5 py-0.5 rounded
                                ${isLast
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
                                <Folder
                                    className="w-3.5 h-3.5"
                                    style={{ color: item.color || "#75beff" }}
                                />
                            )}
                            {item.type === "note" && (
                                <FileText
                                    className="w-3.5 h-3.5"
                                    style={{ color: item.isNew ? "#a78bfa" : (isLast ? "#4FC3F7" : "#75beff") }}
                                />
                            )}

                            {/* Name */}
                            <span
                                className={`text-xs truncate max-w-[200px] ${
                                    item.isNew
                                        ? "text-purple-400"
                                        : (isLast ? "text-editor-fg" : "text-muted-foreground")
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
