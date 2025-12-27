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
import { treeMiniHelper, TreeFolder } from "@/hooks/workspace/tree.miniHelper";
import { isFolder, isNote, isFile } from "@/types/workspace.types";
import { constants } from "@/utils/constants";

export function WorkspaceTree() {
    const { searchText, isDragging, currentTree, _treeRef } = useWorkspaceStore();
    const { handleSelectionChange, handleKeyDown } = useTreeSelectionHelper();
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
                if (height && typeof height === 'number' && height > 0) {
                    setContainerHeight(height);
                    console.log("📏 Container height updated:", height);
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
        const baseTree = treeMiniHelper.transformToTreeData(currentTree, searchText);
        
        // Add invisible drop zone at the end to catch drops to root level
        if (baseTree.length > 0 && currentTree?.workspaceId) {
            const dropZoneNode: TreeFolder = {
                id: `drop-zone-root-${currentTree.workspaceId}`,
                name: "",
                data: {
                    id: -1, // Special ID for drop zone
                    userId: currentTree.userId,
                    name: "",
                    type: constants.workspace.itemTypes.folder,
                    parentId: null,
                    accessType: "owner",
                    isOriginal: true,
                    level: 0,
                    depth: 0,
                    position: 0,
                    sortOrder: 0,
                    isExpanded: false,
                    isSelected: false,
                    createdAt: new Date().toISOString(),
                    children: [],
                },
                children: [],
            };
            return [...baseTree, dropZoneNode];
        }
        
        return baseTree;
    }, [currentTree, searchText]);

    // Calculate drop zone height to fill remaining space
    const dropZoneHeight = useMemo(() => {
        const rowHeight = 40;
        const actualItemsCount = treeData.filter(item => item.data.id !== -1).length;
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
                        const item = node.data.data;
                        const isWorkspaceRoot = item.id === -12345;
                        const isDropZone = item.id === -1; // Special drop zone node

                        // Render different node types based on item type
                        return (
                            <div style={{
                                ...style,
                                // Override height for drop zone to fill remaining space
                                height: isDropZone ? `${dropZoneHeight}px` : style.height
                            }}>
                                {isDropZone ? (
                                    // Drop zone at bottom - fills remaining space for easy root-level drops
                                    <div 
                                        className="drop-zone-root"
                                        style={{ 
                                            height: `${dropZoneHeight}px`,
                                            width: "100%",
                                            // border: "2px dashed red",
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
                                    >
                                        {/* <div // blue line indicator when dragging over, nhưng bị thừa
                                            className="drop-indicator"
                                            style={{
                                                width: "100%",
                                                height: "2px",
                                                backgroundColor: "transparent",
                                                transition: "background-color 0.15s ease",
                                            }}
                                        /> */}
                                    </div>
                                ) : isWorkspaceRoot ? (
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
