import React from "react";
import { NodeApi } from "react-arborist";
import { File, FileImage, FileVideo, FileArchive, FileCode } from "lucide-react";
import { useWorkspaceStore } from "@/store/index";
import { useTreeSelectionHelper } from "@/hooks/workspace/useTreeSelectionHelper";
import { treeMiniHelper, TreeFolder } from "@/hooks/workspace/tree.miniHelper";
import { WorkspaceFileItem } from "@/types/workspace-v2.types";
import { constants } from "@/utils/constants";
import { useOrchestratorContextMenuHelper } from "@/shared/contexts/helpers/useOrchestratorContextMenu.helper";

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

export function FileNode({ node, style, dragHandle }: { node: NodeApi<TreeFolder>; style: React.CSSProperties; dragHandle?: any }) {
    const { selectedFolderIds, setSelectedFolderIds, setLastSelectedFolderId, currentTree } = useWorkspaceStore();
    const { showContextMenu } = useOrchestratorContextMenuHelper();
    const { isFolderSelected } = useTreeSelectionHelper();

    // Safe cast: WorkspaceTree already filters to only render FileNode for files
    const fileItem = node.data.data as unknown as WorkspaceFileItem;
    const entityId = fileItem.entityId;
    const isSelected = isFolderSelected(entityId);
    const FileIcon = getFileIcon(fileItem.data.extension);

    // Check status and deleted state
    const isDeleted = fileItem.deletedAt !== null && fileItem.deletedAt !== undefined;
    const isInactive = fileItem.data.statusCode === "inactive";

    const handleMainClick = (e: React.MouseEvent) => {
        e.stopPropagation();
        e.preventDefault();

        // Focus the tree container for keyboard navigation
        const treeContainer = document.querySelector("[data-workspace-tree]") as HTMLElement;
        treeContainer?.focus();

        if (e.ctrlKey || e.metaKey) {
            // Ctrl+Click: Toggle selection
            if (isSelected) {
                setSelectedFolderIds((prev: number[]) => prev.filter((id) => id !== entityId));
                node.deselect();
            } else {
                setSelectedFolderIds((prev: number[]) => [...prev, entityId]);
                node.selectMulti();
            }
            setLastSelectedFolderId(entityId);
        } else {
            // Regular click: Single selection
            setSelectedFolderIds([entityId]);
            setLastSelectedFolderId(entityId);
            node.select();

            // TODO: Open file preview or download
        }
    };

    const handleRightClick = (e: React.MouseEvent) => {
        e.stopPropagation();
        e.preventDefault();

        const _currentItem = currentTree?.flatData.find((i: any) => i.entityId === entityId);

        // Open file-specific context menu (V2 structure)
        showContextMenu(e, constants.workspace.itemTypes.file, { ...fileItem, parentId: _currentItem?.parentId ?? null });
    };

    return (
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
            style={{ ...style, paddingLeft: `${node.level * 8}px` }}
            onClick={handleMainClick}
            onContextMenu={handleRightClick}
            className={`
                flex items-center h-full w-full py-1 pr-2 cursor-pointer rounded
                transition-all duration-150 ease-in-out
                ${node.state.isDragging ? "opacity-40" : isDeleted ? "opacity-60" : isInactive ? "opacity-70" : "opacity-100"}
                ${isSelected ? "bg-editor-hover text-white" : "bg-transparent hover:bg-editor-hover"}
            `}
        >
            {/* Spacer for alignment with folder chevrons */}
            <div className="w-5" />

            {/* File Icon */}
            <div className="mr-2 flex items-center">
                <FileIcon className="w-4 h-4 text-gray-400" />
            </div>

            {/* File Info */}
            <div className="flex-1 min-w-0 flex items-center gap-2">
                <span className={`text-sm truncate text-editor-fg ${isDeleted ? "line-through" : ""}`}>
                    {fileItem.data.name}
                </span>
                {fileItem.data.fileSizeFormatted && <span className="text-xs text-gray-500">{fileItem.data.fileSizeFormatted}</span>}
            </div>
        </div>
    );
}
