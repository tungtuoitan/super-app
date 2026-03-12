/**
 * MovingTree - Tree component for MovingTab
 * Displays target workspace tree structure for drag & drop operations
 */

import React, { useEffect, useMemo } from "react";
import { Tree } from "react-arborist";
import { useDragDropManager } from "react-dnd";
import { KtreeMiniHelper, KTreeNode as KTreeFolder } from "../../hooks/Ktree.miniHelper";
import { KFolderNode } from "../KExplorer/KFolderNode";
import { KRootFolderNode } from "../KExplorer/KRootFolderNode";
import { isFolder as isFolderV2, WorkspaceItemV2 } from "@/types/workspace-v2.types";
import { constants } from "@/utils/constants";
import { CalculateMovingTreeDropZoneHeight } from "@/HeadlessComponents/workspaceTree/CalculateMovingTreeDropZoneHeight";
import {useKMovingTreeStore} from "../../store/KMovingTree.store";
import {useKMovingTreeHelper} from "../../hooks/useKMovingTree.helper";

export function KMovingTree() {
    const { targetWorkspace, containerHeight, treeContainerRef, highlightedDuplicateIds, treeRenderKey, dropZoneHeight, setDropZoneHeight, _treeRef } = useKMovingTreeStore();
    const { dropToMovingTree } = useKMovingTreeHelper();
    const manager = useDragDropManager();

    // Transform target workspace data to tree format
    const targetTreeData = useMemo(() => {
        if (!targetWorkspace) return [];
        const baseTree = KtreeMiniHelper.transformToTreeData(targetWorkspace, "");

        // Add invisible drop zone at the end to catch drops to root level
        if (baseTree.length > 0 && targetWorkspace?.id) {
            const dropZoneNode: KTreeFolder = {
                id: `drop-zone-root-${targetWorkspace.id}`,
                name: "",
                data: {
                    // V2 structure - WorkspaceItemV2
                    id: constants.workspace.dropZone.workspaceItemId, // workspace_items.id
                    workspaceId: targetWorkspace.id,
                    parentId: null,
                    entityType: 2 as const,
                    entityId: constants.workspace.dropZone.entityId, // folders.id (entity ID)
                    createdAt: new Date().toISOString(),
                    updatedAt: undefined,
                    deletedAt: null,
                    level: 0,
                    position: 0,
                    accessType: "owner" as const,
                    isOriginal: true,
                    data: {
                        // FolderData - entity data
                        id: constants.workspace.dropZone.entityId, // folders.id (entity ID)
                        userId: targetWorkspace.userId,
                        name: "",
                        description: undefined,
                        color: undefined,
                        icon: undefined,
                        createdAt: new Date().toISOString(),
                        updatedAt: undefined,
                        deletedAt: null,
                        slug: undefined,
                    },
                    isExpanded: false,
                    isSelected: false,
                } as any,
                children: [],
            };
            return [...baseTree, dropZoneNode];
        }

        return baseTree;
    }, [targetWorkspace]);

    return (
        <div ref={treeContainerRef} className="h-full pl-4 py-2">
            <CalculateMovingTreeDropZoneHeight
                treeData={targetTreeData as any}
                containerHeight={containerHeight}
                treeRef={_treeRef as any}
                setDropZoneHeight={setDropZoneHeight}
            />
            <Tree
                ref={_treeRef as any}
                key={treeRenderKey}
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
                renderDragPreview={() => null}
                onMove={async (args) => {
                    // Call API directly here (Tree consumes the drop event, so useDrop won't fire)
                    await dropToMovingTree(args);
                }}
            >
                {({ node, style, dragHandle }) => {
                    const item = node.data.data as any;
                    const isDuplicate = item && highlightedDuplicateIds.has(item.entityId);

                    // Check if this is the drop zone
                    const isDropZone = item?.entityId === constants.workspace.dropZone.entityId;

                    // Render drop zone differently
                    if (isDropZone) {
                        return ( 
                            <div
                                style={{
                                    ...style,
                                    height: `${dropZoneHeight}px`,
                                }}
                            >
                                <div
                                    className="drop-zone-root"
                                    style={{
                                        height: `${dropZoneHeight}px`,
                                        width: "100%",
                                        display: "flex",
                                        alignItems: "flex-start",
                                        paddingTop: "2px",
                                        boxSizing: "border-box",
                                    }}
                                    data-drop-zone="root"
                                    onDragOver={(e) => {
                                        e.preventDefault();
                                        e.currentTarget.setAttribute("data-dragging-over", "true");
                                    }}
                                    onDragLeave={(e) => {
                                        e.currentTarget.removeAttribute("data-dragging-over");
                                    }}
                                    onDrop={(e) => {
                                        e.currentTarget.removeAttribute("data-dragging-over");
                                    }}
                                ></div>
                            </div>
                        );
                    }

                    // Render node content based on type
                    const nodeContent = (() => {
                        if (isFolderV2(node.data.data as unknown as WorkspaceItemV2)) {
                            if (node.level === 0) {
                                return <KRootFolderNode node={node} treeData={targetTreeData} style={style} dragHandle={dragHandle} treeType="targetTree" />;
                            }
                            return <KFolderNode node={node} style={style} dragHandle={dragHandle} treeData={targetTreeData} treeType="targetTree" />;
                        }
                        return null;
                    })();

                    // Highlight duplicates with yellow background (temporarily for 10s)
                    // if (isDuplicate) {
                    //     return (
                    //         <div className="relative" title="⚠️ Item already exists in target workspace">
                    //             <div className="absolute inset-0 bg-yellow-100 dark:bg-yellow-900/30 opacity-50 pointer-events-none rounded" />
                    //             {nodeContent}
                    //         </div>
                    //     );
                    // }

                    return nodeContent;
                }}
            </Tree>
        </div>
    );
}
