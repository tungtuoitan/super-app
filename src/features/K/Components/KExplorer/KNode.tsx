import React, { useEffect, useRef, useState } from "react";
import { NodeApi } from "react-arborist";
import { ChevronDown, ChevronRight, LibraryBig, Library, Bookmark, ChevronsUpDown, ChevronsDownUp } from "lucide-react";
import { useGridControlStore } from "@/shared";
import { KuseTreeHelper2 as useKTreeHelper2 } from "../../hooks/kTree/useKTreeHelper2";
import { useOrchestratorContextMenuHelper } from "@/shared";
import { KHighlightText } from "./KHighlightText";
import { useKStore } from "../../store/K.store";
import { useKTreeStatusHelper } from "../../hooks/kTree/useKTreeStatusHelper";
import { KTreeNode } from "../../hooks";
import { kconstants } from "../../utils/K.Constants";
import { KIconKey } from "../../shared/icons/icon.types";
import { ICON_MAP } from "../../shared/icons/icon.config";
import { useKNodeDialogHelper } from "../../hooks/useKNodeDialog.helper";
import { storageService, STORAGE_KEYS } from "@/shared";
import { constants } from "@/shared";
import type { KWsResponse } from "../../types/K.types";
import { kTestDrag, KANBAN_TEST_TO_TREE, type KanbanTestToTreeItem } from "../KTestDetail/kTestDrag";
import { useDrop } from "react-dnd";
import { KTestService } from "../../service/kTest.service";
import {useEditorTabBarStore} from "@/shell";

interface NodeProps {
    node: NodeApi<KTreeNode>;
    style: React.CSSProperties;
    dragHandle?: any;
    treeData: KTreeNode[];
    treeType?: "workspaceTree" | "targetTree";
    markedVisibleIds?: Set<number> | null;
    markedNodeId?: number | null;
    setMarkedNodeId?: React.Dispatch<React.SetStateAction<number | null>>;
    currentKId?: number | null;
}

type IconProps = {
  className?: string;
  color: string

};

const Folder2: React.FC<IconProps> = ({ className, color }) => (
<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill={color} className="icon icon-tabler icons-tabler-filled icon-tabler-folder w-4 h-4"><path stroke="none" d="M0 0h24v24H0z" fill="none"/><path d="M9 3a1 1 0 0 1 .608 .206l.1 .087l2.706 2.707h6.586a3 3 0 0 1 2.995 2.824l.005 .176v8a3 3 0 0 1 -2.824 2.995l-.176 .005h-14a3 3 0 0 1 -2.995 -2.824l-.005 -.176v-11a3 3 0 0 1 2.824 -2.995l.176 -.005h4z" /></svg>
);

export default Folder2;

export function KNode({ node, style, dragHandle, treeData, treeType = "workspaceTree", markedVisibleIds, markedNodeId, setMarkedNodeId, currentKId }: NodeProps) {
    const { selectedItemIds, setSelectedItemIds, lastSelectedItemId, setLastSelectedItemId, currentK, allK, _treeRef, setScrollToItem, hoveredNodeId, setHoveredNodeId, setPendingQuizTabSwitch } = useKStore();    const { searchQuery } = useGridControlStore();
    const { openTabs, setOpenTabs, setActiveTabId } = useEditorTabBarStore();
    const { showContextMenu } = useOrchestratorContextMenuHelper();
    const { isNodeSelected, getVisibleNodeIds } = useKTreeHelper2();
    const _TREESTATUS = useKTreeStatusHelper();
    const { activateDraftNode } = useKNodeDialogHelper();

    // Safe cast: KTree already filters to only render FolderNode for folders
    const nodeItem = node.data.data;

    // Extract data from flat KItemV2 structure
    const nodeId = nodeItem.id; // workspace_items.id (unique)
    const nodeName = nodeItem.name;
    const nodeColor = nodeItem.color;
    const nodeIcon = nodeItem.icon as KIconKey | undefined;
    const hasChildren = node.data.children && node.data.children.length > 0;
    const isSelected = isNodeSelected(nodeId);
    const isWorkspaceRoot = nodeItem.id < 0;

    // Check if this node is being dragged
    const isDragging = node.state.isDragging;

    // Check if this node is a valid drop target (being dragged over)
    const isDropTarget = node.state.willReceiveDrop;

    // Check if deleted (including inherited from parent)
    const _ITEMSTATUS = _TREESTATUS.getItemStatus(nodeItem);

    // Knowledge imageBase64 — used for workspace root node icon
    const knowledgeImage = isWorkspaceRoot
        ? allK.find((k) => k.id === nodeItem.knowledgeId)?.imageBase64 ?? null
        : null;

    // Mark feature
    const isMarked = markedNodeId === nodeId;
    const isDimmed = !!markedVisibleIds && !markedVisibleIds.has(nodeId);
    const isHovered = hoveredNodeId === nodeId;

    // ── Native drag tracking for test-panel drop zone ─────────────────────────
    // Use native addEventListener (not React synthetic or state) to avoid
    // conflicting with react-arborist's DnD system. Writes to a module-level
    // variable (kTestDrag) so NO React re-render happens during drag.
    const innerDivRef  = useRef<HTMLDivElement | null>(null);
    const dragStateRef = useRef({ selectedItemIds, nodeId });
    dragStateRef.current = { selectedItemIds, nodeId }; // always fresh

    useEffect(() => {
        const el = innerDivRef.current;
        if (!el) return;
        const onDragStart = () => {
            const { selectedItemIds: sids, nodeId: nid } = dragStateRef.current;
            const ids = sids.includes(nid) && sids.length > 0 ? [...sids] : [nid];
            kTestDrag.set(ids);
        };
        const onDragEnd = () => kTestDrag.clear();
        el.addEventListener("dragstart", onDragStart);
        el.addEventListener("dragend",   onDragEnd);
        return () => {
            el.removeEventListener("dragstart", onDragStart);
            el.removeEventListener("dragend",   onDragEnd);
        };
    }, []);

    // ── Drop zone for kanban test columns ────────────────────────────────────
    const [{ isTestOver }, testDropRef] = useDrop<KanbanTestToTreeItem, void, { isTestOver: boolean }>(() => ({
        accept: KANBAN_TEST_TO_TREE,
        canDrop: () => !isWorkspaceRoot,
        drop: (item) => {
            const targetNodeId = nodeItem.id; // k.node.id
            KTestService._updateTest(item.knowledgeId, item.testId, { nodeId: targetNodeId }).then(() => {
                window.dispatchEvent(new CustomEvent("k-test-moved", { detail: { sourceNodeId: item.sourceNodeId, knowledgeId: item.knowledgeId } }));
            });
        },
        collect: monitor => ({ isTestOver: monitor.isOver() && monitor.canDrop() }),
    }), [nodeItem.id, isWorkspaceRoot]);

    const handleToggleMark = (e: React.MouseEvent) => {
        e.stopPropagation();
        e.preventDefault();
        if (!setMarkedNodeId || !currentKId) return;
        const newVal = isMarked ? null : nodeId;
        setMarkedNodeId(newVal);
        if (newVal === null) {
            storageService.remove(`${STORAGE_KEYS.K_TREE_MARK}_${currentKId}`);
        } else {
            storageService.set(`${STORAGE_KEYS.K_TREE_MARK}_${currentKId}`, newVal);
        }
    };

    // Expand/collapse subtree — 3-state cycle: expand(1 lvl) → expand all → collapse
    // 0 = collapsed, 1 = expanded 1 level, 2 = expanded all
    const [expandPhase, setExpandPhase] = useState<0 | 1 | 2>(0);
    const [isDraftHovered, setIsDraftHovered] = useState(false);

    function findSubtree(nodes: KTreeNode[], targetId: number): KTreeNode | null {
        for (const n of nodes) {
            if (n.data.id === targetId) return n;
            const found = findSubtree(n.children ?? [], targetId);
            if (found) return found;
        }
        return null;
    }
    function collectAllTreeIds(n: KTreeNode): string[] {
        return [n.id, ...(n.children ?? []).flatMap(collectAllTreeIds)];
    }

    /** Open node + all descendants level-by-level so react-arborist has time to register each level */
    function openSubtreeLevelByLevel(root: KTreeNode) {
        function getLevels(n: KTreeNode, depth: number, acc: string[][]) {
            if (!acc[depth]) acc[depth] = [];
            acc[depth].push(n.id);
            for (const child of n.children ?? []) getLevels(child, depth + 1, acc);
        }
        const levels: string[][] = [];
        getLevels(root, 0, levels);
        levels.forEach((ids, i) => {
            setTimeout(() => ids.forEach(id => _treeRef.current?.get(id)?.open()), i * 40);
        });
    }

    const handleExpandCollapse = (e: React.MouseEvent) => {
        e.stopPropagation();
        e.preventDefault();
        if (!_treeRef.current || !hasChildren) return;

        const subtree = findSubtree(treeData, nodeId);
        if (!subtree) return;

        // Reset if node was manually closed from outside
        const currentPhase = !node.isOpen ? 0 : expandPhase === 0 ? 1 : expandPhase;

        if (currentPhase === 0) {
            // Collapsed → expand 1 level: open this node only
            _treeRef.current.get(subtree.id)?.open();
            (subtree.children ?? []).forEach(child => _treeRef.current?.get(child.id)?.close());
            setExpandPhase(1);
        } else if (currentPhase === 1) {
            // Expanded 1 level → expand ALL descendants (level-by-level for virtualization)
            openSubtreeLevelByLevel(subtree);
            setExpandPhase(2);
        } else {
            // Expanded all → collapse (close this node + all descendants)
            collectAllTreeIds(subtree).forEach(id => _treeRef.current?.get(id)?.close());
            setExpandPhase(0);
        }
    };

    const handleMainClick = (e: React.MouseEvent) => {
        e.stopPropagation();
        e.preventDefault(); // Prevent tree activation that causes scrolling
        setScrollToItem(false); // Clear any existing highlight

        // For targetTree, only allow expand/collapse (no selection)
        if (treeType === "targetTree") {
            if (hasChildren) {
                node.toggle();
            }
            return;
        }

        // Don't allow selection of workspace root node
        // if (isWorkspaceRoot) {
        //     // Only allow expand/collapse for workspace root
        //     if (hasChildren) {
        //         node.toggle();
        //     }
        //     return;
        // }

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
                // Sync with react-arborist
                node.deselect();
            } else {
                setSelectedItemIds((prev: number[]) => [...prev, nodeId]);
                // Sync with react-arborist (multi-select mode)
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

                // Deselect all first
                tree.deselectAll();

                // Select all nodes in range using tree API
                tree.visibleNodes.forEach((visibleNode: any) => {
                    const nodeItemId = (visibleNode.data.data as any).id;
                    if (rangeSelection.includes(nodeItemId)) {
                        visibleNode.selectMulti();
                    }
                });

                // Store will be updated by tree's onSelect handler
                setLastSelectedItemId(nodeId);
            } else {
                setSelectedItemIds([nodeId]);
                setLastSelectedItemId(nodeId);
                node.select();
            }
        } else {
            // Regular click: Single selection + open node tab (no toggle — icon handles toggle)
            setSelectedItemIds([nodeId]);
            setLastSelectedItemId(nodeId);
            node.select();
            // 1. Find or create the single k-knowledge editor tab
            const kTab = openTabs.find(
                (t) => t.type === constants.vscode.tab.tabTypes.kKnowledge
            );
            if (kTab) {
                // Reuse — swap data if different knowledge
                const tabKId = (kTab.data as KWsResponse).id;
                if (tabKId !== currentK?.id && currentK) {
                    const ks = allK.find((k) => k.id === currentK.id);
                    if (ks) {
                        setOpenTabs((prev: any[]) =>
                            prev.map((t) =>
                                t.id === kTab.id
                                    ? { ...t, data: ks, data0: ks, title: ks.name || "Knowledge", hasUnsavedChanges: false }
                                    : t,
                            ),
                        );
                    }
                }
                setActiveTabId(kTab.id);
            } else if (currentK) {
                // No tab open yet — find the KWsResponse from allK and create one
                const ks = allK.find((k) => k.id === currentK.id);
                if (ks) {
                    const newTab = {
                        id:                `k-knowledge-tab-${Date.now()}`,
                        type:              constants.vscode.tab.tabTypes.kKnowledge,
                        data:              ks,
                        data0:             ks,
                        title:             ks.name || "Knowledge",
                        hasUnsavedChanges: false,
                    };
                    setOpenTabs((prev: any[]) => [...prev, newTab]);
                    setActiveTabId(newTab.id);
                }
            }
            // 2. Signal KKnowledgeEditorPanel to switch to Quiz tab
            setPendingQuizTabSwitch(nodeId);
        }
    };

    const handleRightClick = (e: React.MouseEvent) => {
        e.stopPropagation(); // Prevent bubbling to parent
        e.preventDefault(); // Prevent default context menu

        // Don't show context menu for targetTree
        if (treeType === "targetTree") {
            return;
        }

        // Don't show context menu for workspace root
        if (isWorkspaceRoot) {
            return;
        }

        const _currentNode = currentK?.flatData.find((f: any) => f.id === nodeId);

        // Open folder-specific context menu with folder data (V2 structure)
        const contextData = { ...nodeItem, parentId: _currentNode?.parentId ?? null };
        showContextMenu(e, kconstants.contextMenu.contextMenuTypes.kNode, contextData);
    };

    return (
        <div
            style={{
                ...style,
                marginLeft: `${node.level * -5}px`, // Reduced from default ~20-24px per level to 12px
            }}
            className={`
                ${ treeType === "workspaceTree" && isSelected ? "bg-editor-hover text-white" : "bg-transparent hover:bg-editor-hover-light"}
                rounded
            `}
        >
            <div
                ref={(el) => {
                    // Also store for native drag listeners (test drop zone)
                    innerDivRef.current = el;
                    // react-dnd drop target for kanban test columns
                    testDropRef(el);
                    // Make entire node draggable (VS Code style - no special cursor)
                    if (dragHandle && typeof dragHandle === "function" && el) {
                        try {
                            dragHandle(el);
                        } catch (error) {
                            console.warn("Error setting dragHandle:", error);
                        }
                    }
                }}
                onClick={handleMainClick}
                onContextMenu={handleRightClick}
                onMouseEnter={() => setHoveredNodeId(nodeId)}
                onMouseLeave={() => setHoveredNodeId(null)}
                className={`
                    flex items-center h-full w-full py-1 pr-2 cursor-pointer
                    ${isDimmed ? "opacity-20" : isDragging ? "opacity-40" : _ITEMSTATUS.hasDeletedAncestor ? "opacity-60" : "opacity-100"}
                    ${isWorkspaceRoot ? "font-semibold" : ""}
                    ${isDragging && isSelected ? "bg-primary/30 outline outline-1 outline-primary/60 -outline-offset-1 rounded" : ""}
                    ${isDropTarget ? "bg-editor-hover outline outline-1 outline-primary/50 -outline-offset-1 rounded" : ""}
                    ${isTestOver ? "bg-blue-500/20 outline outline-1 outline-blue-500/60 -outline-offset-1 rounded" : ""}
                `}
            >
                {/* Expand/Collapse Button */}
                <button
                    onClick={(e) => {
                        e.stopPropagation();
                        e.preventDefault();
                        node.toggle();
                    }}
                    disabled={!hasChildren}
                    // className={`p-0.5 text-editor-fg`}
                    className={`p-0.5 ${hasChildren ? "" : "opacity-50"} text-editor-fg`}
                >
                    {hasChildren ? node.isOpen ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" /> : <div className="w-3 h-3" />}
                </button>

                {/* Folder Icon - VS Code Material Icon Theme style */}
                <div
                    className="mr-2 flex items-center"
                    onClick={(e) => {
                        e.stopPropagation();
                        if (hasChildren) node.toggle();
                    }}
                >
                    {/* Workspace root node */}
                    {isWorkspaceRoot ? (
                        knowledgeImage ? (
                            <img
                                src={knowledgeImage}
                                alt=""
                                className="w-4 h-4 rounded-sm object-cover flex-shrink-0"
                            />
                        ) : (
                            <LibraryBig className="w-4 h-4" style={{ color: nodeColor || "#A1887F" }} />
                        )
                    ) : nodeIcon && ICON_MAP[nodeIcon] ? (
                        (() => {
                            const CustomIcon = ICON_MAP[nodeIcon];
                            const isDeleted = _ITEMSTATUS.hasDeletedAncestor || _ITEMSTATUS.isDirectlyDeleted;
                            return (
                                <CustomIcon
                                    className="w-4 h-4"
                                    style={{ color: isDeleted ? "#6b7280" : (nodeColor || "#90A4AE") }}
                                    strokeWidth={2}
                                />
                            );
                        })()
                    ) : (
                        <Library
                            className={`w-4 h-4 ${_ITEMSTATUS.hasDeletedAncestor || _ITEMSTATUS.isDirectlyDeleted ? "text-gray-500" : ""}`}
                            color={!_ITEMSTATUS.hasDeletedAncestor && !_ITEMSTATUS.isDirectlyDeleted ? nodeColor || "#90A4AE" : ""}
                        />
                    )}
                </div>

                {/* Folder Info */}
                <div className="flex-1 min-w-0 flex items-center gap-2">
                    <div className="w-full min-w-0 flex items-center gap-2">
                        <KHighlightText
                            text={`${nodeName}`}
                            // text={`${nodeName} - ${nodeId} - ${entityId}`}
                            highlight={treeType === "workspaceTree" ? searchQuery : ""} // Only highlight in workspaceTree, tạm thời chưa làm cho targetTree có search
                            className={`
                            text-sm truncate
                            ${hasChildren ? "font-semibold" : "font-normal"}
                            ${isWorkspaceRoot ? "uppercase tracking-wide" : ""}
                            ${_ITEMSTATUS.isDirectlyDeleted ? "line-through" : ""}
                            ${_ITEMSTATUS.hasDeletedAncestor || _ITEMSTATUS.isDirectlyDeleted ? "text-gray-500" : "text-editor-fg"}
                        `}
                        />
                        {/* Draft badge — hover to see "Keep it", click to activate */}
                        {nodeItem.statusCode === "draft" && treeType === "workspaceTree" && (
                            <button
                                onMouseEnter={() => setIsDraftHovered(true)}
                                onMouseLeave={() => setIsDraftHovered(false)}
                                onClick={async (e) => {
                                    e.stopPropagation();
                                    e.preventDefault();
                                    await activateDraftNode(nodeItem);
                                }}
                                title="Click to keep this node (mark as active)"
                                className={`
                                    shrink-0 text-[9px] font-semibold tracking-wide px-1 py-0 rounded border leading-4
                                    transition-colors cursor-pointer
                                    ${isDraftHovered
                                        ? "border-emerald-500/60 text-emerald-400 bg-emerald-900/30"
                                        : "border-amber-600/50 text-amber-500/80 bg-amber-900/20"}
                                `}
                            >
                                {isDraftHovered ? "Keep it" : "DRAFT"}
                            </button>
                        )}
                    </div>
                </div>

                {/* Mark button — visible on hover or when this node is marked */}
                {!isWorkspaceRoot && treeType === "workspaceTree" && (isHovered || isMarked) && (
                    <button
                        onClick={handleToggleMark}
                        title={isMarked ? "Remove mark" : "Mark subtree"}
                        className={`ml-1 shrink-0 p-0.5 rounded transition-colors ${isMarked ? "text-amber-400 hover:text-amber-300" : "text-zinc-500 hover:text-zinc-300"}`}
                    >
                        <Bookmark className="w-3 h-3" fill={isMarked ? "currentColor" : "none"} />
                    </button>
                )}

                {/* Expand/collapse subtree — 3-state, shown on hover for any node with children */}
                {hasChildren && isHovered && (() => {
                    const phase = !node.isOpen ? 0 : expandPhase === 0 ? 1 : expandPhase;
                    const titles = ["Expand children", "Expand all descendants", "Collapse all"];
                    return (
                        <button
                            onClick={handleExpandCollapse}
                            title={titles[phase]}
                            className="ml-0.5 shrink-0 p-0.5 rounded text-zinc-500 hover:text-zinc-300 transition-colors"
                        >
                            {phase === 2
                                ? <ChevronsDownUp className="w-3 h-3" />
                                : <ChevronsUpDown className="w-3 h-3" />}
                        </button>
                    );
                })()}
            </div>
        </div>
    );
}



