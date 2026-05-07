import React, { useEffect, useMemo } from "react";
import { workspaceConstants } from "@/features/workspace/workspace.constants";
import { Tree, NodeApi } from "react-arborist";
import { useDragDropManager } from "react-dnd";
import { Loader2 } from "lucide-react";
import { useKStore } from "../../store/useK.store";
import { useSideBarHelper, useEditorTabBarHelper, shellConstants } from "@/shell";
import { useKTreeHelper } from "../../hooks/kTree/useKTree.helper";
import type { KWsResponse } from "../../types/k.type";
import { useMenuContextHelper } from "@/shared";

import { KCustomDragPreview } from "./KCustomDragPreview";
import { KNode } from "./KNode";
import { useCalculateKTreeContainerHeight } from "../../hooks/kTree/useKTreeContainerHeight.headless";
import { useCalculateKTreeDropZoneHeight } from "../../hooks/kTree/useKTreeDropZoneHeight.headless";
import { useScrollToHighlightItem } from "../../hooks/kTree/useKScrollToHighlight.headless";
import { KtreeMiniHelper } from "../../hooks/kTree/kTree.miniHelper";
import { useKTreeSelectionHelper } from "../../hooks/kTree/useKTreeSelection.helper";
import { useKTreeMark } from "../../hooks/kTree/useKTreeMark.helper";
import { useKTreeOpenState } from "../../hooks/kTree/useKTreeOpenState.helper";
import {KTreeNode} from "../../types/kV2.type";
import {kconstants} from "../../utils/k.constants";

export function KTree() {
    const { isDragging, currentK, allK, _treeRef, containerHeight, treeContainerRef, dropZoneHeight, setDropZoneHeight, treeData: _storeTD, setTreeData } = useKStore();
    const { openTabs, patchTab, openSingletonTab, updateActiveTab } = useEditorTabBarHelper();
    const { searchQuery } = useSideBarHelper();
    const { handleSelectionChange, handleKeyDown } = useKTreeSelectionHelper();
    const { handleMove } = useKTreeHelper();
    const { showContextMenu } = useMenuContextHelper();
    const manager = useDragDropManager();
    useCalculateKTreeContainerHeight();
    useScrollToHighlightItem();

    // Always hide question nodes and their descendants — only entity nodes in the tree
    const filteredK = useMemo(() => {
        if (!currentK) return currentK;
        const questionIds = new Set([]);
        const hiddenIds = new Set<number>(questionIds);
        let changed = true;
        while (changed) {
            changed = false;
            for (const n of currentK.flatData) {
                if (!hiddenIds.has(n.id) && n.parentId !== null && hiddenIds.has(n.parentId)) {
                    hiddenIds.add(n.id);
                    changed = true;
                }
            }
        }
        return { ...currentK, flatData: currentK.flatData.filter(n => !hiddenIds.has(n.id)) };
    }, [currentK]);

    // Transform workspace data to tree format
    const treeData = useMemo(() => {
        const baseTree = KtreeMiniHelper.transformToTreeData(filteredK, searchQuery);

        // Add invisible drop zone at the end to catch drops to root level
        if (baseTree.length > 0 && currentK?.id) {
            const dropZoneNode: KTreeNode = {
                id: `drop-zone-root-${currentK.id}`,
                name: "",
                data: {
                    id: workspaceConstants.dropZone.workspaceItemId,
                    knowledgeId: currentK.id,
                    parentId: null,
                    name: "",
                    pathIds: "",
                    pathDepth: 0,
                    createdAt: new Date().toISOString(),
                    isExpanded: false,
                    isSelected: false,
                },
                children: [],
            };
            return [...baseTree, dropZoneNode];
        }

        return baseTree;
    }, [filteredK, searchQuery]);

    useCalculateKTreeDropZoneHeight({
        treeData,
        containerHeight,
        treeRef: _treeRef,
        setDropZoneHeight,
    });

    // Sync local treeData to store so other hooks (e.g. handleDrillDown) can use it
    useEffect(() => { setTreeData(treeData); }, [treeData]);

    // Get all visible folder IDs for keyboard navigation
    const allVisibleFolderIds = KtreeMiniHelper.getAllVisibleNodeIds(treeData);

    // ── Mark feature ─────────────────────────────────────────────────────────
    const { markedVisibleIds } = useKTreeMark(treeData);

    // ── Open/close persistence ───────────────────────────────────────────────
    // const { handleToggle, hasSavedState } = useKTreeOpenState();

    // Auto-expand workspace root on init — skip when saved state exists
    useEffect(() => {
        if (!_treeRef.current || !currentK?.id || treeData.length === 0) return;
        // if (hasSavedState) return;
        const timer = setTimeout(async () => {
            const rootId = workspaceConstants.root.workspaceItemId;
            await KtreeMiniHelper.expandPathToItem(_treeRef, treeData, rootId);
        }, 100);
        return () => clearTimeout(timer);
    }, [currentK?.id]); // Run once per knowledge base switch

    // Keyboard navigation (VS Code-like)
    useEffect(() => {
        const handleKeyDownWrapper = (e: KeyboardEvent) => {
            handleKeyDown(e, allVisibleFolderIds);
        };
        document.addEventListener("keydown", handleKeyDownWrapper);
        return () => {
            document.removeEventListener("keydown", handleKeyDownWrapper);
        };
    }, [allVisibleFolderIds]);

    // Open or focus the singleton K tab — shared by container click and empty-space deselect
    const openOrFocusKTab = () => {
        const kTab = openTabs.find(
            (t) => t.type === shellConstants.vscode.tab.tabTypes.kKnowledge,
        );
        if (kTab) {
            const tabKId = (kTab.data as KWsResponse).id;
            if (tabKId !== currentK?.id && currentK) {
                const ks = allK.find((k) => k.id === currentK.id);
                if (ks) patchTab(kTab.id, { data: ks, data0: ks, title: ks.name || "Knowledge", hasUnsavedChanges: false });
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
    };

    // Handle click on padding area outside Tree rows
    const handleContainerClick = (e: React.MouseEvent) => {
        const target = e.target as HTMLElement;
        const isTreeNode = target.closest('[role="treeitem"]') || target.closest(".tree-node");
        if (isTreeNode) return;
        openOrFocusKTab();
    };

    // Handle context menu on empty space (treat as root workspace)
    const handleContainerContextMenu = (e: React.MouseEvent) => {
        const target = e.target as HTMLElement;
        const isTreeNode = target.closest('[role="treeitem"]') || target.closest(".tree-node");
        if (isTreeNode) return;

        e.preventDefault();
        e.stopPropagation();

        if (treeData && treeData.length > 0) {
            const rootData = treeData[0].data;
            showContextMenu(e, kconstants.contextMenu.contextMenuTypes.kNode, {
                ...rootData,
                parentId: null,
            });
        }
    };

    return (
        <>
            <div
                ref={treeContainerRef}
                data-workspace-tree
                tabIndex={0}
                onClick={handleContainerClick}
                onContextMenu={handleContainerContextMenu}
                className="h-full flex flex-col py-4 pl-4 pt-0 relative focus:outline-none focus-within:bg-editor-hover/30 transition-colors overflow-auto"
            >
                {/* Loading overlay when dragging */}
                {isDragging && (
                    <div className="absolute inset-0 bg-black/5 z-[1000] flex items-center justify-center pointer-events-none">
                        <div className="bg-editor-sidebar p-4 px-6 rounded-lg shadow-lg flex items-center gap-3">
                            <Loader2 className="w-5 h-5 text-primary animate-spin" />
                            <span className="text-sm text-editor-fg">Moving folder...</span>
                        </div>
                    </div>
                )}
                <Tree<KTreeNode>
                    ref={_treeRef}
                    data={treeData}
                    width="100%"
                    openByDefault={false}
                    height={containerHeight || 800}
                    indent={24}
                    rowHeight={32}
                    overscanCount={8}
                    dndManager={manager}
                    onMove={async (args) => {
                        await handleMove(args, treeData);
                    }}
                    // onToggle={handleToggle}
                    onSelect={(nodes: NodeApi<KTreeNode>[]) => {
                        handleSelectionChange(nodes);
                        if (nodes.length === 0) openOrFocusKTab();
                    }}
                    disableMultiSelection={false}
                    disableEdit={true}
                    renderDragPreview={(props) => <KCustomDragPreview {...props} treeData={treeData} />}
                >
                    {({ node, style, dragHandle }) => {
                        const item = node.data.data;
                        const isDropZone = item.id === workspaceConstants.dropZone.workspaceItemId;

                        return (
                            <div
                                style={{
                                    ...style,
                                    height: isDropZone ? `${dropZoneHeight}px` : style.height,
                                }}
                            >
                                {isDropZone ? (
                                    <div
                                        className="drop-zone-root"
                                        style={{
                                            height: `${dropZoneHeight}px`,
                                            width: "100%",
                                            display: "flex",
                                            alignItems: "flex-start",
                                            paddingTop: "2px",
                                            boxSizing: "border-box",
                                        }}
                                        data-drop-zone="root"
                                        onDragOver={(e) => {
                                            e.preventDefault();
                                            e.currentTarget.setAttribute("data-dragging-over", "true");
                                        }}
                                        onDragLeave={(e) => {
                                            e.currentTarget.removeAttribute("data-dragging-over");
                                        }}
                                        onDrop={(e) => {
                                            e.currentTarget.removeAttribute("data-dragging-over");
                                        }}
                                        onContextMenu={(e) => {
                                            e.preventDefault();
                                            e.stopPropagation();
                                            if (treeData && treeData.length > 0) {
                                                const rootData = treeData[0].data;
                                                showContextMenu(e, kconstants.contextMenu.contextMenuTypes.kNode, {
                                                    ...rootData,
                                                    parentId: null,
                                                });
                                            }
                                        }}
                                    ></div>
                                ) : (
                                    <KNode
                                        node={node}
                                        style={{ height: "100%" }}
                                        dragHandle={dragHandle}
                                        treeData={treeData}
                                        markedVisibleIds={markedVisibleIds}
                                    />
                                )}
                            </div>
                        );
                    }}
                </Tree>
            </div>
        </>
    );
}
