
import React from 'react';
import { NodeApi } from 'react-arborist';
import {
    FileText,
} from 'lucide-react';
import { useContextMenuHelper } from '@/hooks/useContextMenu.helper';
import { useExplorerStore } from '@/store/index';
import { useTreeSelection } from '@/hooks/explorer/useTreeSelection.helper';
import { useEditorTabHelper } from '@/hooks/vsCode/useEditorTab.helper';
import { TreeFolder } from '@/hooks/explorer/tree.helper';
import { NoteItem } from '@/types/workspace.types';
import { Note } from '@/types/note.types';
import { constants } from '@/utils/constants';

export function NoteNode({
    node,
    style,
    dragHandle,
}: {
    node: NodeApi<TreeFolder>;
    style: React.CSSProperties;
    dragHandle?: any;
}) {
    const {
        selectedFolderIds,
        setSelectedFolderIds,
        setLastSelectedFolderId,
        currentTree,
    } = useExplorerStore();
    const { showContextMenu } = useContextMenuHelper();
    const { isFolderSelected } = useTreeSelection();
    const { openNoteTab } = useEditorTabHelper();

    const noteItem = node.data.data as NoteItem;
    const isSelected = isFolderSelected(noteItem.id);

    const handleMainClick = (e: React.MouseEvent) => {
        e.stopPropagation();
        e.preventDefault();

        // Focus the tree container for keyboard navigation
        const treeContainer = document.querySelector('[data-workspace-tree]') as HTMLElement;
        treeContainer?.focus();

        if (e.ctrlKey || e.metaKey) {
            // Ctrl+Click: Toggle selection
            if (isSelected) {
                setSelectedFolderIds(prev => prev.filter(id => id !== noteItem.id));
                node.deselect();
            } else {
                setSelectedFolderIds(prev => [...prev, noteItem.id]);
                node.selectMulti();
            }
            setLastSelectedFolderId(noteItem.id);
        } else {
            // Regular click: Single selection + open tab
            setSelectedFolderIds([noteItem.id]);
            setLastSelectedFolderId(noteItem.id);
            node.select();

            // ✅ Open note in editor tab (convert NoteItem to Note)
            const note: Note = {
                id: noteItem.id,
                name: noteItem.name,
                description: noteItem.metadata?.description || '',
                hashtags: [],
                tags: [],
                type: 'idea',
                createdAt: new Date(noteItem.createdAt),
                updatedAt: noteItem.updatedAt ? new Date(noteItem.updatedAt) : undefined,
                createdBy: 'You',
            };

            openNoteTab(note);
        }
    };

    const handleRightClick = (e: React.MouseEvent) => {
        e.stopPropagation();
        e.preventDefault();

        const _currentItem = currentTree?.items.find(i => i.id === noteItem.id);

        // Open note-specific context menu
        showContextMenu(e, constants.workspace.itemTypes.note, { ...noteItem, parentId: _currentItem?.parentId ?? null });
    };

    return (
        <div
            ref={(el) => {
                if (dragHandle && typeof dragHandle === 'function' && el) {
                    try {
                        dragHandle(el);
                    } catch (error) {
                        console.warn('Error setting dragHandle:', error);
                    }
                }
            }}
            style={{ ...style, paddingLeft: `${node.level * 8}px` }}
            onClick={handleMainClick}
            onContextMenu={handleRightClick}
            className={`
                flex items-center h-full w-full py-1 pr-2 cursor-pointer rounded
                transition-all duration-150 ease-in-out
                ${node.state.isDragging ? 'opacity-40' : 'opacity-100'}
                ${isSelected
                    ? 'bg-editor-hover text-white border-l-2 border-editor-active'
                    : 'bg-transparent hover:bg-editor-hover'
                }
            `}
        >
            {/* Spacer for alignment with folder chevrons */}
            <div className="w-5" />

            {/* Note Icon */}
            <div className="mr-2 flex items-center">
                <FileText
                    className="w-4 h-4 text-blue-400"
                />
            </div>

            {/* Note Info */}
            <div className="flex-1 min-w-0 flex items-center gap-2">
                <span className="text-sm truncate text-editor-fg">
                    {noteItem.name +'-'+ noteItem.id}
                </span>
                {noteItem.metadata?.isPinned && (
                    <span className="text-xs text-yellow-500">📌</span>
                )}
            </div>
        </div>
    );
}
