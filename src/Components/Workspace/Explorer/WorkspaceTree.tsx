import React, { useEffect, useMemo } from "react";
import { Tree, NodeApi } from "react-arborist";
import { useDragDropManager } from "react-dnd";
import { Loader2 } from "lucide-react";
import { useWorkspaceStore } from "@/store/index";
import { useTreeSelectionHelper } from "@/hooks/workspace/useTreeSelectionHelper";
import { useTreeHelper } from "@/hooks/workspace/useTreeHelper";
import { useOrchestratorContextMenuHelper } from "@/shared/contexts/helpers/useOrchestratorContextMenu.helper";
import { CustomDragPreview } from "./CustomDragPreview";
import { FolderNode } from "./FolderNode";
import { RootFolderNode } from "./RootFolderNode";
import { NoteNode } from "./NoteNode";
import { FileNode } from "./FileNode";
import { getAllVisibleFolderIds, transformToTreeData, TreeFolder } from "@/hooks/workspace/tree.helper";
import { isFolder, isNote, isFile } from "@/types/workspace.types";
import { constants } from "@/utils/constants";

export function WorkspaceTree() {
    const { searchText, isDragging, currentTree, _treeRef } = useWorkspaceStore();
    const { handleSelectionChange, handleKeyDown } = useTreeSelectionHelper();
    const { handleMove } = useTreeHelper();
    const { showContextMenu } = useOrchestratorContextMenuHelper();
    const treeContainerRef = React.useRef<HTMLDivElement>(null);
    const manager = useDragDropManager();

    // Transform workspace data to tree format
    // Handles: extract folders → filter by search → wrap in workspace root → convert to TreeFolder
    const treeData = useMemo(() => {
        return transformToTreeData(currentTree, searchText);
    }, [currentTree, searchText]);

    // Get all visible folder IDs for keyboard navigation
    const allVisibleFolderIds = useMemo(() => {
        return getAllVisibleFolderIds(treeData);
    }, [treeData]);

    // Keyboard navigation (VS Code-like)
    useEffect(() => {
        const handleKeyDownWrapper = (e: KeyboardEvent) => {
            handleKeyDown(e, allVisibleFolderIds);
        };

        document.addEventListener("keydown", handleKeyDownWrapper);
        return () =>
            document.removeEventListener("keydown", (e: KeyboardEvent) => {
                handleKeyDown(e, allVisibleFolderIds);
            });
    }, [handleKeyDown, allVisibleFolderIds]);

    // Handle context menu on empty space (treat as root workspace)
    const handleContainerContextMenu = (e: React.MouseEvent) => {
        // Check if click is on an actual tree node
        const target = e.target as HTMLElement;
        const isTreeNode = target.closest('[role="treeitem"]') || target.closest('.tree-node');
        
        // If clicked on a tree node, let the node handle it
        if (isTreeNode) {
            return;
        }

        // Clicked on empty space - show root workspace context menu
        e.preventDefault();
        e.stopPropagation();

        // Get root workspace data
        if (treeData && treeData.length > 0) {
            const rootData = treeData[0].data; // Root is first item in treeData
            showContextMenu(e, constants.workspace.itemTypes.folder, { 
                ...rootData, 
                parentId: null
            });
        }
    };

    return (
        <>
            <div
                ref={treeContainerRef}
                data-workspace-tree
                tabIndex={0}
                onContextMenu={handleContainerContextMenu}
                className="h-full flex bred flex-col p-4 pt-0 relative focus:outline-none focus-within:bg-editor-hover/30 transition-colors overflow-auto"
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
                <Tree<TreeFolder>
                    ref={_treeRef}
                    data={treeData}
                    openByDefault={true}
                    width="100%"
                    height={600}
                    indent={24}
                    rowHeight={40}
                    overscanCount={8}
                    dndManager={manager}
                    onMove={async (args) => {
                        await handleMove(args, treeData);
                    }}
                    onSelect={(nodes: NodeApi<TreeFolder>[]) => handleSelectionChange(nodes)}
                    disableMultiSelection={false}
                    disableEdit={true}
                    renderDragPreview={(props) => <CustomDragPreview {...props} treeData={treeData} />}
                >
                    {({ node, style, dragHandle }) => {
                        const item = node.data.data;
                        const isWorkspaceRoot = item.id === -12345;

                        // Render different node types based on item type
                        return (
                            <div style={style}>
                                {isWorkspaceRoot ? (
                                    <RootFolderNode node={node} style={{ height: "100%" }} treeData={treeData} />
                                ) : isFolder(item) ? (
                                    <FolderNode node={node} style={{ height: "100%" }} dragHandle={dragHandle} treeData={treeData} />
                                ) : isNote(item) ? (
                                    <NoteNode node={node} style={{ height: "100%" }} dragHandle={dragHandle} />
                                ) : isFile(item) ? (
                                    <FileNode node={node} style={{ height: "100%" }} dragHandle={dragHandle} />
                                ) : null}
                            </div>
                        );
                    }}
                </Tree>
            </div>
        </>
    );
}
