import React, { useEffect, useMemo } from "react";
import { Tree, NodeApi } from "react-arborist";
import { useDragDropManager } from "react-dnd";
import { Loader2 } from "lucide-react";
import { useWorkspaceStore } from "@/store/index";
import { useTreeHelper2 } from "@/hooks/workspace/useTreeHelper2";
import { useTreeHelper } from "@/hooks/workspace/useTreeHelper";
import { useOrchestratorContextMenuHelper } from "@/shared/contexts/helpers/useOrchestratorContextMenu.helper";
import { CustomDragPreview } from "./CustomDragPreview";
import { FolderNode } from "./FolderNode";
import { RootFolderNode } from "./RootFolderNode";
import { NoteNode } from "./NoteNode";
import { FileNode } from "./FileNode";
import { treeMiniHelper, TreeFolder } from "@/hooks/workspace/tree.miniHelper";
import { isFolder as isFolderV2, isNote as isNoteV2, isFile as isFileV2 } from "@/types/workspace-v2.types";
import { constants } from "@/utils/constants";

export function WorkspaceTree() {
    const { searchText, isDragging, currentWorkspace, _treeRef } = useWorkspaceStore();
    const { handleSelectionChange, handleKeyDown } = useTreeHelper2();
    const { handleMove } = useTreeHelper();
    const { showContextMenu } = useOrchestratorContextMenuHelper();
    const treeContainerRef = React.useRef<HTMLDivElement>(null);
    const manager = useDragDropManager();
    const [containerHeight, setContainerHeight] = React.useState(800);

    // Track container height to make Tree component responsive
    useEffect(() => {
        const updateHeight = () => {
            if (treeContainerRef.current) {
                const height = treeContainerRef.current.clientHeight;
                // Ensure height is always a valid number
                if (height && typeof height === "number" && height > 0) {
                    setContainerHeight(height);
                    // console.log("📏 Container height updated:", height);
                }
            }
        };

        // Initial height with delay to ensure DOM is ready
        setTimeout(updateHeight, 100);

        // Observe container size changes
        const resizeObserver = new ResizeObserver(updateHeight);
        if (treeContainerRef.current) {
            resizeObserver.observe(treeContainerRef.current);
        }

        // Also listen to window resize
        window.addEventListener("resize", updateHeight);

        return () => {
            resizeObserver.disconnect();
            window.removeEventListener("resize", updateHeight);
        };
    }, []);

    // Add global styles for drop zone indicator
    useEffect(() => {
        const styleId = "drop-zone-styles";
        if (!document.getElementById(styleId)) {
            const style = document.createElement("style");
            style.id = styleId;
            style.textContent = `
                /* Drop zone indicator - show blue line when dragging over */
                .drop-zone-root[data-dragging-over="true"] .drop-indicator {
                    background-color: #007ACC !important;
                }
                
                /* React-arborist may add drop-target class or data attribute */
                [data-drop-target="true"] .drop-zone-root .drop-indicator,
                .drop-target .drop-zone-root .drop-indicator {
                    background-color: #007ACC !important;
                }
            `;
            document.head.appendChild(style);
        }

        return () => {
            const style = document.getElementById(styleId);
            if (style) {
                style.remove();
            }
        };
    }, []);

    // Transform workspace data to tree format
    // Handles: extract folders → filter by search → wrap in workspace root → convert to TreeFolder
        const treeData = useMemo(() => {
        const baseTree = treeMiniHelper.transformToTreeData(currentWorkspace, searchText);

        // Add invisible drop zone at the end to catch drops to root level
        if (baseTree.length > 0 && currentWorkspace?.id) {
            const dropZoneNode: TreeFolder = {
                id: `drop-zone-root-${currentWorkspace.id}`,
                name: "",
                data: {
                    // V2 structure
                    id: -1,
                    workspaceId: currentWorkspace.id,
                    parentId: null,
                    entityType: 2 as const,
                    entityId: -1,
                    createdAt: new Date().toISOString(),
                    updatedAt: undefined,
                    deletedAt: null,
                    copyInfo: null,
                    level: 0,
                    position: 0,
                    accessType: "owner" as const,
                    isOriginal: true,
                    data: {
                        id: -1,
                        userId: currentWorkspace.userId,
                        name: "",
                        description: undefined,
                        color: undefined,
                        icon: undefined,
                        createdAt: new Date().toISOString(),
                        updatedAt: undefined,
                        deletedAt: null,
                        copyInfo: null,
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
    }, [currentWorkspace, searchText]);

    // Calculate drop zone height to fill remaining space
    const dropZoneHeight = useMemo(() => {
        const rowHeight = 40;
        const actualItemsCount = treeData.filter((item) => (item.data as any).entityId !== -1).length;
        const usedHeight = actualItemsCount * rowHeight;
        const remaining = containerHeight - usedHeight;
        return Math.max(remaining, 100); // Minimum 100px
    }, [treeData, containerHeight]);

    // Get all visible folder IDs for keyboard navigation
    const allVisibleFolderIds = useMemo(() => {
        return treeMiniHelper.getAllVisibleFolderIds(treeData);
    }, [treeData]);

    // Keyboard navigation (VS Code-like)
    useEffect(() => {
        const handleKeyDownWrapper = (e: KeyboardEvent) => {
            handleKeyDown(e, allVisibleFolderIds);
        };

        document.addEventListener("keydown", handleKeyDownWrapper);
        return () => {
            document.removeEventListener("keydown", handleKeyDownWrapper);
        };
    }, [handleKeyDown, allVisibleFolderIds]);

    // Handle context menu on empty space (treat as root workspace)
    const handleContainerContextMenu = (e: React.MouseEvent) => {
        // Check if click is on an actual tree node
        const target = e.target as HTMLElement;
        const isTreeNode = target.closest('[role="treeitem"]') || target.closest(".tree-node");

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
                parentId: null,
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
                className="h-full flex flex-col p-4 pt-0 relative focus:outline-none focus-within:bg-editor-hover/30 transition-colors overflow-auto"
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
                    width="100%"
                    height={containerHeight || 800}
                    indent={24}
                    rowHeight={32}
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
                        // -------------------------------------------------------
                        // V2 WORKSPACE ITEM STRUCTURE
                        // -------------------------------------------------------
                        // item = WorkspaceItemV2 with properties:
                        // - item.id = workspace_items.id (workspace item ID)
                        // - item.entityId = entity ID (folders.id | notes.id | files.id)
                        // - item.parentId = parent's ENTITY ID (parent's entityId)
                        // - item.data = full entity data (FolderData | NoteData | FileData)
                        const item = node.data.data;

                        // Check workspace root and drop zone by ENTITY ID (entityId)
                        // Special IDs: -12345 = workspace root, -1 = drop zone
                        const isWorkspaceRoot = (item as any).entityId === -12345;
                        const isDropZone = (item as any).entityId === -1;

                        // Render different node types based on item type
                        return (
                            <div
                                style={{
                                    ...style,
                                    // Override height for drop zone to fill remaining space
                                    height: isDropZone ? `${dropZoneHeight}px` : style.height,
                                }}
                            >
                                {isDropZone ? (
                                    // Drop zone at bottom - fills remaining space for easy root-level drops
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
                                        onContextMenu={(e) => {
                                            e.preventDefault();
                                            e.stopPropagation();
                                            // Show root workspace context menu for drop zone
                                            if (treeData && treeData.length > 0) {
                                                const rootData = treeData[0].data; // Root is first item
                                                showContextMenu(e, constants.workspace.itemTypes.folder, {
                                                    ...rootData,
                                                    parentId: null,
                                                });
                                            }
                                        }}
                                    ></div>
                                ) : isWorkspaceRoot ? (
                                    <RootFolderNode node={node} style={{ height: "100%" }} treeData={treeData} />
                                ) : isFolderV2(item as any) ? (
                                    <FolderNode node={node} style={{ height: "100%" }} dragHandle={dragHandle} treeData={treeData} />
                                ) : isNoteV2(item as any) ? (
                                    <NoteNode node={node} style={{ height: "100%" }} dragHandle={dragHandle} />
                                ) : isFileV2(item as any) ? (
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
