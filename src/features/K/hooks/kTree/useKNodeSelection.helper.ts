import React from "react";
import type { NodeApi } from "react-arborist";
import { useKStore } from "@/features/K/store/useK.store";
import { useEditorTabBarHelper, shellConstants } from "@/shell";
import { useKTreeSelectionHelper } from "./useKTreeSelection.helper";
import type { KWsResponse } from "@/features/K/types/k.type";
import {KTreeNode} from "../../types/kV2.type";

interface UseKNodeSelectionArgs {
    node: NodeApi<KTreeNode>;
    nodeId: number;
    isSelected: boolean;
    treeType: "workspaceTree" | "targetTree";
    hasChildren: boolean;
}

export function useKNodeSelection({
    node, nodeId, isSelected, treeType, hasChildren,
}: UseKNodeSelectionArgs) {
    const {
        setSelectedItemIds,
        lastSelectedItemId, setLastSelectedItemId,
        currentK, allK,
        _treeRef,
        setScrollToItem,
        setPendingQuizTabSwitch,
    } = useKStore();
    const { openTabs, patchTab, openSingletonTab, updateActiveTab } = useEditorTabBarHelper();
    const { getVisibleNodeIds } = useKTreeSelectionHelper();

    const handleMainClick = (e: React.MouseEvent) => {
        e.stopPropagation();
        e.preventDefault(); // Prevent tree activation that causes scrolling
        setScrollToItem(false); // Clear any existing highlight

        // For targetTree, only allow expand/collapse (no selection)
        if (treeType === "targetTree") {
            if (hasChildren) node.toggle();
            return;
        }

        // Focus the tree container for keyboard navigation without scrolling
        const treeContainer = document.querySelector("[data-workspace-tree]") as HTMLElement;
        if (treeContainer) {
            const scrollPos = window.scrollY || window.pageYOffset;
            treeContainer.focus({ preventScroll: true });
            window.scrollTo(0, scrollPos);
        }

        if (e.ctrlKey || e.metaKey) {
            // Ctrl+Click: Toggle selection (like VS Code)
            if (isSelected) {
                setSelectedItemIds((prev: number[]) => prev.filter((id) => id !== nodeId));
                node.deselect();
            } else {
                setSelectedItemIds((prev: number[]) => [...prev, nodeId]);
                node.selectMulti();
            }
            setLastSelectedItemId(nodeId);
        } else if (e.shiftKey && lastSelectedItemId) {
            // Shift+Click: Range selection (like VS Code) - only visible nodes
            const tree = _treeRef?.current;
            if (!tree) {
                // Fallback if tree ref not available
                setSelectedItemIds([nodeId]);
                setLastSelectedItemId(nodeId);
                node.select();
                return;
            }

            const allVisibleNodeIds = getVisibleNodeIds();
            const lastIndex = allVisibleNodeIds.indexOf(lastSelectedItemId);
            const currentIndex = allVisibleNodeIds.indexOf(nodeId);

            if (lastIndex !== -1 && currentIndex !== -1) {
                const startIndex = Math.min(lastIndex, currentIndex);
                const endIndex = Math.max(lastIndex, currentIndex);
                const rangeSelection = allVisibleNodeIds.slice(startIndex, endIndex + 1);

                tree.deselectAll();
                tree.visibleNodes.forEach((visibleNode: { data: KTreeNode; selectMulti: () => void }) => {
                    const nodeItemId = visibleNode.data.data.id;
                    if (rangeSelection.includes(nodeItemId)) visibleNode.selectMulti();
                });

                setLastSelectedItemId(nodeId);
            } else {
                setSelectedItemIds([nodeId]);
                setLastSelectedItemId(nodeId);
                node.select();
            }
        } else {
            // Regular click: Single selection + open node tab
            setSelectedItemIds([nodeId]);
            setLastSelectedItemId(nodeId);
            node.select();

            // Find or reuse the singleton k-knowledge editor tab
            const kTab = openTabs.find(
                (t) => t.type === shellConstants.vscode.tab.tabTypes.kKnowledge,
            );
            if (kTab) {
                const tabKId = (kTab.data as KWsResponse).id;
                if (tabKId !== currentK?.id && currentK) {
                    const ks = allK.find((k) => k.id === currentK.id);
                    if (ks) {
                        patchTab(kTab.id, { data: ks, data0: ks, title: ks.name || "Knowledge", hasUnsavedChanges: false });
                    }
                }
                updateActiveTab(kTab.id);
            } else if (currentK) {
                const ks = allK.find((k) => k.id === currentK.id);
                if (ks) {
                    openSingletonTab(
                        shellConstants.vscode.tab.tabTypes.kKnowledge,
                        { title: ks.name || "Knowledge", tabId: `k-knowledge-tab-${Date.now()}`, hasUnsavedChanges: false },
                        ks,
                    );
                }
            }

            // Signal KEditorPanel to switch to Quiz tab
            setPendingQuizTabSwitch(nodeId);
        }
    };

    return { handleMainClick };
}
