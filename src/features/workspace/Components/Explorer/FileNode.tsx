import React from "react";
import { NodeApi } from "react-arborist";
import { File, FileImage, FileVideo, FileArchive, FileCode } from "lucide-react";
import { useWorkspaceStore } from "@/store/index";
import { useGridControlStore } from "@/store/grid/useGridControl.store";
import { useMovingTreeStore } from "../../store/MovingTree.store";
import { useTreeHelper2 } from "../../hooks/useTreeHelper2";
import { treeMiniHelper, TreeFolder } from "../../hooks/tree.miniHelper";
import { useTreeStatusHelper } from "../../hooks/useTreeStatusHelper";
import { WorkspaceFileItem } from "@/types/workspace-v2.types";
import { constants } from "@/utils/constants";
import { useOrchestratorContextMenuHelper } from "@/shared/contexts/helpers/useOrchestratorContextMenu.helper";
import { StatusDot } from "./StatusDot";
import { HighlightText } from "./HighlightText";

function getFileIcon(extension?: string) {
    if (!extension) return File;

    const ext = extension.toLowerCase();

    // Images
    if (["jpg", "jpeg", "png", "gif", "svg", "webp", "bmp"].includes(ext)) {
        return FileImage;
    }

    // Videos
    if (["mp4", "avi", "mov", "wmv", "flv", "webm"].includes(ext)) {
        return FileVideo;
    }

    // Archives
    if (["zip", "rar", "7z", "tar", "gz"].includes(ext)) {
        return FileArchive;
    }

    // Code
    if (["js", "ts", "jsx", "tsx", "py", "java", "cs", "cpp", "c", "html", "css", "json", "xml"].includes(ext)) {
        return FileCode;
    }

    return File;
}

interface FileNodeProps {
    node: NodeApi<TreeFolder>;
    style: React.CSSProperties;
    dragHandle?: any;
    treeData: TreeFolder[];
    treeType?: "workspaceTree" | "targetTree";
}

export function FileNode({ node, style, dragHandle, treeData, treeType = "workspaceTree" }: FileNodeProps) {
    const { selectedItemIds, setSelectedItemIds, lastSelectedItemId, setLastSelectedItemId, currentWorkspace, _treeRef,setScrollToItem } = useWorkspaceStore();
    const { searchQuery } = useGridControlStore();
    const { highlightedDuplicateIds, targetWorkspace } = useMovingTreeStore();
    const { showContextMenu } = useOrchestratorContextMenuHelper();
    const { isFolderSelected, getVisibleNodeIds } = useTreeHelper2();
    const _TREESTATUS = useTreeStatusHelper();

    // Safe cast: WorkspaceTree already filters to only render FileNode for files
    const fileItem = node.data.data as unknown as WorkspaceFileItem;
    const workspaceItemId = fileItem.id; // workspace_items.id (unique)
    const entityId = fileItem.entityId; // files.id (for API calls, context menu)
    const isSelected = isFolderSelected(workspaceItemId); // Use workspace_items.id for selection
    const FileIcon = getFileIcon(fileItem.data.extension);

    // Check if this node is being dragged
    const isDragging = node.state.isDragging;

    // Check if this node is a valid drop target (being dragged over)
    const isDropTarget = node.state.willReceiveDrop;

    // Check status and deleted state (including inherited from parent)
    const _ITEMSTATUS = _TREESTATUS.getItemStatus(fileItem);
    const isInactive = fileItem.data.statusCode === "inactive";

    // Determine dot status
    const isUnsaved = workspaceItemId < 0;
    const compositeKey = `${fileItem.entityType}-${entityId}`;
    // Only show duplicate dot in targetTree (not in workspaceTree)
    const isDuplicate = highlightedDuplicateIds.has(compositeKey);

    const handleMainClick = (e: React.MouseEvent) => {
        e.stopPropagation();
        e.preventDefault();

        // Focus the tree container for keyboard navigation
        const treeContainer = document.querySelector("[data-workspace-tree]") as HTMLElement;
        treeContainer?.focus();

        // Disable selection in targetTree
        if (treeType === "targetTree") return;

        if (e.ctrlKey || e.metaKey) {
            // Ctrl+Click: Toggle selection (like VS Code)
            if (isSelected) {
                setSelectedItemIds((prev: number[]) => prev.filter((id) => id !== workspaceItemId));
                node.deselect();
            } else {
                setSelectedItemIds((prev: number[]) => [...prev, workspaceItemId]);
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
            // Regular click: Single selection
            setSelectedItemIds([workspaceItemId]);
            setLastSelectedItemId(workspaceItemId);
            node.select();

            // TODO: Open file preview or download
        }
    };

    const handleRightClick = (e: React.MouseEvent) => {
        e.stopPropagation();
        e.preventDefault();

        // Disable context menu in targetTree
        if (treeType === "targetTree") return;

        const _currentItem = currentWorkspace?.flatData.find((i: any) => i.entityId === entityId);

        // Open file-specific context menu (V2 structure)
        showContextMenu(e, constants.workspace.itemTypes.file, { ...fileItem, parentId: _currentItem?.parentId ?? null });
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
                    ${isDragging && isSelected ? "bg-primary/30 outline outline-1 outline-primary/60 -outline-offset-1 rounded" : ""}
                    ${isDropTarget ? "bg-editor-hover outline outline-1 outline-primary/50 -outline-offset-1 rounded" : ""}
                `}
            >
                {/* Spacer for alignment with folder chevrons */}
                <div className="w-4" />

                {/* File Icon */}
                <div className="mr-2 flex items-center">
                    <FileIcon className={`w-4 h-4 ${_ITEMSTATUS.hasDeletedAncestor || _ITEMSTATUS.isDirectlyDeleted ? "text-gray-500" : "text-gray-400"}`} />
                </div>

                {/* File Info */}
                <div className="flex-1 min-w-0 flex items-center gap-2">
                    <HighlightText
                        text={fileItem.data.name}
                        highlight={treeType === "workspaceTree" ? searchQuery : ""}
                        className={`text-sm truncate ${_ITEMSTATUS.hasDeletedAncestor || _ITEMSTATUS.isDirectlyDeleted ? "text-gray-500" : "text-editor-fg"} ${_ITEMSTATUS.isDirectlyDeleted ? "line-through" : ""}`}
                    />
                    {fileItem.data.fileSizeFormatted && <span className="text-xs text-gray-500">{fileItem.data.fileSizeFormatted}</span>}
                    <StatusDot
                        isUnsaved={isUnsaved}
                        isDuplicate={isDuplicate}
                        itemType="File"
                        itemName={fileItem.data.name}
                        targetWorkspaceName={targetWorkspace?.name}
                    />
                </div>
            </div>
        </div>
    );
}
