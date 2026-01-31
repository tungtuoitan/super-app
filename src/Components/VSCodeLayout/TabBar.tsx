import React, { useEffect, useState, useRef } from "react";
import { X, FileText, Folder, Box, Pin, BarChart3, Cuboid, CheckSquare } from "lucide-react";
import { constants } from "@/utils/constants";
import { useEditorTabsStore, useGeneralStore } from "@/store/index";
import { useEditorTabHelper } from "@/hooks/vsCode/useEditorTab.helper";
import { useWorkspaceStore } from "@/store/workspace/Workspace.store";
import { useTabKeyboardShortcuts } from "@/hooks/vsCode/useTabKeyboardShortcuts";
import { BaseTab } from "@/types/editor/tab.types";
import { ICON_MAP, IconType } from "@/shared/icons";
import { Note } from "@/types/note.types";
import { Ws } from "@/types/workspace.types";
import { useTabBarHelper } from "@/hooks/vsCode/useTabBarHelper";

type TabIconProps = {
    tab: BaseTab;
    isDeleted?: boolean;
    isActive?: boolean;
};

function TabIcon({ tab, isDeleted = false, isActive = false }: TabIconProps) {
    const note = tab.data0 as Note | undefined;

    const iconColor = isDeleted
        ? "#9ca3af" // gray-400
        : tab.type === constants.vscode.tab.tabTypes.note
          ? (note?.color ?? "#60a5fa") // blue-400
          : tab.type === constants.vscode.tab.tabTypes.workspace
            ? "#a78bfa" // purple-400
            : tab.type === constants.vscode.tab.tabTypes.project
              ? "#f97316" // orange-500
              : tab.type === constants.vscode.tab.tabTypes.task
                ? "#10b981" // emerald-500
                : tab.type === constants.vscode.tab.tabTypes.trackingGraph
                  ? "#22c55e" // green-500
                  : "#9ca3af";

    const className = `w-4 h-4 ${isActive ? "opacity-100" : "opacity-50"}`;

    switch (tab.type) {
        case constants.vscode.tab.tabTypes.note: {
            const IconComponent = note?.icon && ICON_MAP[note.icon as IconType] ? ICON_MAP[note.icon as IconType] : FileText;

            return <IconComponent className={className} style={{ color: iconColor }} />;
        }

        case constants.vscode.tab.tabTypes.workspace:
            return <Box className={className} style={{ color: iconColor }} />;

        case constants.vscode.tab.tabTypes.project:
            return <Cuboid className={className} style={{ color: iconColor }} />;

        case constants.vscode.tab.tabTypes.task:
            return <CheckSquare className={className} style={{ color: iconColor }} />;

        case constants.vscode.tab.tabTypes.trackingGraph:
            return <BarChart3 className={className} style={{ color: iconColor }} />;

        default:
            return <FileText className={className} style={{ color: iconColor }} />;
    }
}

/**
 * TabBar - VS Code style tab bar component
 */
export function TabBar() {
    const {
        openTabs,
        setOpenTabs,
        activeTabId,
        isLoadingTabs,
        draggedTabId,
        setDraggedTabId,
        dragOverTabId,
        setDragOverTabId,
        dragOverPosition,
        setDragOverPosition,
        dragCounterRef,
    } = useEditorTabsStore();
    const { closeTab, updateActiveTab, getActiveTab } = useEditorTabHelper();
    const { currentWorkspace } = useWorkspaceStore();
    const { generateBreadcrumbForTab } = useEditorTabHelper();
    const { allKeywords } = useGeneralStore();
    const { handleDrop, handleDragOver, handleDragLeave, handleDragEnter, handleDragEnd, handleDragStart, handleTabRightClick, handleCloseTab, isInCurrentModule } =
        useTabBarHelper();

    // Enable keyboard shortcuts
    useTabKeyboardShortcuts();

    // Separate pinned and unpinned tabs
    const pinnedTabs = openTabs.filter((tab) => tab.isPinned);
    const unpinnedTabs = openTabs.filter((tab) => !tab.isPinned);

    // Load pinned state from localStorage and apply to tabs
    useEffect(() => {
        const savedState = localStorage.getItem("tabPinnedState");
        if (savedState && openTabs.length > 0) {
            try {
                const pinnedState: Record<string, boolean> = JSON.parse(savedState);
                let hasChanges = false;

                const updatedTabs = openTabs.map((tab) => {
                    if (pinnedState[tab.id] !== undefined && tab.isPinned !== pinnedState[tab.id]) {
                        hasChanges = true;
                        return { ...tab, isPinned: pinnedState[tab.id] };
                    }
                    return tab;
                });

                if (hasChanges) {
                    // Sort: pinned tabs first
                    updatedTabs.sort((a, b) => {
                        if (a.isPinned && !b.isPinned) return -1;
                        if (!a.isPinned && b.isPinned) return 1;
                        return 0;
                    });
                    setOpenTabs(updatedTabs);
                }
            } catch (error) {
                console.error("Failed to parse pinned state from localStorage:", error);
            }
        }
    }, [openTabs.length]);

    useEffect(() => {
        // update breadcrumbs
        if (currentWorkspace && openTabs.length > 0 && allKeywords.length > 0) {
            const newTabs = openTabs.map((tab) => {
                if (tab.type === constants.vscode.tab.tabTypes.note) {
                    const breadcrumb = generateBreadcrumbForTab(tab.data as Note | Ws, tab.type);
                    return { ...tab, breadcrumb };
                }
                return tab;
            });
            setOpenTabs(newTabs);
        }
    }, [allKeywords, openTabs.length, currentWorkspace?.id]);

    // Helper function to render a single tab
    const renderTab = (tab: any, isPinned: boolean = false) => {
        const isDeleted = !!tab.data.deletedAt;
        const isHardDeleted = !!(tab.data as any).isHardDeleted;
        const isDragging = draggedTabId === tab.id;
        const isDropTarget = dragOverTabId === tab.id && !isDragging;

        return (
            <button
                key={tab.id}
                draggable
                onDragStart={(e) => handleDragStart(e, tab.id, isPinned)}
                onDragEnd={handleDragEnd}
                onDragEnter={(e) => handleDragEnter(e, tab.id)}
                onDragLeave={handleDragLeave}
                onDragOver={(e) => handleDragOver(e, tab.id)}
                onDrop={(e) => handleDrop(e, tab.id, isPinned)}
                onClick={() => updateActiveTab(tab.id)}
                onContextMenu={(e) => handleTabRightClick(e, tab.id)}
                className={`
                    group h-[35px] pl-3 pr-1.5 flex items-center gap-2
                    border-r border-b relative
                    transition-all duration-150
                    ${isDragging ? "opacity-50" : ""}
                    ${
                        activeTabId === tab.id
                            ? `bg-editor-bg text-editor-fg border-b-transparent border-t-2 ${isInCurrentModule(tab) ? "border-t-blue-500" : "border-t-gray-400"}`
                            : "bg-transparent text-muted-foreground border-t border-t-transparent text-gray-600"
                    }
                `}
            >
                {/* Drop indicator */}
                {isDropTarget && dragOverPosition === "left" && <div className="absolute left-0 top-0 bottom-0 w-0.5 bg-blue-500 z-10" />}
                {isDropTarget && dragOverPosition === "right" && <div className="absolute right-0 top-0 bottom-0 w-0.5 bg-blue-500 z-10" />}
                <TabIcon tab={tab} isDeleted={isDeleted} isActive={activeTabId === tab.id} />

                <span className={`text-[13px] whitespace-nowrap ${isDeleted ? "text-muted-foreground/40 line-through" : ""}`}>
                    {tab.title.length > 50 ? tab.title.slice(0, 17) + "..." : tab.title}
                    {isHardDeleted ? " [Permanently Deleted]" : isDeleted ? " [Deleted]" : ""}
                </span>

                <button
                    onClick={(e) => handleCloseTab(e, tab.id)}
                    className={`relative pl-0.5 py-0.5 hover:bg-gray-500/20 rounded transition-opacity duration-150 group/close w-5 h-5 ${
                        isPinned || tab.hasUnsavedChanges ? "opacity-100" : "opacity-0 group-hover:opacity-100"
                    }`}
                >
                    {isPinned ? (
                        <div className="w-4 h-4 flex items-center justify-center">
                            <Pin className="w-3 h-3 rotate-45" />
                        </div>
                    ) : tab.hasUnsavedChanges ? (
                        <>
                            <div className="w-1.5 h-1.5 ml-1 rounded-full bg-white group-hover/close:hidden" />
                            <X className="w-4 h-4 hidden group-hover/close:block absolute inset-0 m-auto" />
                        </>
                    ) : (
                        <X className="w-4 h-4" />
                    )}
                </button>
            </button>
        );
    };

    return (
        <div className="min-h-[35px] flex items-start border-b border-editor-border  bg-editor-sidebar">
            {isLoadingTabs ? (
                <div className="px-4 w-full h-[35px] flex items-center gap-2">
                    <div className="h-4 w-24 bg-muted/20 animate-pulse rounded"></div>
                    <div className="h-4 w-32 bg-muted/20 animate-pulse rounded"></div>
                    <div className="h-4 w-20 bg-muted/20 animate-pulse rounded"></div>
                </div>
            ) : openTabs.length > 0 ? (
                <div className="flex-1 flex flex-wrap">
                    {pinnedTabs.map((tab) => renderTab(tab, true))}
                    {unpinnedTabs.map((tab) => renderTab(tab, false))}
                </div>
            ) : (
                <div className="px-4 w-full h-[35px] flex items-center">
                    <p className="text-[13px] text-muted-foreground/70 italic">No tabs open</p>
                </div>
            )}
        </div>
    );
}
