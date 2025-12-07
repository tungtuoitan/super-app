
import React from 'react';
import { NodeApi } from 'react-arborist';
import {
    File,
    FileImage,
    FileVideo,
    FileArchive,
    FileCode,
} from 'lucide-react';
import { useContextMenuHelper } from '@/hooks/useContextMenuHelper';
import { useExplorerStore } from '@/store/index';
import { useTreeSelection } from '@/hooks/explorer/useTreeSelection.helper';
import { TreeFolder } from '@/hooks/explorer/tree.helper';
import { FileItem } from '@/types/workspace.types';

function getFileIcon(extension?: string) {
    if (!extension) return File;

    const ext = extension.toLowerCase();

    // Images
    if (['jpg', 'jpeg', 'png', 'gif', 'svg', 'webp', 'bmp'].includes(ext)) {
        return FileImage;
    }

    // Videos
    if (['mp4', 'avi', 'mov', 'wmv', 'flv', 'webm'].includes(ext)) {
        return FileVideo;
    }

    // Archives
    if (['zip', 'rar', '7z', 'tar', 'gz'].includes(ext)) {
        return FileArchive;
    }

    // Code
    if (['js', 'ts', 'jsx', 'tsx', 'py', 'java', 'cs', 'cpp', 'c', 'html', 'css', 'json', 'xml'].includes(ext)) {
        return FileCode;
    }

    return File;
}

export function FileNode({
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

    const fileItem = node.data.data as FileItem;
    const isSelected = isFolderSelected(fileItem.id);
    const FileIcon = getFileIcon(fileItem.metadata?.extension);

    const handleMainClick = (e: React.MouseEvent) => {
        e.stopPropagation();
        e.preventDefault();

        // Focus the tree container for keyboard navigation
        const treeContainer = document.querySelector('[data-workspace-tree]') as HTMLElement;
        treeContainer?.focus();

        if (e.ctrlKey || e.metaKey) {
            // Ctrl+Click: Toggle selection
            if (isSelected) {
                setSelectedFolderIds(prev => prev.filter(id => id !== fileItem.id));
                node.deselect();
            } else {
                setSelectedFolderIds(prev => [...prev, fileItem.id]);
                node.selectMulti();
            }
            setLastSelectedFolderId(fileItem.id);
        } else {
            // Regular click: Single selection
            setSelectedFolderIds([fileItem.id]);
            setLastSelectedFolderId(fileItem.id);
            node.select();

            // TODO: Open file preview or download
            console.log('Open file:', fileItem);
        }
    };

    const handleRightClick = (e: React.MouseEvent) => {
        e.stopPropagation();
        e.preventDefault();

        const _currentItem = currentTree?.items.find(i => i.id === fileItem.id);

        // Open file-specific context menu
        showContextMenu(e, 'file', { ...fileItem, parentId: _currentItem?.parentId ?? null });
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

            {/* File Icon */}
            <div className="mr-2 flex items-center">
                <FileIcon
                    className="w-4 h-4 text-gray-400"
                />
            </div>

            {/* File Info */}
            <div className="flex-1 min-w-0 flex items-center gap-2">
                <span className="text-sm truncate text-editor-fg">
                    {fileItem.name}
                </span>
                {fileItem.metadata?.fileSizeFormatted && (
                    <span className="text-xs text-gray-500">
                        {fileItem.metadata.fileSizeFormatted}
                    </span>
                )}
            </div>
        </div>
    );
}
