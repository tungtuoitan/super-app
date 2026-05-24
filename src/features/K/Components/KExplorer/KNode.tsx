import React, { useState, useRef } from "react";
import { NodeApi } from "react-arborist";
import { ChevronDown, ChevronRight, LibraryBig, Library, Bookmark, ChevronsUpDown, ChevronsDownUp } from "lucide-react";
import { useKTreeSelectionHelper } from "../../hooks/kTree/useKTreeSelection.helper";
import { ICON_MAP, IconKey, useMenuContextHelper, HighlightText } from "@/shared";
import { useKStore } from "../../store/useK.store";
import { useKTreeStatusHelper } from "../../hooks/kTree/useKTreeStatus.helper";
import { storageService, STORAGE_KEYS } from "@/shared";
import { useSideBarHelper } from "@/shell";
import { useKNodeSelection } from "../../hooks/kTree/useKNodeSelection.helper";
import {KTreeNode} from "../../types/kV2.type";
import { $hasDescendantWithBlueDot, $hasDescendantWithBrownDot } from "../../hooks/kTree/kTree.miniHelper";
import {kconstants} from "../../utils/k.constants";
import { useKNodeInlineRename } from "../../hooks/kTree/useKNodeInlineRename.helper";

interface NodeProps {
    node: NodeApi<KTreeNode>;
    style: React.CSSProperties;
    dragHandle?: ((el: HTMLDivElement | null) => void);
    treeData: KTreeNode[];
    treeType?: "workspaceTree" | "targetTree";
    markedVisibleIds?: Set<number> | null;
}

type IconProps = {
  className?: string;
  color: string
};

const Folder2: React.FC<IconProps> = ({ className, color }) => (
<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill={color} className="icon icon-tabler icons-tabler-filled icon-tabler-folder w-4 h-4"><path stroke="none" d="M0 0h24v24H0z" fill="none"/><path d="M9 3a1 1 0 0 1 .608 .206l.1 .087l2.706 2.707h6.586a3 3 0 0 1 2.995 2.824l.005 .176v8a3 3 0 0 1 -2.824 2.995l-.176 .005h-14a3 3 0 0 1 -2.995 -2.824l-.005 -.176v-11a3 3 0 0 1 2.824 -2.995l.176 -.005h4z" /></svg>
);

export default Folder2;

interface NodeFolderIconProps {
    nodeIcon: IconKey;
    hasDeletedAncestor: boolean;
    isDirectlyDeleted: boolean;
    nodeColor?: string | null;
}

function NodeFolderIcon({ nodeIcon, hasDeletedAncestor, isDirectlyDeleted, nodeColor }: NodeFolderIconProps) {
    const CustomIcon = ICON_MAP[nodeIcon];
    if (!CustomIcon) return null;
    const isDeleted = hasDeletedAncestor || isDirectlyDeleted;
    return (
        <CustomIcon
            className="w-4 h-4"
            style={{ color: isDeleted ? "#6b7280" : (nodeColor || "#90A4AE") }}
            strokeWidth={2}
        />
    );
}

interface ExpandCollapseButtonProps {
    phase: 0 | 1 | 2;
    onClick: (e: React.MouseEvent) => void;
}

function ExpandCollapseButton({ phase, onClick }: ExpandCollapseButtonProps) {
    const titles = ["Expand children", "Expand all descendants", "Collapse all"] as const;
    return (
        <button
            onClick={onClick}
            title={titles[phase]}
            className="ml-0.5 shrink-0 p-0.5 rounded text-zinc-500 hover:text-zinc-300 transition-colors"
        >
            {phase === 2
                ? <ChevronsDownUp className="w-3 h-3" />
                : <ChevronsUpDown className="w-3 h-3" />}
        </button>
    );
}

export function KNode({ node, style, dragHandle, treeData, treeType = "workspaceTree", markedVisibleIds }: NodeProps) {
    const {
        currentK, allK,
        _treeRef,
        hoveredNodeId, setHoveredNodeId,
        markedNodeId, setMarkedNodeId,
        renamingNodeId, setRenamingNodeId,
        renamingNodeValue, setRenamingNodeValue,
    } = useKStore();
    const { searchQuery } = useSideBarHelper();
    const { showContextMenu } = useMenuContextHelper();
    const { isNodeSelected } = useKTreeSelectionHelper();
    const treeStatus = useKTreeStatusHelper();

    // Safe cast: KTree already filters to only render FolderNode for folders
    const nodeItem = node.data.data;

    // Extract data from flat KItemV2 structure
    const nodeId = nodeItem.id; // workspace_items.id (unique)
    const nodeName = nodeItem.name;
    const nodeColor = nodeItem.color;
    const nodeIcon = nodeItem.icon as IconKey | undefined;
    const hasChildren = (node.data.children?.length ?? 0) > 0;
    const isCollapsed = !node.isOpen && hasChildren;
    const isSelected = isNodeSelected(nodeId);
    const isWorkspaceRoot = nodeItem.id < 0;

    // Check if this node is being dragged
    const isDragging = node.state.isDragging;

    // Check if this node is a valid drop target (being dragged over)
    const isDropTarget = node.state.willReceiveDrop;

    // Check if deleted (including inherited from parent)
    const itemStatus = treeStatus.getItemStatus(nodeItem);

    // Knowledge imageBase64 — used for workspace root node icon
    const knowledgeImage = isWorkspaceRoot
        ? allK.find((k) => k.id === nodeItem.knowledgeId)?.imageBase64 ?? null
        : null;

    // Mark feature
    const isMarked = markedNodeId === nodeId;
    const isDimmed = !!markedVisibleIds && !markedVisibleIds.has(nodeId);
    const isHovered = hoveredNodeId === nodeId;

    const handleToggleMark = (e: React.MouseEvent) => {
        e.stopPropagation();
        e.preventDefault();
        if (!currentK?.id) return;
        const newVal = isMarked ? null : nodeId;
        setMarkedNodeId(newVal);
        if (newVal === null) {
            storageService.remove(`${STORAGE_KEYS.K_TREE_MARK}_${currentK.id}`);
        } else {
            storageService.set(`${STORAGE_KEYS.K_TREE_MARK}_${currentK.id}`, newVal);
        }
    };

    // Inline rename (F2)
    const isEditing = renamingNodeId === nodeId
        && !isWorkspaceRoot
        && !itemStatus.hasDeletedAncestor
        && !itemStatus.isDirectlyDeleted;

    const inputRef = useRef<HTMLInputElement>(null);
    const { renameNode } = useKNodeInlineRename();

    const stopRenaming = () => { setRenamingNodeId(null); setRenamingNodeValue(null); };

    const submitEdit = async () => {
        if (!isEditing) return;
        const newName = (inputRef.current?.value ?? "").trim();
        stopRenaming();
        if (newName && newName !== nodeName) {
            await renameNode(nodeItem, newName);
        }
    };

    // Expand/collapse subtree — 3-state cycle: expand(1 lvl) → expand all → collapse
    // 0 = collapsed, 1 = expanded 1 level, 2 = expanded all
    const [expandPhase, setExpandPhase] = useState<0 | 1 | 2>(0);

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

    // ── Selection + tab open ─────────────────────────────────────────────────
    const { handleMainClick } = useKNodeSelection({ node, nodeId, isSelected, treeType, hasChildren });

    const handleRightClick = (e: React.MouseEvent) => {
        e.stopPropagation();
        e.preventDefault();

        if (treeType === "targetTree") return;
        if (isWorkspaceRoot) return;

        const _currentNode = currentK?.flatData.find((f) => f.id === nodeId);
        const contextData = { ...nodeItem, parentId: _currentNode?.parentId ?? null };
        showContextMenu(e, kconstants.contextMenu.contextMenuTypes.kNode, contextData);
    };

    const handleEditKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        e.stopPropagation();
        if (e.key === "Enter") { e.preventDefault(); submitEdit(); }
        if (e.key === "Escape") { e.preventDefault(); stopRenaming(); }
    };

    return (
        <div
            style={{
                ...style,
                marginLeft: `${node.level * -5}px`,
            }}
            className={`
                ${ treeType === "workspaceTree" && isSelected ? "bg-editor-hover text-white" : "bg-transparent hover:bg-editor-hover-light"}
                rounded
                border-l-2 
                ${nodeItem.statusCode === "learning" && treeType === "workspaceTree" ? "border-blue-400/30" : "border-transparent"}
            `}
        >
            <div
                ref={(el) => {
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
                    ${isDimmed ? "opacity-20" : isDragging ? "opacity-40" : itemStatus.hasDeletedAncestor ? "opacity-60" : "opacity-100"}
                    ${isWorkspaceRoot ? "font-semibold" : ""}
                    ${isDragging && isSelected ? "bg-primary/30 outline outline-1 outline-primary/60 -outline-offset-1 rounded" : ""}
                    ${isDropTarget ? "bg-editor-hover outline outline-1 outline-primary/50 -outline-offset-1 rounded" : ""}
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
                    className={`p-0.5 ${hasChildren ? "" : "opacity-50"} text-editor-fg`}
                >
                    {hasChildren ? node.isOpen ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" /> : <div className="w-3 h-3" />}
                </button>

                {/* Folder Icon */}
                <div
                    className="mr-2 flex items-center"
                    onClick={(e) => {
                        e.stopPropagation();
                        if (hasChildren) node.toggle();
                    }}
                >
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
                        <NodeFolderIcon
                            nodeIcon={nodeIcon}
                            hasDeletedAncestor={itemStatus.hasDeletedAncestor}
                            isDirectlyDeleted={itemStatus.isDirectlyDeleted}
                            nodeColor={nodeColor}
                        />
                    ) : (
                        <Library
                            className={`w-4 h-4 ${itemStatus.hasDeletedAncestor || itemStatus.isDirectlyDeleted ? "text-gray-500" : ""}`}
                            color={!itemStatus.hasDeletedAncestor && !itemStatus.isDirectlyDeleted ? nodeColor || "#90A4AE" : ""}
                        />
                    )}
                </div>

                {/* Folder Info */}
                <div className="flex-1 min-w-0 flex items-center gap-2">
                    <div className="w-full min-w-0 flex items-center gap-2">
                        {isEditing ? (
                            <input
                                ref={inputRef}
                                defaultValue={nodeName}
                                autoFocus
                                onKeyDown={handleEditKeyDown}
                                onBlur={submitEdit}
                                onClick={(e) => e.stopPropagation()}
                                className={`text-sm flex-1 min-w-0 bg-transparent text-editor-fg outline outline-1 outline-white/15 rounded-sm px-0.5 selection:bg-white/20 ${hasChildren ? "font-semibold" : "font-normal"}`}
                                style={{ border: "none" }}
                            />
                        ) : (
                            <HighlightText
                                text={`${nodeName}`}
                                highlight={treeType === "workspaceTree" ? searchQuery : ""}
                                className={`
                                text-sm truncate
                                ${hasChildren ? "font-semibold" : "font-normal"}
                                ${isWorkspaceRoot ? "uppercase tracking-wide" : ""}
                                ${itemStatus.isDirectlyDeleted ? "line-through" : ""}
                                ${itemStatus.hasDeletedAncestor || itemStatus.isDirectlyDeleted ? "text-gray-500" : "text-editor-fg"}
                            `}
                            />
                        )}
                        {/* Status dots — hidden while editing */}
                        {!isEditing && nodeItem.statusCode === "learning" && treeType === "workspaceTree" && (nodeItem.dueSrsCount ?? 0) > 0 && (
                            <span
                                title={`${nodeItem.dueSrsCount} question${nodeItem.dueSrsCount !== 1 ? "s" : ""} due`}
                                className="shrink-0 w-1.5 h-1.5 rounded-full bg-blue-400"
                            />
                        )}
                        {!isEditing && isCollapsed && treeType === "workspaceTree" && !(nodeItem.statusCode === "learning" && (nodeItem.dueSrsCount ?? 0) > 0) && $hasDescendantWithBlueDot(node.data.children ?? []) && (
                            <span
                                title="Descendants have questions due"
                                className="shrink-0 w-1.5 h-1.5 rounded-full bg-blue-400 opacity-60"
                            />
                        )}
                        {!isEditing && treeType === "workspaceTree" && (nodeItem.draftQuestionCount ?? 0) > 0 && (
                            <span
                                title={`${nodeItem.draftQuestionCount} draft question${nodeItem.draftQuestionCount !== 1 ? "s" : ""}`}
                                className="shrink-0 w-1.5 h-1.5 rounded-full bg-amber-800"
                            />
                        )}
                        {!isEditing && isCollapsed && treeType === "workspaceTree" && (nodeItem.draftQuestionCount ?? 0) <= 0 && $hasDescendantWithBrownDot(node.data.children ?? []) && (
                            <span
                                title="Descendants have draft questions"
                                className="shrink-0 w-1.5 h-1.5 rounded-full bg-amber-800 opacity-60"
                            />
                        )}
                        {/* Draft badge — commented out, kept for reference */}
                        {/* {nodeItem.statusCode === "draft" && treeType === "workspaceTree" && (
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
                        )} */}
                    </div>
                </div>

                {/* Mark button — visible on hover or when this node is marked */}
                {!isEditing && !isWorkspaceRoot && treeType === "workspaceTree" && (isHovered || isMarked) && (
                    <button
                        onClick={handleToggleMark}
                        title={isMarked ? "Remove mark" : "Mark subtree"}
                        className={`ml-1 shrink-0 p-0.5 rounded transition-colors ${isMarked ? "text-amber-400 hover:text-amber-300" : "text-zinc-500 hover:text-zinc-300"}`}
                    >
                        <Bookmark className="w-3 h-3" fill={isMarked ? "currentColor" : "none"} />
                    </button>
                )}

                {/* Expand/collapse subtree — 3-state, shown on hover for any node with children */}
                {!isEditing && hasChildren && isHovered && (
                    <ExpandCollapseButton
                        phase={!node.isOpen ? 0 : expandPhase === 0 ? 1 : expandPhase}
                        onClick={handleExpandCollapse}
                    />
                )}
            </div>
        </div>
    );
}
