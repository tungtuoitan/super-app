import React, { useEffect, useState, useRef } from "react";
import { useEditorTabHelper } from "./useEditorTab.helper";
import { moduleRegistry } from "@/shell";
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
    const { showConfirmation } = useConfirmationPopoverHelper();
    const { upsertOrchestraitor } = useEditorToolbarHelper();
    const { showContextMenu } = useMenuContextHelper();

    // Enable keyboard shortcuts
    useTabBarShortcuts();

    // Collect per-module "is this tab in the active sidebar module?" predicates
    // eslint-disable-next-line react-hooks/rules-of-hooks -- registry is immutable after startup; hook count is stable
    const moduleIsInPreds = moduleRegistry.getAll()
        .filter((m) => m.useIsInModule != null)
        // eslint-disable-next-line react-hooks/rules-of-hooks
        .map((m) => m.useIsInModule!());

    const isInCurrentModule = (tab: BaseTab) => moduleIsInPreds.some((pred) => pred(tab));

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




