import React from "react";
import { NodeApi } from "react-arborist";
import { ChevronDown, ChevronRight, Tag as TagIcon, FolderOpen, Folder as FolderIcon, Layers, Dot, Circle, ChevronUp } from "lucide-react";
import { useWorkspaceStore } from "../../store/Workspace.store";
import { useGridControlStore } from "@/shared";
import { useTreeHelper2 } from "../../hooks/useTreeHelper2";
import { treeMiniHelper, TreeFolder } from "../../hooks/tree.miniHelper";
import { useTreeStatusHelper } from "../../hooks/useTreeStatusHelper";
import { WorkspaceFolderItem } from "@/features/workspace/types/workspace-v2.types";
import { constants } from "@/shared";
import { useOrchestratorContextMenuHelper } from "@/shared";
import { HighlightText } from "./HighlightText";
import { ICON_MAP, IconKey } from "@/shared";

interface FolderNodeProps {
    node: NodeApi<TreeFolder>;
    style: React.CSSProperties;
    dragHandle?: any;
    treeData: TreeFolder[];
    treeType?: "workspaceTree" | "targetTree";
}

type IconProps = {
  className?: string;
  color: string

};

const Folder2: React.FC<IconProps> = ({ className, color }) => (
<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill={color} className="icon icon-tabler icons-tabler-filled icon-tabler-folder w-4 h-4"><path stroke="none" d="M0 0h24v24H0z" fill="none"/><path d="M9 3a1 1 0 0 1 .608 .206l.1 .087l2.706 2.707h6.586a3 3 0 0 1 2.995 2.824l.005 .176v8a3 3 0 0 1 -2.824 2.995l-.176 .005h-14a3 3 0 0 1 -2.995 -2.824l-.005 -.176v-11a3 3 0 0 1 2.824 -2.995l.176 -.005h4z" /></svg>
);

const FolderOpen2: React.FC<IconProps> = ({ className, color }) => (
<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill={color} className="icon icon-tabler icons-tabler-filled icon-tabler-folder-open w-4 h-4"><path stroke="none" d="M0 0h24v24H0z" fill="none"/><path d="M2 6c0 -.796 .316 -1.558 .879 -2.121c.563 -.563 1.325 -.879 2.121 -.879h4l.099 .005c.229 .023 .444 .124 .608 .288l2.707 2.707h6.586c.796 0 1.558 .316 2.121 .879c.319 .319 .559 .703 .707 1.121l-14.523 0c-.407 0 -.805 .125 -1.14 .356c-.292 .203 -.525 .48 -.674 .801l-.058 .141l-1.379 3.676c-.194 .517 .068 1.093 .585 1.287c.517 .194 1.094 -.068 1.288 -.585l1.134 -3.027c.146 -.39 .519 -.649 .937 -.649h13.002l.217 .012c.216 .024 .426 .082 .624 .173c.054 .025 .107 .053 .159 .083c.199 .115 .377 .263 .525 .439c.188 .222 .325 .482 .403 .762c.077 .28 .092 .573 .045 .859c-.001 .008 -.003 .016 -.005 .024l-.995 5.21c-.131 .686 -.497 1.304 -1.036 1.749c-.47 .389 -1.046 .624 -1.65 .677l-.261 .012h-14.026c-.796 0 -1.558 -.316 -2.121 -.879c-.563 -.563 -.879 -1.325 -.879 -2.121v-11z" /></svg>
);

export default Folder2;

export function FolderNode({ node, style, dragHandle, treeData, treeType = "workspaceTree" }: FolderNodeProps) {
    const { selectedItemIds, setSelectedItemIds, lastSelectedItemId, setLastSelectedItemId, currentWorkspace, _treeRef,setScrollToItem } = useWorkspaceStore();
    const { searchQuery } = useGridControlStore();
    const { showContextMenu } = useOrchestratorContextMenuHelper();
    const { isFolderSelected, getVisibleNodeIds } = useTreeHelper2();
    const _TREESTATUS = useTreeStatusHelper();

    // Safe cast: WorkspaceTree already filters to only render FolderNode for folders
    const folderItem = node.data.data as unknown as WorkspaceFolderItem;

    // Extract data from V2 structure
    const workspaceItemId = folderItem.id; // workspace_items.id (unique)
    const entityId = folderItem.entityId; // folders.id (for API calls, context menu)
    const folderName = folderItem.data.name;
    const folderColor = folderItem.data.color;
    const folderIcon = folderItem.data.icon as IconKey | undefined; // Icon type from database
    const hasChildren = node.data.children && node.data.children.length > 0;
    const isSelected = isFolderSelected(workspaceItemId); // Use workspace_items.id for selection
    const isWorkspaceRoot = entityId < 0; // Workspace root node has negative ID

    // Check if this node is being dragged
    const isDragging = node.state.isDragging;

    // Check if this node is a valid drop target (being dragged over)
    const isDropTarget = node.state.willReceiveDrop;

    // Check if deleted (including inherited from parent)
    const _ITEMSTATUS = _TREESTATUS.getItemStatus(folderItem);

    const handleMainClick = (e: React.MouseEvent) => {
        e.stopPropagation();
        e.preventDefault(); // Prevent tree activation that causes scrolling
        setScrollToItem(false); // Clear any existing highlight

        // For targetTree, only allow expand/collapse (no selection)
        if (treeType === "targetTree") {
            if (hasChildren) {
                node.toggle();
            }
            return;
        }

        // Don't allow selection of workspace root node
        if (isWorkspaceRoot) {
            // Only allow expand/collapse for workspace root
            if (hasChildren) {
                node.toggle();
            }
            return;
        }

        // Focus the tree container for keyboard navigation without scrolling
        const treeContainer = document.querySelector("[data-workspace-tree]") as HTMLElement;
        if (treeContainer) {
            const scrollPos = window.scrollY || window.pageYOffset;
            treeContainer.focus({ preventScroll: true });
            window.scrollTo(0, scrollPos);
        }

        if (e.ctrlKey || e.metaKey) {
            // Ctrl+Click: Toggle selection (like VS Code)
            if (isSelected) {
                setSelectedItemIds((prev: number[]) => prev.filter((id) => id !== workspaceItemId));
                // Sync with react-arborist
                node.deselect();
            } else {
                setSelectedItemIds((prev: number[]) => [...prev, workspaceItemId]);
                // Sync with react-arborist (multi-select mode)
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
            // Regular click: Single selection + toggle expand/collapse if has children (like VS Code)
            setSelectedItemIds([workspaceItemId]);
            setLastSelectedItemId(workspaceItemId);
            // Sync with react-arborist (single select - clears others)
            node.select();

            // Toggle expand/collapse if node has children
            if (hasChildren) {
                node.toggle();
            }
        }
    };

    const handleRightClick = (e: React.MouseEvent) => {
        e.stopPropagation(); // Prevent bubbling to parent
        e.preventDefault(); // Prevent default context menu

        // Don't show context menu for targetTree
        if (treeType === "targetTree") {
            return;
        }

        // Don't show context menu for workspace root
        if (isWorkspaceRoot) {
            return;
        }

        const _currentFolder = currentWorkspace?.flatData.find((f: any) => f.entityId === entityId);

        // Open folder-specific context menu with folder data (V2 structure)
        const contextData = { ...folderItem, parentId: _currentFolder?.parentId ?? null };
        showContextMenu(e, constants.contextMenu.contextMenuTypes.folder, contextData);
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
                    ${isWorkspaceRoot ? "font-semibold" : ""}
                    ${isDragging && isSelected ? "bg-primary/30 outline outline-1 outline-primary/60 -outline-offset-1 rounded" : ""}
                    ${isDropTarget ? "bg-editor-hover outline outline-1 outline-primary/50 -outline-offset-1 rounded" : ""}
                `}
            >
                {/* Expand/Collapse Button */}
                <button
                    onClick={(e) => {
                        e.stopPropagation();
                        e.preventDefault();
                        node.toggle();
                    }}
                    disabled={!hasChildren}
                    // className={`p-0.5 text-editor-fg`}
                    className={`p-0.5 ${hasChildren ? "" : "opacity-50"} text-editor-fg`}
                >
                    {hasChildren ? node.isOpen ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" /> : <div className="w-3 h-3" />}
                </button>

                {/* Folder Icon - VS Code Material Icon Theme style */}
                <div className="mr-2 flex items-center">
                    {/* Workspace root node */}
                    {isWorkspaceRoot ? (
                        <Layers className="w-4 h-4" style={{ color: folderColor || "#75beff" }} />
                    ) : folderIcon && ICON_MAP[folderIcon] ? (
                        // Custom icon: Folder as background + custom icon at bottom-right
                        (() => {
                            const CustomIcon = ICON_MAP[folderIcon];
                            const isDeleted = _ITEMSTATUS.hasDeletedAncestor || _ITEMSTATUS.isDirectlyDeleted;
                            const iconColor = isDeleted ? "#6b7280" : (folderColor || "#75beff");
                            return (
                                <div className="relative w-4 h-4">
                                    {/* Background: Folder icon with color */}
                                    {node.isOpen ? (
                                        <FolderOpen2
                                            className="w-4 h-4 absolute inset-0"
                                            color={ iconColor }
                                        />
                                    ) : (
                                        <Folder2
                                            className="w-4 h-4 absolute inset-0"
                                            color={iconColor} />
                                    )}
                                    {/* Overlay: Custom icon at bottom-right, white color */}
                                    <CustomIcon
                                        className="w-2.5 h-2.5 absolute -bottom-0.5 -right-0.5"
                                        style={{ color: isDeleted ? "#9ca3af" : "white" }}
                                        strokeWidth={2.5}
                                    />
                                </div>
                            );
                        })()
                    ) : hasChildren ? (
                        node.isOpen ? (
                            <FolderOpen2
                                className={`w-4 h-4 ${_ITEMSTATUS.hasDeletedAncestor || _ITEMSTATUS.isDirectlyDeleted ? "text-gray-500" : ""}`}
                                color={!_ITEMSTATUS.hasDeletedAncestor && !_ITEMSTATUS.isDirectlyDeleted ? folderColor||"" : ""}
                            />
                        ) : (
                            <Folder2
                                className={`w-4 h-4 ${_ITEMSTATUS.hasDeletedAncestor || _ITEMSTATUS.isDirectlyDeleted ? "text-gray-500" : ""}`}
                                color={!_ITEMSTATUS.hasDeletedAncestor && !_ITEMSTATUS.isDirectlyDeleted ? folderColor||"" : ""}
                            />
                        )
                    ) : (
                        <Folder2
                            className={`w-4 h-4 ${_ITEMSTATUS.hasDeletedAncestor || _ITEMSTATUS.isDirectlyDeleted ? "text-gray-500" : ""}`}
                            color={!_ITEMSTATUS.hasDeletedAncestor && !_ITEMSTATUS.isDirectlyDeleted ? folderColor||"" : ""}
                        />
                    )}
                </div>

                {/* Folder Info */}
                <div className="flex-1 min-w-0 flex items-center gap-2">
                    <div className="w-full min-w-0 flex items-center gap-2">
                        <HighlightText
                            text={`${folderName}`}
                            // text={`${folderName} - ${workspaceItemId} - ${entityId}`}
                            highlight={treeType === "workspaceTree" ? searchQuery : ""} // Only highlight in workspaceTree, tạm thời chưa làm cho targetTree có search
                            className={`
                            text-sm truncate
                            ${hasChildren ? "font-semibold" : "font-normal"}
                            ${isWorkspaceRoot ? "uppercase tracking-wide" : ""}
                            ${_ITEMSTATUS.isDirectlyDeleted ? "line-through" : ""}
                            ${_ITEMSTATUS.hasDeletedAncestor || _ITEMSTATUS.isDirectlyDeleted ? "text-gray-500" : "text-editor-fg"}
                        `}
                        />
                    </div>
                </div>
            </div>
        </div>
    );
}
