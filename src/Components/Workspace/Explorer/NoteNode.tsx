import React from "react";
import { NodeApi } from "react-arborist";
import { FileText } from "lucide-react";
import { useWorkspaceStore } from "@/store/index";
import { useTreeHelper2 } from "@/hooks/workspace/useTreeHelper2";
import { useEditorTabHelper } from "@/hooks/vsCode/useEditorTab.helper";
import { treeMiniHelper, TreeFolder } from "@/hooks/workspace/tree.miniHelper";
import { useTreeStatusHelper } from "@/hooks/workspace/useTreeStatusHelper";
import { WorkspaceNoteItem } from "@/types/workspace-v2.types";
import { Note } from "@/types/note.types";
import { constants } from "@/utils/constants";
import { useOrchestratorContextMenuHelper } from "@/shared/contexts/helpers/useOrchestratorContextMenu.helper";

export function NoteNode({ node, style, dragHandle, treeData }: { node: NodeApi<TreeFolder>; style: React.CSSProperties; dragHandle?: any; treeData: TreeFolder[] }) {
    const { selectedFolderIds, setSelectedFolderIds, lastSelectedFolderId, setLastSelectedFolderId, currentWorkspace } = useWorkspaceStore();
    const { showContextMenu } = useOrchestratorContextMenuHelper();
    const { isFolderSelected } = useTreeHelper2();
    const { openTab } = useEditorTabHelper();
    const _TREESTATUS = useTreeStatusHelper();

    // Safe cast: WorkspaceTree already filters to only render NoteNode for notes
    const noteItem = node.data.data as unknown as WorkspaceNoteItem;
    const entityId = noteItem.entityId;
    const isSelected = isFolderSelected(entityId);

    // Check if this node is being dragged
    const isDragging = node.state.isDragging;

    // Check if this node is a valid drop target (being dragged over)
    const isDropTarget = node.state.willReceiveDrop;

    // Check status and deleted state (including inherited from parent)
    const _ITEMSTATUS = _TREESTATUS.getItemStatus(noteItem);
    const isInactive = noteItem.data.statusCode === "inactive";

    const handleMainClick = (e: React.MouseEvent) => {
        e.stopPropagation();
        e.preventDefault();

        // Focus the tree container for keyboard navigation
        const treeContainer = document.querySelector("[data-workspace-tree]") as HTMLElement;
        treeContainer?.focus();

        if (e.ctrlKey || e.metaKey) {
            // Ctrl+Click: Toggle selection (like VS Code)
            if (isSelected) {
                setSelectedFolderIds((prev: number[]) => prev.filter((id) => id !== entityId));
                node.deselect();
            } else {
                setSelectedFolderIds((prev: number[]) => [...prev, entityId]);
                node.selectMulti();
            }
            setLastSelectedFolderId(entityId);
        } else if (e.shiftKey && lastSelectedFolderId) {
            // Shift+Click: Range selection (like VS Code)
            const allVisibleFolders = treeMiniHelper.getAllVisibleFolderIds(treeData);
            const lastIndex = allVisibleFolders.indexOf(lastSelectedFolderId);
            const currentIndex = allVisibleFolders.indexOf(entityId);

            if (lastIndex !== -1 && currentIndex !== -1) {
                const startIndex = Math.min(lastIndex, currentIndex);
                const endIndex = Math.max(lastIndex, currentIndex);
                const rangeSelection = allVisibleFolders.slice(startIndex, endIndex + 1);
                setSelectedFolderIds(rangeSelection);
                // Sync with react-arborist (select range ending at this node)
                node.selectMulti();
            } else {
                setSelectedFolderIds([entityId]);
                node.select();
            }
            setLastSelectedFolderId(entityId);
        } else {
            // Regular click: Single selection + open tab
            setSelectedFolderIds([entityId]);
            setLastSelectedFolderId(entityId);
            node.select();

            // ✅ Open note in editor tab (convert WorkspaceNoteItem to Note)
            const note: Note = {
                id: noteItem.data.id,
                name: noteItem.data.name,
                description: noteItem.data.description || "",
                hashtags: [],
                tags: [],
                type: "idea",
                createdAt: new Date(noteItem.data.createdAt),
                updatedAt: noteItem.data.updatedAt ? new Date(noteItem.data.updatedAt) : undefined,
                createdBy: "You",
                deletedAt: noteItem.data.deletedAt ? new Date(noteItem.data.deletedAt) : null,
                userId: noteItem.data.userId,
            };

            openTab(note);
        }
    };

    const handleRightClick = (e: React.MouseEvent) => {
        e.stopPropagation();
        e.preventDefault();

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
                ${isSelected ? "bg-editor-hover text-white" : "bg-transparent hover:bg-editor-hover-light"}
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
                    <FileText className={`w-4 h-4 ${_ITEMSTATUS.hasDeletedAncestor || _ITEMSTATUS.isDirectlyDeleted ? "text-gray-500" : "text-blue-400"}`} />
                </div>

                {/* Note Info */}
                <div className="flex-1 min-w-0 flex items-center gap-2">
                    <span className={`text-sm truncate text-editor-fg ${_ITEMSTATUS.isDirectlyDeleted ? "line-through" : ""}`}>
                        {noteItem.data.name + "-" + entityId}
                    </span>
                    {/* {noteItem.data.isPinned && <span className="text-xs text-yellow-500">📌</span>} */}
                </div>
            </div>
        </div>
    );
}
