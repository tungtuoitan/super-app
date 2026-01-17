import React from "react";
import { NodeApi } from "react-arborist";
import { ChevronDown, ChevronRight, Tag as TagIcon, FolderOpen, Folder as FolderIcon, Layers } from "lucide-react";
import { useWorkspaceStore } from "@/store/index";
import { useGridControlStore } from "@/store/grid/useGridControl.store";
import { useTreeHelper2 } from "@/hooks/workspace/useTreeHelper2";
import { treeMiniHelper, TreeFolder } from "@/hooks/workspace/tree.miniHelper";
import { useTreeStatusHelper } from "@/hooks/workspace/useTreeStatusHelper";
import { WorkspaceFolderItem } from "@/types/workspace-v2.types";
import { constants } from "@/utils/constants";
import { useOrchestratorContextMenuHelper } from "@/shared/contexts/helpers/useOrchestratorContextMenu.helper";
import { HighlightText } from "./HighlightText";
import {ICON_MAP, IconType} from "@/shared/icons";

interface FolderNodeProps {
    node: NodeApi<TreeFolder>;
    style: React.CSSProperties;
    dragHandle?: any;
    treeData: TreeFolder[];
    treeType?: "workspaceTree" | "targetTree";
}

export function FolderNode({ node, style, dragHandle, treeData, treeType = "workspaceTree" }: FolderNodeProps) {
    const { selectedItemIds, setSelectedItemIds, lastSelectedItemId, setLastSelectedItemId, currentWorkspace, _treeRef,setScrollToItem } = useWorkspaceStore();
    const { searchQuery } = useGridControlStore();
    const { showContextMenu } = useOrchestratorContextMenuHelper();
    const { isFolderSelected, getVisibleNodeIds } = useTreeHelper2();
    const _TREESTATUS = useTreeStatusHelper();

    // Safe cast: WorkspaceTree already filters to only render FolderNode for folders
    const folderItem = node.data.data as unknown as WorkspaceFolderItem;

    // Extract data from V2 structure
    const workspaceItemId = folderItem.id; // workspace_items.id (unique)
    const entityId = folderItem.entityId; // folders.id (for API calls, context menu)
    const folderName = folderItem.data.name;
    const folderColor = folderItem.data.color;
    const folderIcon = folderItem.data.icon as IconType | undefined; // Icon type from database
    const hasChildren = node.data.children && node.data.children.length > 0;
    const isSelected = isFolderSelected(workspaceItemId); // Use workspace_items.id for selection
    const isWorkspaceRoot = entityId < 0; // Workspace root node has negative ID

    // Check if this node is being dragged
    const isDragging = node.state.isDragging;

    // Check if this node is a valid drop target (being dragged over)
    const isDropTarget = node.state.willReceiveDrop;

    // Check if deleted (including inherited from parent)
    const _ITEMSTATUS = _TREESTATUS.getItemStatus(folderItem);

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
        if (isWorkspaceRoot) {
            // Only allow expand/collapse for workspace root
            if (hasChildren) {
                node.toggle();
            }
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
                setSelectedItemIds((prev: number[]) => prev.filter((id) => id !== workspaceItemId));
                // Sync with react-arborist
                node.deselect();
            } else {
                setSelectedItemIds((prev: number[]) => [...prev, workspaceItemId]);
                // Sync with react-arborist (multi-select mode)
                node.selectMulti();
            }
            setLastSelectedItemId(workspaceItemId);
        } else if (e.shiftKey && lastSelectedItemId) {
            // Shift+Click: Range selection (like VS Code) - only visible nodes
            const tree = _treeRef?.current;
            if (!tree) {
                // Fallback if tree ref not available
                setSelectedItemIds([workspaceItemId]);
                setLastSelectedItemId(workspaceItemId);
                node.select();
                return;
            }

            const allVisibleNodeIds = getVisibleNodeIds();
            const lastIndex = allVisibleNodeIds.indexOf(lastSelectedItemId);
            const currentIndex = allVisibleNodeIds.indexOf(workspaceItemId);

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
                setLastSelectedItemId(workspaceItemId);
            } else {
                setSelectedItemIds([workspaceItemId]);
                setLastSelectedItemId(workspaceItemId);
                node.select();
            }
        } else {
            // Regular click: Single selection + toggle expand/collapse if has children (like VS Code)
            setSelectedItemIds([workspaceItemId]);
            setLastSelectedItemId(workspaceItemId);
            // Sync with react-arborist (single select - clears others)
            node.select();

            // Toggle expand/collapse if node has children
            if (hasChildren) {
                node.toggle();
            }
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

        const _currentFolder = currentWorkspace?.flatData.find((f: any) => f.entityId === entityId);

        // Open folder-specific context menu with folder data (V2 structure)
        const contextData = { ...folderItem, parentId: _currentFolder?.parentId ?? null };
        showContextMenu(e, constants.workspace.itemTypes.folder, contextData);
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
                    className={`p-0.5 ${hasChildren ? "visible" : "invisible"} text-editor-fg`}
                >
                    {hasChildren ? node.isOpen ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" /> : <div className="w-3 h-3" />}
                </button>

                {/* Folder Icon */}
                <div className="mr-2 flex items-center"> 
                    {/* Workspace root node */}
                    {isWorkspaceRoot ? (
                        <Layers className="w-4 h-4" style={{ color: folderColor || "#75beff" }} />
                    ) : folderIcon && ICON_MAP[folderIcon] ? (
                        // Custom icon from database
                        (() => {
                            const CustomIcon = ICON_MAP[folderIcon];
                            return (
                                <CustomIcon
                                    className={`w-4 h-4 ${_ITEMSTATUS.hasDeletedAncestor || _ITEMSTATUS.isDirectlyDeleted ? "text-gray-500" : ""}`}
                                    style={!_ITEMSTATUS.hasDeletedAncestor && !_ITEMSTATUS.isDirectlyDeleted ? { color: folderColor || "#75beff" } : {}}
                                />
                            );
                        })()
                    ) : hasChildren ? (
                        node.isOpen ? (
                            <FolderOpen
                                className={`w-4 h-4 ${_ITEMSTATUS.hasDeletedAncestor || _ITEMSTATUS.isDirectlyDeleted ? "text-gray-500" : ""}`}
                                style={!_ITEMSTATUS.hasDeletedAncestor && !_ITEMSTATUS.isDirectlyDeleted ? { color: folderColor || "#75beff" } : {}}
                            />
                        ) : (
                            <FolderIcon
                                className={`w-4 h-4 ${_ITEMSTATUS.hasDeletedAncestor || _ITEMSTATUS.isDirectlyDeleted ? "text-gray-500" : ""}`}
                                style={!_ITEMSTATUS.hasDeletedAncestor && !_ITEMSTATUS.isDirectlyDeleted ? { color: folderColor || "#75beff" } : {}}
                            />
                        )
                    ) : (
                        <FolderIcon
                            className={`w-4 h-4 ${_ITEMSTATUS.hasDeletedAncestor || _ITEMSTATUS.isDirectlyDeleted ? "text-gray-500" : ""}`}
                            style={!_ITEMSTATUS.hasDeletedAncestor && !_ITEMSTATUS.isDirectlyDeleted ? { color: folderColor || "#75beff" } : {}}
                        />
                    )}
                </div>

                {/* Folder Info */}
                <div className="flex-1 min-w-0 flex items-center gap-2">
                    <div className="w-full min-w-0 flex items-center gap-2">
                        <HighlightText
                            text={`${folderName}`}
                            // text={`${folderName} - ${workspaceItemId} - ${entityId}`}
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
