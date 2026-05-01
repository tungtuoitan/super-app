import React, { useEffect, useState, useRef } from "react";
import { useEditorTabHelper } from "./useEditorTab.helper";
import { useWorkspaceStore } from "@/features/workspace";
import { shellConstants, useSideBarStore } from "@/shell";
import { useNoteGridStore } from "@/features/note";
import { useWsStore } from "@/features/workspace";
import { useConfirmationPopoverHelper } from "@/shared";
import { useEditorToolbarHelper } from "./useEditorToolbar.helper";
import { useMenuContextHelper } from "@/shared";
import { useTabBarShortcuts } from "./useTabBarShortcuts";
import { BaseTab } from "@/shell";
import { constants } from "@/shared";
import {useEditorTabBarStore} from "../store/EditorTab.store";

/**
 * TabBar - VS Code style tab bar component
 */
export function useTabBarHelper() {
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
    const { closeTab, updateActiveTab, getActiveTab } = useEditorTabHelper();
    const { currentWorkspace } = useWorkspaceStore();
    const { moduleName } = useSideBarStore();
    const { notes } = useNoteGridStore();
    const { workspaces } = useWsStore();
    const { showConfirmation } = useConfirmationPopoverHelper();
    const { upsertOrchestraitor } = useEditorToolbarHelper();
    const { showContextMenu } = useMenuContextHelper();

    // Enable keyboard shortcuts
    useTabBarShortcuts();

    /**
     * Check if tab exists in current module's data source
     * Based on moduleName (Note/Workspace/Ws) and corresponding data
     */
    const isInCurrentModule = (tab: any) => {
        // Check based on moduleName from GridControl
        if (moduleName === "Note") {
            // NoteGrid view - check if note exists in notes array
            if (tab.type === shellConstants.vscode.tab.tabTypes.note) {
                const note = tab.data;
                return notes.some((n) => n.id === note.id);
            }
        } else if (moduleName === "Ws") {
            // WsGrid view - check if workspace exists in workspaces array
            if (tab.type === shellConstants.vscode.tab.tabTypes.workspace) {
                const ws = tab.data;
                return workspaces.some((w) => w.id === ws.id);
            }
        } else if (moduleName === "Workspace") {
            // Workspace tree view - check if note/workspace exists in currentWorkspace.flatData
            if (!currentWorkspace?.flatData) return false;

            if (tab.type === shellConstants.vscode.tab.tabTypes.note) {
                const note = tab.data;
                return currentWorkspace.flatData.some((item: any) => item.entityType === 3 && item.entityId === note.id);
            } else if (tab.type === shellConstants.vscode.tab.tabTypes.workspace) {
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
                        // KhÃ´ng Ä‘Ã³ng tab náº¿u save tháº¥t báº¡i
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

    // Drag and drop handlers
    const handleDragStart = (e: React.DragEvent, tabId: string, isPinned: boolean) => {
        setDraggedTabId(tabId);
        e.dataTransfer.effectAllowed = "move";
        e.dataTransfer.setData("text/plain", tabId);
        e.dataTransfer.setData("isPinned", isPinned.toString());

        // Add dragging class for visual feedback
        if (e.currentTarget instanceof HTMLElement) {
            e.currentTarget.style.opacity = "0.5";
        }
    };

    const handleDragEnd = (e: React.DragEvent) => {
        setDraggedTabId(null);
        setDragOverTabId(null);
        setDragOverPosition(null);
        dragCounterRef.current = 0;

        if (e.currentTarget instanceof HTMLElement) {
            e.currentTarget.style.opacity = "1";
        }
    };

    const handleDragEnter = (e: React.DragEvent, tabId: string) => {
        e.preventDefault();
        dragCounterRef.current++;
        if (tabId !== draggedTabId) {
            setDragOverTabId(tabId);
        }
    };

    const handleDragLeave = (e: React.DragEvent) => {
        e.preventDefault();
        dragCounterRef.current--;
        if (dragCounterRef.current === 0) {
            setDragOverTabId(null);
            setDragOverPosition(null);
        }
    };

    const handleDragOver = (e: React.DragEvent, tabId: string) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = "move";

        if (tabId === draggedTabId) return;

        // Determine drop position based on mouse position
        const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
        const midX = rect.left + rect.width / 2;
        const position = e.clientX < midX ? "left" : "right";

        setDragOverTabId(tabId);
        setDragOverPosition(position);
    };

    const handleDrop = (e: React.DragEvent, targetTabId: string, targetIsPinned: boolean) => {
        e.preventDefault();

        const sourceTabId = e.dataTransfer.getData("text/plain");

        if (!sourceTabId || sourceTabId === targetTabId) {
            setDraggedTabId(null);
            setDragOverTabId(null);
            setDragOverPosition(null);
            return;
        }

        const sourceIndex = openTabs.findIndex((t) => t.id === sourceTabId);
        const targetIndex = openTabs.findIndex((t) => t.id === targetTabId);

        if (sourceIndex === -1 || targetIndex === -1) return;

        const sourceTab = openTabs[sourceIndex];
        const sourceIsPinned = sourceTab.isPinned;

        // Calculate new position based on drop position
        const newTabs = [...openTabs];
        const [removed] = newTabs.splice(sourceIndex, 1);

        // Update isPinned based on target group
        const updatedTab = { ...removed, isPinned: targetIsPinned };

        let insertIndex = targetIndex;
        if (sourceIndex < targetIndex) {
            insertIndex = dragOverPosition === "right" ? targetIndex : targetIndex - 1;
        } else {
            insertIndex = dragOverPosition === "right" ? targetIndex + 1 : targetIndex;
        }

        // Ensure pinned tabs stay at the beginning
        if (targetIsPinned && !sourceIsPinned) {
            // Moving unpinned to pinned: insert in pinned section
            const lastPinnedIndex = newTabs.filter((t) => t.isPinned).length;
            insertIndex = Math.min(insertIndex, lastPinnedIndex);
        } else if (!targetIsPinned && sourceIsPinned) {
            // Moving pinned to unpinned: insert after all pinned tabs
            const pinnedCount = newTabs.filter((t) => t.isPinned).length;
            insertIndex = Math.max(insertIndex, pinnedCount);
        }

        newTabs.splice(insertIndex, 0, updatedTab);
        setOpenTabs(newTabs);

        // Save pinned state to localStorage
        savePinnedState(newTabs);

        setDraggedTabId(null);
        setDragOverTabId(null);
        setDragOverPosition(null);
    };

    // Save pinned state to localStorage
    const savePinnedState = (tabs: BaseTab[]) => {
        const pinnedState: Record<string, boolean> = {};
        tabs.forEach((tab) => {
            pinnedState[tab.id] = !!tab.isPinned;
        });
        localStorage.setItem("tabPinnedState", JSON.stringify(pinnedState));
    };

    return {
        handleDrop,
        handleDragOver,
        handleDragLeave,
        handleDragEnter,
        handleDragEnd,
        handleDragStart,
        handleTabRightClick,
        handleCloseTab,
        isInCurrentModule,
        getActiveTab,
    };
}




