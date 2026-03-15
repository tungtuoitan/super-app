/**
 * KShortcutNode — Node renderer cho KShortcutTree.
 *
 * Visual giống KNode (KMovingTree) nhưng:
 *  - Không drag/drop
 *  - Checkbox bên phải để chọn target shortcut (multi-select)
 *  - Click node   → toggle add/remove khỏi selectedNodes
 *  - Click root   → chỉ expand/collapse
 */

import React, { useState } from "react";
import { NodeApi } from "react-arborist";
import { ChevronDown, ChevronRight, LibraryBig, Library, Square, CheckSquare, CornerDownRight } from "lucide-react";
import { ICON_MAP } from "../../../shared/icons/icon.config";
import type { IconType } from "../../../shared/icons/icon.types";
import type { KItemV2 } from "../../../types/K-v2.types";
import type { KTreeNode } from "../../../hooks/Ktree.miniHelper";

// ── Props ─────────────────────────────────────────────────────────────────────

export interface KShortcutNodeProps {
    node:          NodeApi<KTreeNode>;
    style:         React.CSSProperties;
    selectedNodes: KItemV2[];
    onToggle:      (item: KItemV2) => void;
}

// ── Component ─────────────────────────────────────────────────────────────────

export function KShortcutNode({ node, style, selectedNodes, onToggle }: KShortcutNodeProps) {
    const item        = node.data.data;
    const isRoot      = item.id < 0;
    const hasChildren = (node.data.children?.length ?? 0) > 0;
    const isShortcut  = item.typeCode === "shortcut";
    const [isHovered, setIsHovered] = useState(false);

    // Khi item là shortcut, selectedNodes lưu theo refTargetId (resolved id)
    const resolvedId = isShortcut && item.refTargetId ? item.refTargetId : item.id;
    const isSelected  = !isRoot && selectedNodes.some((n) => n.id === resolvedId);

    const nodeColor = item.color;
    const nodeIcon  = item.icon as IconType | undefined;

    // ── Handlers ──────────────────────────────────────────────────────────────

    const handleRowClick = (e: React.MouseEvent) => {
        e.stopPropagation();
        e.preventDefault();
        if (isRoot) { node.toggle(); return; }
        onToggle(item); // toggle add/remove — logic xử lý ở KShortcutTree
    };

    const handleChevronClick = (e: React.MouseEvent) => {
        e.stopPropagation();
        e.preventDefault();
        node.toggle();
    };

    const handleIconClick = (e: React.MouseEvent) => {
        e.stopPropagation();
        e.preventDefault();
        if (hasChildren) node.toggle();
    };

    // ── Render ────────────────────────────────────────────────────────────────

    return (
        <div
            style={{
                ...style,
                marginLeft: `${node.level * -5}px`,
            }}
            className={`rounded ${isSelected ? "bg-primary/15" : "bg-transparent hover:bg-editor-hover-light"}`}
        >
            <div
                onClick={handleRowClick}
                onMouseEnter={() => setIsHovered(true)}
                onMouseLeave={() => setIsHovered(false)}
                className="flex items-center h-full w-full py-1 pr-2 cursor-pointer"
            >
                {/* ── Chevron ─────────────────────────────────────────────── */}
                <button
                    onClick={handleChevronClick}
                    disabled={!hasChildren}
                    className={`p-0.5 shrink-0 text-editor-fg ${!hasChildren ? "opacity-50" : ""}`}
                >
                    {hasChildren
                        ? node.isOpen
                            ? <ChevronDown  className="w-3 h-3" />
                            : <ChevronRight className="w-3 h-3" />
                        : <div className="w-3 h-3" />
                    }
                </button>

                {/* ── Folder icon ──────────────────────────────────────────── */}
                <div
                    onClick={handleIconClick}
                    className="mr-2 shrink-0 flex items-center relative"
                >
                    {isRoot ? (
                        <LibraryBig
                            className="w-4 h-4"
                            style={{ color: nodeColor || "#A1887F" }}
                        />
                    ) : nodeIcon && ICON_MAP[nodeIcon] ? (
                        (() => {
                            const Icon = ICON_MAP[nodeIcon];
                            return (
                                <Icon
                                    className="w-4 h-4"
                                    style={{ color: nodeColor || "#90A4AE" }}
                                    strokeWidth={2}
                                />
                            );
                        })()
                    ) : (
                        <Library
                            className="w-4 h-4"
                            style={{ color: nodeColor || "#90A4AE" }}
                        />
                    )}

                    {/* Shortcut badge — arrow overlay góc dưới-phải */}
                    {isShortcut && (
                        <div className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-sm bg-editor-sidebar flex items-center justify-center">
                            <CornerDownRight className="w-2 h-2 text-indigo-400" />
                        </div>
                    )}
                </div>

                {/* ── Name ────────────────────────────────────────────────── */}
                <span className={`
                    flex-1 text-left min-w-0 text-sm truncate text-editor-fg
                    ${hasChildren || isRoot ? "font-semibold" : "font-normal"}
                    ${isRoot ? "uppercase tracking-wide" : ""}
                `}>
                    {item.name}
                </span>

                {/* ── Checkbox (non-root only) ─────────────────────────────── */}
                {!isRoot && (
                    <span className="ml-2 shrink-0">
                        {isSelected
                            ? <CheckSquare className="w-4 h-4 text-primary" />
                            : <Square
                                className={`w-4 h-4 transition-colors ${
                                    isHovered ? "text-editor-fg/40" : "text-editor-fg/15"
                                }`}
                              />
                        }
                    </span>
                )}
            </div>
        </div>
    );
}
