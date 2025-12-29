import React from "react";
import { NodeApi } from "react-arborist";
import { ChevronDown, ChevronRight, Layers, Plus, RefreshCw, ChevronsUp } from "lucide-react";
import { useWorkspaceStore } from "@/store/index";
import { useTreeHelper } from "@/hooks/workspace/useTreeHelper";
import { useWorkspaceLoader } from "@/hooks/workspace/useWorkspace.loader";
import { treeMiniHelper, TreeFolder } from "@/hooks/workspace/tree.miniHelper";
import { FolderItem } from "@/types/workspace.types";
import { useOrchestratorContextMenuHelper } from "@/shared/contexts/helpers/useOrchestratorContextMenu.helper";
import { constants } from "@/utils/constants";

interface RootFolderNodeProps {
    node: NodeApi<TreeFolder>;
    style: React.CSSProperties;
    treeData: TreeFolder[];
}

/**
 * Root Folder Node - Special node for workspace root with action buttons
 * Shows workspace name and provides quick actions: Add Folder, Refresh, Collapse All
 */
export function RootFolderNode({ node, style, treeData }: RootFolderNodeProps) {
    const { currentWorkspace } = useWorkspaceStore();
    const { addNewFolder } = useTreeHelper();
    const { _treeRef } = useWorkspaceStore();
    const { loadTree } = useWorkspaceLoader();
    const { showContextMenu } = useOrchestratorContextMenuHelper();

    const folderItem = node.data.data as FolderItem;
    const hasChildren = node.data.children && node.data.children.length > 0;

    const handleRightClick = (e: React.MouseEvent) => {
        e.stopPropagation();
        e.preventDefault();
        
        // Show root workspace context menu with Add Folder/Note/File options
        showContextMenu(e, constants.workspace.itemTypes.folder, {
            ...node.data.data,
            parentId: null,
        });
    };

    return (
        <div
            style={{ ...style, paddingLeft: `${node.level * 8}px` }}
            onClick={(e) => {
                e.stopPropagation();
                e.preventDefault();
                if (hasChildren) {
                    node.toggle();
                }
            }}
            onContextMenu={handleRightClick}
            className="flex items-center h-full w-full py-1 pr-2 cursor-pointer rounded group hover:bg-editor-hover-light"
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

            {/* Workspace Icon */}
            <div className="mr-2 flex items-center">
                <Layers className="w-4 h-4" style={{ color: folderItem.color || "#75beff" }} />
            </div>

            {/* Workspace Name */}
            <div className="flex-1 min-w-0 flex items-center gap-2">
                <span className="text-sm font-semibold uppercase tracking-wide text-editor-fg truncate">{folderItem.name}</span>
            </div>

            {/* Action Buttons - Hidden by default, shown on hover */}
            <div className="flex gap-0.5 opacity-0 group-hover:opacity-70 hover:opacity-100 transition-opacity">
                <button
                    title="Add Folder"
                    onClick={(e) => {
                        e.stopPropagation();
                        addNewFolder(treeData);
                    }}
                    className="p-1 text-editor-fg hover:bg-editor-hover rounded"
                >
                    <Plus className="w-4 h-4" />
                </button>

                <button
                    title="Refresh"
                    onClick={(e) => {
                        e.stopPropagation();
                        loadTree();
                    }}
                    className="p-1 text-editor-fg hover:bg-editor-hover rounded"
                >
                    <RefreshCw className="w-4 h-4" />
                </button>

                <button
                    title="Collapse All"
                    onClick={(e) => {
                        e.stopPropagation();
                        _treeRef?.current?.closeAll();
                    }}
                    className="p-1 text-editor-fg hover:bg-editor-hover rounded"
                >
                    <ChevronsUp className="w-4 h-4" />
                </button>
            </div>
        </div>
    );
}
