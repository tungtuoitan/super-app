import React from "react";
import { NodeApi } from "react-arborist";
import { ChevronDown, ChevronRight, LibraryBig, Library } from "lucide-react";
import { useGridControlStore } from "@/store/grid/useGridControl.store";
import { KuseTreeHelper2 as useKTreeHelper2 } from "../../hooks/useKTreeHelper2";
import { useOrchestratorContextMenuHelper } from "@/shared/contexts/helpers/useOrchestratorContextMenu.helper";
import { KHighlightText } from "./KHighlightText";
import {useKStore} from "../../store/K.store";
import {useKTreeStatusHelper} from "../../hooks/useKTreeStatusHelper";
import {KTreeNode} from "../../hooks";
import {kconstants} from "../../utils/K.Constants";
import {IconType} from "../../shared/icons/icon.types";
import {ICON_MAP} from "../../shared/icons/icon.config";
import {useKNodeTabHelper} from "../../hooks/useKNodeTabHelper";

interface NodeProps {
    node: NodeApi<KTreeNode>;
    style: React.CSSProperties;
    dragHandle?: any;
    treeData: KTreeNode[];
    treeType?: "workspaceTree" | "targetTree";
}

type IconProps = {
  className?: string;
  color: string

};

const Folder2: React.FC<IconProps> = ({ className, color }) => (
<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill={color} className="icon icon-tabler icons-tabler-filled icon-tabler-folder w-4 h-4"><path stroke="none" d="M0 0h24v24H0z" fill="none"/><path d="M9 3a1 1 0 0 1 .608 .206l.1 .087l2.706 2.707h6.586a3 3 0 0 1 2.995 2.824l.005 .176v8a3 3 0 0 1 -2.824 2.995l-.176 .005h-14a3 3 0 0 1 -2.995 -2.824l-.005 -.176v-11a3 3 0 0 1 2.824 -2.995l.176 -.005h4z" /></svg>
);

export default Folder2;

export function KNode({ node, style, dragHandle, treeData, treeType = "workspaceTree" }: NodeProps) {
    const { selectedItemIds, setSelectedItemIds, lastSelectedItemId, setLastSelectedItemId, currentK, _treeRef, setScrollToItem, hoveredNodeId, setHoveredNodeId } = useKStore();
    const { searchQuery } = useGridControlStore();
    const { showContextMenu } = useOrchestratorContextMenuHelper();
    const { isNodeSelected, getVisibleNodeIds } = useKTreeHelper2();
    const _TREESTATUS = useKTreeStatusHelper();
    const { openKNodeTab } = useKNodeTabHelper();

    // Safe cast: KTree already filters to only render FolderNode for folders
    const nodeItem = node.data.data;

    // Extract data from flat KItemV2 structure
    const nodeId = nodeItem.id; // workspace_items.id (unique)
    const nodeName = nodeItem.name;
    const nodeColor = nodeItem.color;
    const nodeIcon = nodeItem.icon as IconType | undefined; // Icon type from database
    const hasChildren = node.data.children && node.data.children.length > 0;
    const isSelected = isNodeSelected(nodeId); // Use workspace_items.id for selection
    const isWorkspaceRoot = nodeItem.id < 0; // Workspace root node has negative ID

    // Check if this node is being dragged
    const isDragging = node.state.isDragging;

    // Check if this node is a valid drop target (being dragged over)
    const isDropTarget = node.state.willReceiveDrop;

    // Check if deleted (including inherited from parent)
    const _ITEMSTATUS = _TREESTATUS.getItemStatus(nodeItem);

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
            openKNodeTab(nodeItem);
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
                onMouseEnter={() => !isWorkspaceRoot && setHoveredNodeId(nodeId)}
                onMouseLeave={() => setHoveredNodeId(null)}
                className={`
                    flex items-center h-full w-full py-1 pr-2 cursor-pointer
                    ${isDragging ? "opacity-40" : _ITEMSTATUS.hasDeletedAncestor ? "opacity-60" : "opacity-100"}
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
                        <LibraryBig className="w-4 h-4" style={{ color: nodeColor || "#A1887F" }} />
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
                    </div>
                </div>
            </div>
        </div>
    );
}



