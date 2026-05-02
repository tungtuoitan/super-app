/**
 * MovingTree - Tree component for MovingTab
 * Displays target workspace tree structure for drag & drop operations
 */

import React, { useMemo } from "react";
import { workspaceConstants } from "@/features/workspace/workspace.constants";
import { Tree } from "react-arborist";
import { useDragDropManager } from "react-dnd";
import { KNode } from "../KExplorer/KNode";
import { kconstants } from "../../utils/K.Constants";
import { useKMovingTreeStore } from "../../store/KMovingTree.store";
import { useKMovingTreeHelper } from "../../hooks/kTree/useKMovingTree.helper";
import {KTreeFolder, KtreeMiniHelper} from "../../hooks/kTree/Ktree.miniHelper";

export function KMovingTree() {
    const { targetWorkspace, containerHeight, treeContainerRef, highlightedDuplicateIds, treeRenderKey, dropZoneHeight, _treeRef } = useKMovingTreeStore();
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
                    id: workspaceConstants.dropZone.workspaceItemId,
                    knowledgeId: targetWorkspace.id,
                    parentId: null,
                    name: "",
                    description: undefined,
                    color: undefined,
                    icon: undefined,
                    pathIds: "/",
                    pathDepth: 0,
                    createdAt: new Date().toISOString(),
                    updatedAt: undefined,
                    deletedAt: null,
                    isExpanded: false,
                    isSelected: false,
                },
                children: [],
            };
            return [...baseTree, dropZoneNode];
        }

        return baseTree;
    }, [targetWorkspace]);

    return (
        <div ref={treeContainerRef} className="h-full pl-4 py-2">
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
                    await dropToMovingTree(args);
                }}
            >
                {({ node, style, dragHandle }) => {
                    const item = node.data.data;

                    // Drop zone node (invisible spacer at bottom)
                    const isDropZone = item?.id === workspaceConstants.dropZone.workspaceItemId;
                    if (isDropZone) {
                        return (
                            <div
                                style={{ ...style, height: `${dropZoneHeight}px` }}
                                data-drop-zone="root"
                            />
                        );
                    }

                    // All K items are nodes — render root differently from children
                    // if (node.level === 0) {
                    //     return <KRootNode node={node} treeData={targetTreeData} style={style} dragHandle={dragHandle} treeType="targetTree" />;
                    // }
                    return <KNode node={node} style={style} dragHandle={dragHandle} treeData={targetTreeData} treeType="targetTree" />;
                }}
            </Tree>
        </div>
    );
}



