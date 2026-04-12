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
import { Loader2, ArrowRightLeft, CheckCircle2 } from "lucide-react";
import { GenericAutoComplete, type IAutoCompleteOptions } from "@/shared/components";
import { useMovingTreeStore } from "../../store/MovingTree.store";
import { useWorkspaceStore } from "../../store/Workspace.store";
import { useDragDropManager, useDrop } from "react-dnd";
import { useMovingTreeHelper } from "../../hooks/useMovingTree.helper";
import { MovingTree } from "./MovingTree";
import {CalculateMovingTreeContainerHeight} from "../../HeadlessComponents/CalculateMovingTreeContainerHeight";

export function MovingTab() {
    const { targetWorkspaceId, setTargetWorkspaceId, isLoadingTargetTree, setHighlightedDuplicateIds, targetWorkspace, treeContainerRef, containerHeight } = useMovingTreeStore();
    const { allWorkspaces, currentWorkspace, selectedWorkspaceId, selectedItemIds } = useWorkspaceStore();
    const manager = useDragDropManager();
    const { handleWorkspaceChange, loadTargetWorkspaceTree, checkDraggingItemsAreDuplicate, checkAndHighlightDuplicates } = useMovingTreeHelper();

    // Ensure targetWorkspaceId is not the same as selectedWorkspaceId
    useEffect(() => {
        if (selectedWorkspaceId === targetWorkspaceId) {
            setTargetWorkspaceId(allWorkspaces.length > 0 ? (allWorkspaces.find((w) => w.id !== selectedWorkspaceId)?.id as number) : null);
            setHighlightedDuplicateIds(new Set()); // Clear highlights when switching workspace
        }
    }, [selectedWorkspaceId]);

    // Load target workspace tree when workspace is selected
    useEffect(() => {
        loadTargetWorkspaceTree();
    }, [targetWorkspaceId]);

    // Auto-detect and highlight duplicates when targetWorkspace loads or selectedItemIds change
    useEffect(() => {
        checkAndHighlightDuplicates();
    }, [targetWorkspaceId, selectedWorkspaceId, targetWorkspace, currentWorkspace]);

    // Filter workspaces (exclude current workspace)
    const availableWorkspaces: IAutoCompleteOptions[] = allWorkspaces
        .filter((ws) => ws.id !== currentWorkspace?.id)
        .map((ws) => ({
            id: ws.id.toString(),
            label: ws.name,
            desc: ws.description || ws.name,
            active: true,
        }));

    // useDrop hook for visual feedback only (actual drop handled by Tree's onMove)
    const [{ isOver, canDrop }, drop] = useDrop({
        accept: ["NODE"],
        collect: (monitor) => ({
            isOver: monitor.isOver({ shallow: true }),
            canDrop: monitor.canDrop(),
        }),
    });

    return (
        <div className="h-full flex overflow-hidden" ref={treeContainerRef} data-workspace-tree="true">
            <CalculateMovingTreeContainerHeight />
            {/* Left Panel - Workspace Selector & Status */}
            <div className="w-1/2 flex flex-col border-r border-editor-border">
                <div className="px-4 py-3">
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

                <div className="flex-1 flex flex-col justify-start px-4">
                    {targetWorkspaceId && !isLoadingTargetTree ? (
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
            <div ref={drop} className={`w-5/6 flex flex-col overflow-hidden relative`}>
                {isLoadingTargetTree ? (
                    <div className="h-full flex items-center justify-center">
                        <Loader2 className="w-6 h-6 text-primary animate-spin" />
                    </div>
                ) : targetWorkspaceId && targetWorkspace ? (
                    <MovingTree />
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
