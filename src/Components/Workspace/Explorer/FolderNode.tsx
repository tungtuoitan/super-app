import React from "react";
import { NodeApi } from "react-arborist";
import { ChevronDown, ChevronRight, Tag as TagIcon, FolderOpen, Folder as FolderIcon, Layers } from "lucide-react";
import { useWorkspaceStore } from "@/store/index";
import { useTreeSelectionHelper } from "@/hooks/workspace/useTreeSelectionHelper";
import { treeMiniHelper, TreeFolder } from "@/hooks/workspace/tree.miniHelper";
import { WorkspaceFolderItem } from "@/types/workspace-v2.types";
import { constants } from "@/utils/constants";
import { useOrchestratorContextMenuHelper } from "@/shared/contexts/helpers/useOrchestratorContextMenu.helper";

export function FolderNode({ node, style, dragHandle, treeData }: { node: NodeApi<TreeFolder>; style: React.CSSProperties; dragHandle?: any; treeData: TreeFolder[] }) {
    const { selectedFolderIds, setSelectedFolderIds, lastSelectedFolderId, setLastSelectedFolderId, currentTree } = useWorkspaceStore();
    const { showContextMenu } = useOrchestratorContextMenuHelper();
    const { isFolderSelected } = useTreeSelectionHelper();

    // Safe cast: WorkspaceTree already filters to only render FolderNode for folders
    const folderItem = node.data.data as unknown as WorkspaceFolderItem;

    // Extract data from V2 structure
    const entityId = folderItem.itemId;
    const folderName = folderItem.data.name;
    const folderColor = folderItem.data.color;
    const hasChildren = node.data.children && node.data.children.length > 0;
    const isSelected = isFolderSelected(entityId);
    const isWorkspaceRoot = entityId < 0; // Workspace root node has negative ID

    // Check if this node is being dragged
    const isDragging = node.state.isDragging;

    // Check if this node is a valid drop target (being dragged over)
    const isDropTarget = node.state.willReceiveDrop;

    const handleMainClick = (e: React.MouseEvent) => {
        e.stopPropagation();
        e.preventDefault(); // Prevent tree activation that causes scrolling

        // Don't allow selection of workspace root node
        if (isWorkspaceRoot) {
            // Only allow expand/collapse for workspace root
            if (hasChildren) {
                node.toggle();
            }
            return;
        }

        // Focus the tree container for keyboard navigation
        const treeContainer = document.querySelector("[data-workspace-tree]") as HTMLElement;
        treeContainer?.focus();

        if (e.ctrlKey || e.metaKey) {
            // Ctrl+Click: Toggle selection (like VS Code)
            if (isSelected) {
                setSelectedFolderIds((prev: number[]) => prev.filter((id) => id !== entityId));
                // Sync with react-arborist
                node.deselect();
            } else {
                setSelectedFolderIds((prev: number[]) => [...prev, entityId]);
                // Sync with react-arborist (multi-select mode)
                node.selectMulti();
            }
            setLastSelectedFolderId(entityId);
        } else if (e.shiftKey && lastSelectedFolderId) {
            // Shift+Click: Range selection (like VS Code)
            const allVisibleFolders = treeMiniHelper.getAllVisibleFolderIds(treeData);
            const lastIndex = allVisibleFolders.indexOf(lastSelectedFolderId);
            const currentIndex = allVisibleFolders.indexOf(entityId);

            if (lastIndex !== -1 && currentIndex !== -1) {
                const startIndex = Math.min(lastIndex, currentIndex);
                const endIndex = Math.max(lastIndex, currentIndex);
                const rangeSelection = allVisibleFolders.slice(startIndex, endIndex + 1);
                setSelectedFolderIds(rangeSelection);
                // Sync with react-arborist (select range ending at this node)
                node.selectMulti();
            } else {
                setSelectedFolderIds([entityId]);
                node.select();
            }
            setLastSelectedFolderId(entityId);
        } else {
            // Regular click: Single selection + toggle expand/collapse if has children (like VS Code)
            setSelectedFolderIds([entityId]);
            setLastSelectedFolderId(entityId);
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

        // Don't show context menu for workspace root
        if (isWorkspaceRoot) {
            return;
        }

        const _currentFolder = currentTree?.items.find((f: any) => f.itemId === entityId);

        // Open folder-specific context menu with folder data (V2 structure)
        const contextData = { ...folderItem, parentId: _currentFolder?.parentId ?? null };
        showContextMenu(e, constants.workspace.itemTypes.folder, contextData);
    };

    return (
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
            style={{ ...style, paddingLeft: `${node.level * 8}px` }}
            onClick={handleMainClick}
            onContextMenu={handleRightClick}
            className={`
                flex items-center h-full w-full py-1 pr-2 cursor-pointer rounded 
                transition-all duration-150 ease-in-out
                ${isDragging ? "opacity-40" : "opacity-100"}
                ${isSelected ? "bg-editor-hover text-white" : "bg-transparent hover:bg-editor-hover"}
                ${isWorkspaceRoot ? "font-semibold" : ""}
                ${isDragging && isSelected ? "bg-primary/30 outline outline-1 outline-primary/60 -outline-offset-1" : ""}
                ${isDropTarget ? "bg-editor-hover outline outline-1 outline-primary/50 -outline-offset-1" : ""}
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
                {hasChildren ? node.isOpen ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" /> : null}
            </button>

            {/* Folder Icon */}
            <div className="mr-2 flex items-center">
                {/* Workspace root node */}
                {isWorkspaceRoot ? (
                    <Layers className="w-4 h-4" style={{ color: folderColor || "#75beff" }} />
                ) : hasChildren ? (
                    node.isOpen ? (
                        <FolderOpen className="w-4 h-4 text-yellow-500" />
                    ) : (
                        <FolderIcon className="w-4 h-4 text-yellow-500" />
                    )
                ) : (
                    <TagIcon className="w-4 h-4" style={{ color: folderColor || "#75beff" }} />
                )}
            </div>

            {/* Folder Info */}
            <div className="flex-1 min-w-0 flex items-center gap-2">
                <div className="w-full min-w-0 flex items-center gap-2">
                    <span
                        className={`
                            text-sm truncate
                            ${hasChildren ? "font-semibold" : "font-normal"}
                            ${isWorkspaceRoot ? "uppercase tracking-wide" : ""}
                            text-editor-fg
                        `}
                    >
                        {folderName}
                    </span>
                </div>
            </div>
        </div>
    );
}
