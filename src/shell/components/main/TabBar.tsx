import React, { useEffect } from "react";
import { X, FileText, Pin } from "lucide-react";
import { constants, useKeywordSelector } from "@/shared";
import { useDeviceStore } from "@/shared";
import { useTabBarHelper } from "@/shell/hooks/useTabBarHelper";
import { moduleRegistry } from "@/shell/moduleRegistry";
import { BaseTab, getTabDeleteState } from "@/shell/types/tab.types";
import { useEditorTabBarStore } from "@/shell/store/EditorTab.store";
import { useEditorTabBarHelper } from "@/shell/hooks/useEditorTabBar.helper";
import { shellConstants } from "@/shell/shell.constants";
// useTabBarShortcuts is registered inside useTabBarHelper — no separate call needed here.

// ── Breadcrumb trigger key ────────────────────────────────────────────────────
// TabBar is the only component that needs this reactivity, so module
// useBreadcrumbTrigger hooks are called here rather than inside
// useEditorTabBarHelper (which is used by 30+ components).
function useBreadcrumbTriggerKey(): string {
    const modules = moduleRegistry.getAll().filter((m) => m.useBreadcrumbTrigger != null);
    // eslint-disable-next-line react-hooks/rules-of-hooks -- registry is immutable after startup; hook count is stable
    return modules.map((m) => String(m.useBreadcrumbTrigger!())).join(",");
}

// â”€â”€â”€ Tab Icon â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

/**
 * Resolves the tab icon by asking the registry.
 * Each feature's module provides getTabMeta â€” TabBar has zero knowledge of tab types.
 */
function TabIcon({ tab, isDeleted, isActive }: { tab: BaseTab; isDeleted: boolean; isActive: boolean }) {
    const meta = moduleRegistry.getTabMeta(tab);
    const className = `w-4 h-4 ${isActive ? "opacity-100" : "opacity-50"}`;

    if (!meta) {
        return <FileText className={className} style={{ color: "#9ca3af" }} />;
    }

    // Clone the icon element from meta with updated className/opacity
    const icon = meta.icon as React.ReactElement;
    return React.cloneElement(icon, {
        className,
        style: { color: isDeleted ? "#9ca3af" : meta.color },
    });
}

// â”€â”€â”€ TabBar â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

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
    } = useEditorTabBarStore();
    const { closeTab, updateActiveTab, generateBreadcrumbForTab } = useEditorTabBarHelper();
    const breadcrumbTriggerKey = useBreadcrumbTriggerKey();
    const { allKeywords } = useKeywordSelector();
    const { handleDrop, handleDragOver, handleDragLeave, handleDragEnter, handleDragEnd, handleDragStart, handleTabRightClick, handleCloseTab, isInCurrentModule } =
        useTabBarHelper();
    const { isMobile } = useDeviceStore();
    // useTabBarShortcuts is already called inside useTabBarHelper above.

    // â”€â”€ Task grouping (driven by registry, not hardcoded) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    // Group leader: any tab where moduleRegistry.getTabGroupKey returns a key
    // Group child: any tab where tab.openedBy.link matches a leader's group key

    const groupKeyToLeader = new Map<string, { leaderTab: BaseTab; children: BaseTab[] }>();
    openTabs.forEach((tab) => {
        const key = moduleRegistry.getTabGroupKey(tab);
        if (key) groupKeyToLeader.set(key, { leaderTab: tab, children: [] });
    });
    openTabs.forEach((tab) => {
        const link = tab.openedBy?.link;
        if (link && groupKeyToLeader.has(link)) {
            groupKeyToLeader.get(link)!.children.push(tab);
        }
    });
    const childTabIds = new Set<string>();
    groupKeyToLeader.forEach(({ children }) => children.forEach((c) => childTabIds.add(c.id)));

    // â”€â”€ Pinned state from localStorage â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    useEffect(() => {
        const savedState = localStorage.getItem(shellConstants.storage.tabPinnedState);
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
                    updatedTabs.sort((a, b) => (a.isPinned && !b.isPinned ? -1 : !a.isPinned && b.isPinned ? 1 : 0));
                    setOpenTabs(updatedTabs);
                }
            } catch (e) {
                console.error("Failed to parse tabPinnedState:", e);
            }
        }
    }, [openTabs.length]);

    // â”€â”€ Breadcrumb update (note tabs only â€” via registry could be generalised later) â”€â”€
    useEffect(() => {
        if (openTabs.length === 0 || allKeywords.length === 0) return;
        const hasNoteTabs = openTabs.some((tab) => tab.type === shellConstants.vscode.tab.tabTypes.note);
        if (!hasNoteTabs) return;
        const newTabs = openTabs.map((tab) => {
            if (tab.type === shellConstants.vscode.tab.tabTypes.note) {
                return { ...tab, breadcrumb: generateBreadcrumbForTab(tab.data, tab.type) };
            }
            return tab;
        });
        setOpenTabs(newTabs);
    }, [allKeywords, openTabs.length, breadcrumbTriggerKey]);

    // â”€â”€ Render â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

    const renderTab = (tab: BaseTab, isPinned: boolean = false) => {
        const { isDeleted, isPermanentlyDeleted: isHardDeleted } = getTabDeleteState(tab);
        const isDragging = draggedTabId === tab.id;
        const isDropTarget = dragOverTabId === tab.id && !isDragging;
        const isActive = activeTabId === tab.id;

        const { noDeletedStyle } = moduleRegistry.getTabFlags(tab.type);
        const showDeletedStyle = isDeleted && !noDeletedStyle;

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
                    border-r border-b relative transition-all duration-150
                    ${isDragging ? "opacity-50" : ""}
                    ${isActive
                        ? `bg-editor-bg text-editor-fg border-b-transparent border-t-2 ${isInCurrentModule(tab) ? "border-t-blue-500" : "border-t-gray-400"}`
                        : "bg-transparent text-muted-foreground border-t border-t-transparent text-gray-600"
                    }
                `}
            >
                {isDropTarget && dragOverPosition === "left" && (
                    <div className="absolute left-0 top-0 bottom-0 w-0.5 bg-blue-500 z-10" />
                )}
                {isDropTarget && dragOverPosition === "right" && (
                    <div className="absolute right-0 top-0 bottom-0 w-0.5 bg-blue-500 z-10" />
                )}

                <TabIcon tab={tab} isDeleted={isDeleted} isActive={isActive} />

                <span className={`text-[13px] whitespace-nowrap ${showDeletedStyle ? "text-muted-foreground/40 line-through" : ""}`}>
                    {tab.title.length > 50 ? tab.title.slice(0, 17) + "..." : tab.title}
                    {!noDeletedStyle
                        ? isHardDeleted ? " [Permanently Deleted]" : isDeleted ? " [Deleted]" : ""
                        : ""}
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

    const renderAllTabs = () =>
        openTabs.map((tab) => {
            if (childTabIds.has(tab.id)) return null; // rendered inside group below

            const isPinned = !!tab.isPinned;
            const groupKey = moduleRegistry.getTabGroupKey(tab);
            const group = groupKey ? groupKeyToLeader.get(groupKey) : null;

            if (group && group.children.length > 0) {
                return (
                    <div key={tab.id} className="flex items-stretch">
                        <div className="w-0.5 bg-emerald-500/40 flex-shrink-0" />
                        <div className="flex flex-wrap">
                            {renderTab(tab, isPinned)}
                            {group.children.map((child) => renderTab(child, !!child.isPinned))}
                        </div>
                        <div className="w-0.5 bg-emerald-500/20 flex-shrink-0" />
                    </div>
                );
            }

            return renderTab(tab, isPinned);
        });

    return (
        <div className={`min-h-[35px] flex items-start border-b ${isMobile ? "bg-black" : "bg-editor-sidebar"}`}>
            {isLoadingTabs ? (
                <div className="px-4 w-full h-[35px] flex items-center gap-2">
                    <div className="h-4 w-24 bg-muted/20 animate-pulse rounded" />
                    <div className="h-4 w-32 bg-muted/20 animate-pulse rounded" />
                    <div className="h-4 w-20 bg-muted/20 animate-pulse rounded" />
                </div>
            ) : openTabs.length > 0 ? (
                <div className="flex-1 flex flex-wrap">{renderAllTabs()}</div>
            ) : (
                <div className="px-4 w-full h-[35px] flex items-center">
                    <p className="text-[13px] text-muted-foreground/70 italic">No tabs open</p>
                </div>
            )}
        </div>
    );
}

