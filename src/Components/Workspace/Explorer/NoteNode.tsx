import React, { useCallback } from "react";
import { NodeApi } from "react-arborist";
import { FileText } from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";
import { ICON_MAP, IconType, ICON_COLORS } from "@/shared/icons";
import { useWorkspaceStore } from "@/store/index";
import { useGridControlStore } from "@/store/grid/useGridControl.store";
import { useMovingTreeStore } from "@/store/workspace/MovingTree.store";
import { useTreeHelper2 } from "@/hooks/workspace/useTreeHelper2";
import { useEditorTabHelper } from "@/hooks/vsCode/useEditorTab.helper";
import { treeMiniHelper, TreeFolder } from "@/hooks/workspace/tree.miniHelper";
import { useTreeStatusHelper } from "@/hooks/workspace/useTreeStatusHelper";
import { WorkspaceNoteItem } from "@/types/workspace-v2.types";
import { Note } from "@/types/note.types";
import { constants } from "@/utils/constants";
import { useOrchestratorContextMenuHelper } from "@/shared/contexts/helpers/useOrchestratorContextMenu.helper";
import { StatusDot } from "./StatusDot";
import { HighlightText } from "./HighlightText";
// import { useLogger } from "store/debug/DebugLogger.store";

interface NoteNodeProps {
    node: NodeApi<TreeFolder>;
    style: React.CSSProperties;
    dragHandle?: any;
    treeData: TreeFolder[];
    treeType?: "workspaceTree" | "targetTree";
}

export function NoteNode({ node, style, dragHandle, treeData, treeType = "workspaceTree" }: NoteNodeProps) {
    const { selectedItemIds, setSelectedItemIds, lastSelectedItemId, setLastSelectedItemId, currentWorkspace, _treeRef, setSelectedWorkspaceId, setScrollToItem, scrollToItem } =
        useWorkspaceStore();
    const { searchQuery } = useGridControlStore();
    const { highlightedDuplicateIds, targetWorkspace } = useMovingTreeStore();
    const { showContextMenu } = useOrchestratorContextMenuHelper();
    const { isFolderSelected, getVisibleNodeIds, selectItem } = useTreeHelper2();
    const { openTab } = useEditorTabHelper();
    const _TREESTATUS = useTreeStatusHelper();
    const navigate = useNavigate();
    const location = useLocation();
    // const logger = useLogger("NoteNode");

    // Safe cast: WorkspaceTree already filters to only render NoteNode for notes
    const noteItem = node.data.data as unknown as WorkspaceNoteItem;
    const workspaceItemId = noteItem.id; // workspace_items.id (unique)
    const entityId = noteItem.entityId; // notes.id (for API calls, context menu)
    const isSelected = isFolderSelected(workspaceItemId); // Use workspace_items.id for selection

    // Check if this node is being dragged
    const isDragging = node.state.isDragging;

    // Check if this node is a valid drop target (being dragged over)
    const isDropTarget = node.state.willReceiveDrop;

    // Check status and deleted state (including inherited from parent)
    const _ITEMSTATUS = _TREESTATUS.getItemStatus(noteItem);
    const isInactive = noteItem.data.statusCode === "inactive";

    // Determine dot status
    const isUnsaved = workspaceItemId < 0;
    const compositeKey = `${noteItem.entityType}-${entityId}`;
    // Only show duplicate dot in targetTree (not in workspaceTree)
    const isDuplicate = highlightedDuplicateIds.has(compositeKey);

    // Extract workspace links from note data
    const workspaceLinks = noteItem.data.workspaceLinks || [];

    // Extract icon and color from note data
    const noteIcon = noteItem.data.icon as IconType | undefined;
    const noteColor = noteItem.data.color;

    // Handle workspace navigation with highlight
    const handleWorkspaceNavigation = useCallback(
        (workspaceId: number, workspaceItemId: number) => {
            if (workspaceItemId === null) {
                return;
            }

            // Set workspace (will trigger load/expand)
            setSelectedWorkspaceId(workspaceId);

            // Set target item to scroll to (will be selected when tree renders)
            setSelectedItemIds([workspaceItemId]);
            setScrollToItem(true);

            // Navigate if not already at /workspace
            if (!location.pathname.includes("/workspace")) {
                navigate("/workspace");
            }
        },
        [location.pathname, navigate, setSelectedWorkspaceId, setSelectedItemIds, setScrollToItem]
    );

    const handleMainClick = (e: React.MouseEvent) => {
        e.stopPropagation();
        e.preventDefault();

        // logger.log("NoteNode Click", {
        //     noteName: noteItem.data.name,
        //     workspaceItemId,
        // });

        // Log before focus
        // logger.log("Before Focus - TopNav Status", {
        //     scrollY: window.scrollY,
        //     windowHeight: window.innerHeight,
        //     topNavRect: (() => {
        //         const el = document.querySelector(".top-navigation") as HTMLElement;
        //         if (!el) return null;
        //         const rect = el.getBoundingClientRect();
        //         return {
        //             top: rect.top,
        //             bottom: rect.bottom,
        //             height: rect.height,
        //             isVisible: rect.top >= 0 && rect.top < window.innerHeight,
        //         };
        //     })(),
        // });

        // Focus the tree container for keyboard navigation without scrolling
        const treeContainer = document.querySelector("[data-workspace-tree]") as HTMLElement;
        if (treeContainer) {
            const scrollPos = window.scrollY || window.pageYOffset;
            
            // logger.log("Focusing Tree Container", {
            //     currentScrollY: scrollPos,
            //     preventScroll: true,
            // });
            
            treeContainer.focus({ preventScroll: true });
            window.scrollTo(0, scrollPos);
            
            // Log after focus
            setTimeout(() => {
                // logger.log("After Focus - TopNav Status", {
                //     scrollY: window.scrollY,
                //     topNavRect: (() => {
                //         const el = document.querySelector(".top-navigation") as HTMLElement;
                //         if (!el) return null;
                //         const rect = el.getBoundingClientRect();
                //         return {
                //             top: rect.top,
                //             bottom: rect.bottom,
                //             height: rect.height,
                //             isVisible: rect.top >= 0 && rect.top < window.innerHeight,
                //         };
                //     })(),
                // });
            }, 50);
        }
        
        if (treeType === "targetTree") return; // Disable opening tab in targetTree

        if (e.ctrlKey || e.metaKey) {
            // Ctrl+Click: Toggle selection (like VS Code)
            if (isSelected) {
                setSelectedItemIds((prev: number[]) => prev.filter((id) => id !== workspaceItemId));
                node.deselect();
            } else {
                setSelectedItemIds((prev: number[]) => [...prev, workspaceItemId]);
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
            // Regular click: Single selection + open tab
            setSelectedItemIds([workspaceItemId]);
            setLastSelectedItemId(workspaceItemId);
            node.select();

            // ✅ Open note in editor tab (convert WorkspaceNoteItem to Note)
            const note: Note = {
                id: noteItem.data.id,
                name: noteItem.data.name,
                description: noteItem.data.description || "",
                hashtags: "",
                type: "idea",
                statusCode: noteItem.data.statusCode,
                icon: noteItem.data.icon,
                color: noteItem.data.color,
                createdAt: new Date(noteItem.data.createdAt),
                updatedAt: noteItem.data.updatedAt ? new Date(noteItem.data.updatedAt) : undefined,
                createdBy: "You",
                deletedAt: noteItem.data.deletedAt ? new Date(noteItem.data.deletedAt) : null,
                userId: noteItem.data.userId,
            };

            openTab(note, constants.vscode.tab.tabTypes.note);
        }
    };

    const handleRightClick = (e: React.MouseEvent) => {
        e.stopPropagation();
        e.preventDefault();
        if (treeType === "targetTree") return; // Disable context menu in targetTree

        const _currentItem = currentWorkspace?.flatData.find((i: any) => i.entityId === entityId);

        // Open note-specific context menu (V2 structure)
        showContextMenu(e, constants.workspace.itemTypes.note, { ...noteItem, parentId: _currentItem?.parentId ?? null });
    };

    return (
        <div
            style={{
                ...style,
                marginLeft: `${node.level * -5}px`, // Reduced from default ~20-24px per level to 12px
            }}
            className={`
                ${treeType === "workspaceTree" && isSelected ? "bg-editor-hover text-white" : "bg-transparent hover:bg-editor-hover-light"}
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
                    ${isDragging && isSelected ? "bg-primary/30 outline outline-1 outline-primary/60 -outline-offset-1 rounded" : ""}
                    ${isDropTarget ? "bg-editor-hover outline outline-1 outline-primary/50 -outline-offset-1 rounded" : ""}
                `}
            >
                {/* Spacer for alignment with folder chevrons */}
                <div className="w-4" />

                {/* Note Icon */}
                <div className="mr-2 flex items-center">
                    {noteIcon && ICON_MAP[noteIcon] ? (
                        // Custom icon from database
                        (() => {
                            const CustomIcon = ICON_MAP[noteIcon];
                            return (
                                <CustomIcon
                                    className={`w-4 h-4 ${_ITEMSTATUS.hasDeletedAncestor || _ITEMSTATUS.isDirectlyDeleted ? "text-gray-500" : ""}`}
                                    style={!_ITEMSTATUS.hasDeletedAncestor && !_ITEMSTATUS.isDirectlyDeleted ? { color: noteColor || ICON_COLORS.BLUE } : {}}
                                />
                            );
                        })()
                    ) : (
                        // Default note icon
                        <FileText
                            className={`w-4 h-4 ${_ITEMSTATUS.hasDeletedAncestor || _ITEMSTATUS.isDirectlyDeleted ? "text-gray-500" : ""}`}
                            style={!_ITEMSTATUS.hasDeletedAncestor && !_ITEMSTATUS.isDirectlyDeleted ? { color: noteColor || ICON_COLORS.BLUE } : {}}
                        />
                    )}
                </div>

                {/* Note Info */}
                <div className="flex-1 min-w-0 flex items-center gap-2">
                    <HighlightText
                        text={noteItem.data.name}
                        highlight={treeType === "workspaceTree" ? searchQuery : ""}
                        className={`text-sm truncate ${_ITEMSTATUS.hasDeletedAncestor || _ITEMSTATUS.isDirectlyDeleted ? "text-gray-500" : "text-editor-fg"} ${
                            _ITEMSTATUS.isDirectlyDeleted ? "line-through" : ""
                        }`}
                    />
                    {/* {noteItem.data.isPinned && <span className="text-xs text-yellow-500">📌</span>} */}
                    <StatusDot
                        isUnsaved={isUnsaved}
                        isDuplicate={isDuplicate}
                        itemType="Note"
                        itemName={noteItem.data.name}
                        targetWorkspaceName={targetWorkspace?.name}
                        workspaceLinks={workspaceLinks}
                        onWorkspaceClick={handleWorkspaceNavigation}
                    />
                </div>
            </div>
        </div>
    );
}
