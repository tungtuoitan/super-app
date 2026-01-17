import React, { useEffect } from "react";
import { X, FileText, Folder, Box, Pin } from "lucide-react";
import { constants } from "@/utils/constants";
import { useEditorTabsStore, useGeneralStore } from "@/store/index";
import { useEditorTabHelper } from "@/hooks/vsCode/useEditorTab.helper";
import { useWorkspaceStore } from "@/store/workspace/Workspace.store";
import { useGridControlStore } from "@/store/grid/useGridControl.store";
import { useNoteGridStore } from "@/store/note/useNoteGrid.store";
import { useWsStore } from "@/store/ws/useWs.store";
import { useConfirmationPopoverHelper } from "@/hooks/useConfirmationPopover.helper";
import { useWorkspaceItemHelper } from "@/hooks/workspace/useWorkspaceItemHelper";
import { useEditorToolbarHelper } from "@/hooks/vsCode/useEditorToolbar.helper";
import { useOrchestratorContextMenuHelper } from "@/shared/contexts/helpers/useOrchestratorContextMenu.helper";
import { useTabKeyboardShortcuts } from "@/hooks/vsCode/useTabKeyboardShortcuts";
import { BaseTab } from "@/types/editor/tab.types";
import { ICON_MAP, IconType } from "@/shared/icons";
import { Note } from "@/types/note.types";

type TabIconProps = {
    tab: BaseTab;
    isDeleted?: boolean;
    isActive?: boolean;
};

function TabIcon({ tab, isDeleted = false, isActive = false }: TabIconProps) {
    const className = `w-4 h-4 ${
        isDeleted
            ? "text-gray-500"
            : tab.type === constants.vscode.tab.tabTypes.note
              ? "text-blue-400"
              : tab.type === constants.vscode.tab.tabTypes.workspace
                ? "text-purple-400"
                : "text-gray-400"
    } ${isActive ? "opacity-100" : "opacity-50"}`;

    switch (tab.type) {
        case constants.vscode.tab.tabTypes.note:
            const note = tab.data0 as Note;
            const IconComponent = note.icon && ICON_MAP[note.icon as IconType] ? ICON_MAP[note.icon as IconType] : FileText;
            return <IconComponent className={className} />;

        case constants.vscode.tab.tabTypes.workspace:
            return <Box className={className} />;

        default:
            return <FileText className={className} />;
    }
}

/**
 * TabBar - VS Code style tab bar component
 */
export function TabBar() {
    const { openTabs, setOpenTabs, activeTabId, isLoadingTabs } = useEditorTabsStore();
    const { closeTab, updateActiveTab, getActiveTab } = useEditorTabHelper();
    const { currentWorkspace } = useWorkspaceStore();
    const { moduleName } = useGridControlStore();
    const { notes } = useNoteGridStore();
    const { workspaces } = useWsStore();
    const { showConfirmation } = useConfirmationPopoverHelper();
    const { upsertOrchestraitor } = useEditorToolbarHelper();
    const { showContextMenu } = useOrchestratorContextMenuHelper();
    const { generateBreadcrumbForTab } = useEditorTabHelper();
    const { allKeywords } = useGeneralStore();

    // Enable keyboard shortcuts
    useTabKeyboardShortcuts();

    // Separate pinned and unpinned tabs
    const pinnedTabs = openTabs.filter((tab) => tab.isPinned);
    const unpinnedTabs = openTabs.filter((tab) => !tab.isPinned);

    /**
     * Check if tab exists in current module's data source
     * Based on moduleName (Note/Workspace/Ws) and corresponding data
     */
    const isInCurrentModule = (tab: any) => {
        // Check based on moduleName from GridControl
        if (moduleName === constants.modules.note) {
            // NoteGrid view - check if note exists in notes array
            if (tab.type === constants.vscode.tab.tabTypes.note) {
                const note = tab.data;
                return notes.some((n) => n.id === note.id);
            }
        } else if (moduleName === constants.modules.ws) {
            // WsGrid view - check if workspace exists in workspaces array
            if (tab.type === constants.vscode.tab.tabTypes.workspace) {
                const ws = tab.data;
                return workspaces.some((w) => w.id === ws.id);
            }
        } else if (moduleName === constants.modules.workspace) {
            // Workspace tree view - check if note/workspace exists in currentWorkspace.flatData
            if (!currentWorkspace?.flatData) return false;

            if (tab.type === constants.vscode.tab.tabTypes.note) {
                const note = tab.data;
                return currentWorkspace.flatData.some((item) => item.entityType === 3 && item.entityId === note.id);
            } else if (tab.type === constants.vscode.tab.tabTypes.workspace) {
                const ws = tab.data;
                return ws.id === currentWorkspace.id;
            }
        }

        return false;
    };

    const handleCloseTab = async (event: React.MouseEvent, tabId: string) => {
        event.stopPropagation();

        const tab = openTabs.find((t) => t.id === tabId);
        if (!tab) return;

        // If has unsaved changes and in workspace tree, show confirmation
        if (tab.hasUnsavedChanges) {
            showConfirmation({
                title: tab.title,
                subtitle: "Your changes will be lost if you don't save them.",
                confirmText: "Save",
                thirdButtonText: "Don't Save",
                cancelText: "Cancel",
                confirmColor: "default",
                thirdButtonColor: "destructive",
                cancelColor: "outline",
                anchorEl: event.currentTarget as HTMLElement,
                onConfirm: async () => {
                    try {
                        await upsertOrchestraitor();
                        closeTab(tabId);
                    } catch (error) {
                        console.error("Failed to save:", error);
                        // Không đóng tab nếu save thất bại
                    }
                },
                onThirdButton: () => {
                    // Don't Save - close tab without saving
                    closeTab(tabId);
                },
            });
        } else {
            // No unsaved changes or not in workspace, close directly
            closeTab(tabId);
        }
    };

    const handleTabRightClick = (event: React.MouseEvent, tabId: string) => {
        event.preventDefault();
        event.stopPropagation();

        // Show context menu with tab data
        showContextMenu(event, "tab", { tabId });
    };

    useEffect(() => {
        // update breadcrumbs
        if (currentWorkspace && openTabs.length > 0 && allKeywords.length > 0) {
            const newTabs = openTabs.map((tab) => {
                if (tab.type === constants.vscode.tab.tabTypes.note) {
                    const breadcrumb = generateBreadcrumbForTab(tab.data, tab.type);
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

        return (
            <button
                key={tab.id}
                onClick={() => updateActiveTab(tab.id)}
                onContextMenu={(e) => handleTabRightClick(e, tab.id)}
                className={`
                    group h-[35px] pl-3 pr-1.5 flex items-center gap-2
                    border-r border-b
                    ${
                        activeTabId === tab.id
                            ? `bg-editor-bg text-editor-fg border-b-transparent border-t-2 ${isInCurrentModule(tab) ? "border-t-blue-500" : "border-t-gray-400"}`
                            : "bg-transparent text-muted-foreground border-t border-t-transparent text-gray-600"
                    }
                `}
            >
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
