/**
 * MovingTab - Tab for moving workspace items to another workspace via drag & drop
 *
 * Features:
 * - Select target workspace from dropdown
 * - View target workspace tree structure
 * - Drag items from WorkspaceTree and drop into this tree
 * - Automatically calls MoveCross API when items are dropped
 */

import React, { useEffect, useMemo } from "react";
import { Loader2, ArrowRightLeft, AlertTriangle, CheckCircle2 } from "lucide-react";
import { GenericAutoComplete, type IAutoCompleteOptions } from "@/shared/components";
import { useMovingTreeStore } from "@/store/workspace/MovingTree.store";
import { useWorkspaceStore } from "@/store/workspace/Workspace.store";
import { useAuthStore } from "@/store/auth/Auth.store";
import { Tree } from "react-arborist";
import { useDragDropManager, useDrop } from "react-dnd";
import { treeMiniHelper, TreeFolder } from "@/hooks/workspace/tree.miniHelper";
import { FolderNode } from "../Workspace/Explorer/FolderNode";
import { RootFolderNode } from "../Workspace/Explorer/RootFolderNode";
import { NoteNode } from "../Workspace/Explorer/NoteNode";
import { FileNode } from "../Workspace/Explorer/FileNode";
import { isFolder as isFolderV2, isNote as isNoteV2, isFile as isFileV2, WorkspaceItemV2 } from "@/types/workspace-v2.types";
import { workspaceService } from "@/services/workspace.service";
import { useSnackbar } from "notistack";
import { useWorkspaceLoader } from "@/hooks/workspace/useWorkspace.loader";
import { useMovingTreeHelper } from "@/hooks/workspace/useMovingTree.helper";

export function MovingTab() {
    const { targetWorkspaceId, targetFolderId, highlightedDuplicateIds, isLoadingTargetTree, targetWorkspace, treeContainerRef, containerHeight } = useMovingTreeStore();
    const { allWorkspaces, currentWorkspace } = useWorkspaceStore();
    const { $user } = useAuthStore();
    const manager = useDragDropManager();
    const { enqueueSnackbar } = useSnackbar();
    const { loadTree } = useWorkspaceLoader();
    const { getAvailableWorkspaces, handleWorkspaceChange, loadTargetWorkspaceTree, dropToMovingTree, initializeContainerHeightTracking } = useMovingTreeHelper();

    // Load target workspace tree when workspace is selected
    useEffect(() => {
        loadTargetWorkspaceTree();
    }, [targetWorkspaceId]);

    // Initialize container height tracking
    useEffect(() => {
        const cleanup = initializeContainerHeightTracking();
        return cleanup;
    }, []);

    // Filter workspaces (exclude current workspace)
    const availableWorkspaces: IAutoCompleteOptions[] = useMemo(() => {
        return getAvailableWorkspaces();
    }, [allWorkspaces, currentWorkspace]);

    // Transform target workspace data to tree format
    const targetTreeData = useMemo(() => {
        if (!targetWorkspace) return [];
        const tree = treeMiniHelper.transformToTreeData(targetWorkspace, "");
        return tree;
    }, [targetWorkspace]);

    // useDrop hook for visual feedback only (actual drop handled by Tree's onMove)
    const [{ isOver, canDrop }, drop] = useDrop({
        accept: ["NODE"],
        collect: (monitor) => ({
            isOver: monitor.isOver({ shallow: true }),
            canDrop: monitor.canDrop(),
        }),
    });

    const hasDuplicates = duplicateEntityIds.size > 0;

    return (
        <div className="h-full flex overflow-hidden">
            {/* Left Panel - Workspace Selector & Status */}
            <div className="w-1/2 flex flex-col border-r border-editor-border">
                {/* Workspace Selector */}
                <div className="px-4 py-3">
                    {/* <label className="text-xs font-medium mb-1.5 block text-editor-fg">Target Workspace</label> */}
                    <GenericAutoComplete
                        allOptions={availableWorkspaces}
                        value={availableWorkspaces.find((option) => option.id === targetWorkspaceId?.toString()) || null}
                        onChange={handleWorkspaceChange}
                        inputProps={{
                            name: "targetWorkspace",
                            label: "",
                            required: false,
                        }}
                        disabled={availableWorkspaces.length === 0}
                        size="small"
                    />
                    <p className="text-xs text-muted-foreground mt-1.5">Drag items from workspace tree and drop into folders on the right</p>
                </div>

                {/* Status Messages */}
                <div className="flex-1 flex flex-col justify-start px-4">
                    {hasDuplicates ? (
                        <div className="p-4 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900 rounded-lg flex items-start gap-3">
                            <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                            <div className="text-sm text-red-800 dark:text-red-400">
                                <div className="font-medium">{duplicateEntityIds.size} duplicate(s) found</div>
                                <div className="mt-1 opacity-90">Some items already exist in the target workspace</div>
                            </div>
                        </div>
                    ) : targetWorkspaceId && !isLoadingTargetTree ? (
                        <div className="p-4 bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900 rounded-lg flex items-start gap-3">
                            <CheckCircle2 className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                            <div className="text-sm text-blue-800 dark:text-blue-400">
                                <div className="font-medium">Ready to move items</div>
                                <div className="mt-1 opacity-80">Drag items from workspace tree and drop into folders or root on the right</div>
                            </div>
                        </div>
                    ) : null}
                </div>
            </div>

            {/* Right Panel - Tree View */}
            <div ref={drop} className={`w-5/6 flex flex-col overflow-hidden relative pb-4`}>
                {isLoadingTargetTree ? (
                    <div className="h-full flex items-center justify-center">
                        <Loader2 className="w-6 h-6 text-primary animate-spin" />
                    </div>
                ) : targetWorkspaceId && targetTreeData.length > 0 ? (
                    <div ref={treeContainerRef} className="h-full pl-4 py-2">
                        <Tree
                            data={targetTreeData}
                            openByDefault={true}
                            width="100%"
                            height={containerHeight}
                            indent={24}
                            rowHeight={32}
                            overscanCount={10}
                            dndManager={manager}
                            disableDrag={true}
                            disableDrop={false}
                            disableMultiSelection={true}
                            onMove={async (args) => {
                                // For cross-tree drops, args.dragIds is empty
                                // Get the dragged item from DnD monitor instead
                                const monitor = manager.getMonitor();
                                const dragItem = monitor.getItem();

                                if (!dragItem) {
                                    console.warn("⚠️ No drag item found in monitor");
                                    return;
                                }

                                // Extract drop target folder id from args.parentId
                                const droppedFolderId = args.parentId ? parseInt(args.parentId, 10) : null;

                                // Call API directly here (Tree consumes the drop event, so useDrop won't fire)
                                await dropToMovingTree(dragItem, droppedFolderId);
                            }}
                        >
                            {({ node, style, dragHandle }) => {
                                const item = node.data.data as any;

                                if (isFolderV2(node.data.data as unknown as WorkspaceItemV2)) {
                                    if (node.level === 0) {
                                        return <RootFolderNode node={node} treeData={targetTreeData} style={style} />;
                                    }
                                    return <FolderNode node={node} style={style} dragHandle={dragHandle} treeData={targetTreeData} treeType="targetTree" />;
                                } else if (isNoteV2(node.data.data as unknown as WorkspaceItemV2)) {
                                    return <NoteNode node={node} style={style} dragHandle={dragHandle} treeData={targetTreeData} treeType="targetTree" />;
                                } else if (isFileV2(node.data.data as unknown as WorkspaceItemV2)) {
                                    return <FileNode node={node} style={style} dragHandle={dragHandle} treeData={targetTreeData} treeType="targetTree" />;
                                }
                                return null;
                            }}
                        </Tree>
                    </div>
                ) : targetWorkspaceId ? (
                    <div className="h-full flex items-center justify-center text-muted-foreground">
                        <p className="text-sm">Workspace is empty</p>
                    </div>
                ) : (
                    <div className="h-full flex items-center justify-center text-muted-foreground">
                        <div className="text-center">
                            <ArrowRightLeft className="w-12 h-12 mx-auto mb-3 opacity-30" />
                            <p className="text-sm">Select a target workspace</p>
                            <p className="text-xs mt-1 opacity-70">Then drag items here to move them</p>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
