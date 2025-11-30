
import React, { useEffect, useMemo } from 'react';
import { Tree, NodeApi } from 'react-arborist';
import { useDragDropManager } from 'react-dnd';
import {
    ChevronDown,
    ChevronRight,
    Tag as TagIcon,
    FolderOpen,
    Folder as FolderIcon,
    Layers,
    Plus,
    RefreshCw,
    ChevronsUp,
    Loader2
} from 'lucide-react';
import { Alert, AlertDescription } from '@/Components/ui/alert';

import { useContextMenuHelper } from '@/hooks/useContextMenuHelper';
import type { Folder } from '../../types/folder.types';
import type { WorkspaceTreeItemResponse } from '../../types/workspace.types';
import { AddFolderDialog } from '../tags/AddFolderDialog';
import { useFolderHelper } from '@/hooks/explorer/useFolderHelper';
import { useFolderStore } from '@/store/index';
import type { WorkspaceWithTreeResponse } from '@/types/workspace.types';
import {CustomDragPreview} from './CustomDragPreview';
import {WorkspaceTreeEmpty} from './WorkspaceTreeEmpty';
import {FolderNode} from './FolderNode';
import {createWorkspaceRootFolder, filterTreeBySearch, getAllFoldersFlattened, getAllVisibleFolderIds, transformFoldersToTreeData, transformTreeItemToFolder, TreeFolder} from '@/hooks/explorer/tree.helper';

interface WorkspaceTreeProps {
    onFolderClick?: (folder: Folder) => void;
    includeShared?: boolean; // DEPRECATED: No longer used, kept for backward compatibility
    workspaceId: number; // REQUIRED: Workspace ID for workspace-specific tree
    treeData: WorkspaceWithTreeResponse; // REQUIRED: Tree data from parent (ExplorerView)
    onRefresh?: () => void; // OPTIONAL: Callback when refresh is triggered
}

export function WorkspaceTree({ workspaceId, treeData: propsTreeData, onRefresh }: WorkspaceTreeProps) {
    // Validate required props
    if (!workspaceId) {
        throw new Error('workspaceId is required');
    }
    
    if (!propsTreeData) {
        throw new Error('treeData is required. WorkspaceTree must receive data from parent (ExplorerView)');
    }

    // Use tree data from props only (no internal fetching)
    const data = propsTreeData;
    console.log('📋 WorkspaceTree: Using data from props', { workspaceId, itemCount: data.items?.length });

    // Refetch function - delegates to parent
    const refetch = () => {
        if (onRefresh) {
            console.log('🔄 WorkspaceTree: Calling parent onRefresh');
            onRefresh();
        } else {
            console.warn('⚠️ WorkspaceTree: No onRefresh provided, cannot refresh');
        }
    };

    // Extract folders from workspace data
    // Data is always WorkspaceWithTreeResponse, need to transform items to Folder[]
    const folders = useMemo(() => {
        if (!data || !('items' in data)) return [];
        
        // Transform WorkspaceTreeItemResponse to Folder format
        return data.items
            .map(transformTreeItemToFolder)
            .filter((folder): folder is Folder => folder !== null);
    }, [data]);
    
    const {
        searchText,
        selectedFolderIds,
        setSelectedFolderIds,
        lastSelectedFolderId,
        setLastSelectedFolderId,
        isCreateDialogOpen,
        parentFolderForCreate,
        isDragging,
        setIsDragging,
    } = useFolderStore();
    const {
        selectAllFolders,
        clearSelection,
        openCreateDialog,
        closeCreateDialog,
        handleSelectionChange,
        handleMove,
        handleNewFolder,
        handleRefresh,
        handleCollapseAll,
    } = useFolderHelper();
    const treeContainerRef = React.useRef<HTMLDivElement>(null);
    const treeRef = React.useRef<any>(null);
    const manager = useDragDropManager();
    
    // Workspace info is available in data directly when needed

    // Transform and filter folders based on search text
    const treeData = useMemo(() => {
        if (!folders) return [];

        // Filter tree by search text using helper
        const filteredFolders = filterTreeBySearch(folders, searchText);
        
        // Always wrap folders under a workspace root node (workspace mode only)
        if (data && 'workspaceId' in data) {
            const workspaceData = data;
            const workspaceRootFolder = createWorkspaceRootFolder(
                workspaceData.workspaceId,
                workspaceData.name,
                {
                    description: workspaceData.description,
                    color: workspaceData.color,
                    createdAt: workspaceData.createdAt,
                    isArchived: workspaceData.isArchived,
                },
                filteredFolders
            );
            
            return transformFoldersToTreeData([workspaceRootFolder]);
        }
        
        return transformFoldersToTreeData(filteredFolders);
    }, [folders, searchText, data]);

    // Get all visible folder IDs for keyboard navigation
    const allVisibleFolderIds = useMemo(() => {
        return getAllVisibleFolderIds(treeData);
    }, [treeData]);

    // Keyboard navigation (VS Code-like)
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.target !== document.body && !(e.target as Element).closest('[data-workspace-tree]')) {
                return; // Only handle when tree is focused
            }

            const currentSelection = selectedFolderIds;
            const lastSelected = currentSelection.length > 0 ? currentSelection[currentSelection.length - 1] : null;
            const currentIndex = lastSelected ? allVisibleFolderIds.indexOf(lastSelected) : -1;

            switch (e.key) {
                case 'ArrowUp':
                    e.preventDefault();
                    if (currentIndex > 0) {
                        const newFolderId = allVisibleFolderIds[currentIndex - 1];
                        if (e.shiftKey && currentSelection.length > 0) {
                            // Extend selection upward
                            const firstSelected = currentSelection[0];
                            const firstIndex = allVisibleFolderIds.indexOf(firstSelected);
                            const startIndex = Math.min(firstIndex, currentIndex - 1);
                            const endIndex = Math.max(firstIndex, currentIndex - 1);
                            const rangeSelection = allVisibleFolderIds.slice(startIndex, endIndex + 1);
                            setSelectedFolderIds(rangeSelection);
                        } else {
                            setSelectedFolderIds([newFolderId]);
                        }
                        setLastSelectedFolderId(newFolderId);
                    }
                    break;

                case 'ArrowDown':
                    e.preventDefault();
                    if (currentIndex < allVisibleFolderIds.length - 1) {
                        const newFolderId = allVisibleFolderIds[currentIndex + 1];
                        if (e.shiftKey && currentSelection.length > 0) {
                            // Extend selection downward
                            const firstSelected = currentSelection[0];
                            const firstIndex = allVisibleFolderIds.indexOf(firstSelected);
                            const startIndex = Math.min(firstIndex, currentIndex + 1);
                            const endIndex = Math.max(firstIndex, currentIndex + 1);
                            const rangeSelection = allVisibleFolderIds.slice(startIndex, endIndex + 1);
                            setSelectedFolderIds(rangeSelection);
                        } else {
                            setSelectedFolderIds([newFolderId]);
                        }
                        setLastSelectedFolderId(newFolderId);
                    }
                    break;

                case 'a':
                    if (e.ctrlKey || e.metaKey) {
                        e.preventDefault();
                        // Ctrl+A: Select all
                        setSelectedFolderIds(allVisibleFolderIds);
                        setLastSelectedFolderId(allVisibleFolderIds[allVisibleFolderIds.length - 1]);
                    }
                    break;

                case 'Escape':
                    // Clear selection
                    clearSelection();
                    setLastSelectedFolderId(null);
                    break;
            }
        };

        document.addEventListener('keydown', handleKeyDown);
        return () => document.removeEventListener('keydown', handleKeyDown);
    }, [selectedFolderIds, allVisibleFolderIds]);

    // Wrapper functions to call helper with proper dependencies
    const onSelectionChange = (nodes: NodeApi<TreeFolder>[]) => {
        handleSelectionChange(nodes);
    };

    const onMove = async (args: { dragIds: string[]; parentId: string | null; index: number }) => {
        await handleMove(args, treeData);
    };
    
    const onNewFolderClick = () => {
        handleNewFolder(folders);
    };
    
    const onRefreshClick = () => {
        handleRefresh(refetch);
    };
    
    const onCollapseAllClick = () => {
        handleCollapseAll(treeRef);
    };

    // Empty state
    if (!treeData || treeData.length === 0) {
        return <WorkspaceTreeEmpty />;
    }

    // Main tree render with react-arborist
    return (
        <div
            ref={treeContainerRef}
            data-workspace-tree
            tabIndex={0}
            className="h-full flex flex-col p-4 relative focus:outline-none focus-within:bg-editor-hover/30 transition-colors"
        >
            {/* Loading overlay when dragging */}
            {(isDragging) && (
                <div className="absolute inset-0 bg-black/5 z-[1000] flex items-center justify-center pointer-events-none">
                    <div className="bg-editor-sidebar p-4 px-6 rounded-lg shadow-lg flex items-center gap-3">
                        <Loader2 className="w-5 h-5 text-primary animate-spin" />
                        <span className="text-sm text-editor-fg">Moving folder...</span>
                    </div>
                </div>
            )}
            <Tree<TreeFolder>
                ref={treeRef}
                data={treeData}
                openByDefault={true}
                width="100%"
                height={600}
                indent={24}
                rowHeight={40}
                overscanCount={8}
                dndManager={manager}
                onMove={onMove}
                onSelect={onSelectionChange}
                disableMultiSelection={false}
                disableEdit={true}
                renderDragPreview={(props) => <CustomDragPreview {...props} treeData={treeData} />}
            >
                {({ node, style, dragHandle }) => {
                    // Wrap in div to ensure native DOM element for DnD
                    return (
                        <div style={style}>
                            <FolderNode
                                node={node}
                                style={{ height: '100%' }}
                                dragHandle={dragHandle}
                                treeData={treeData}
                                onNewFolder={onNewFolderClick}
                                onRefresh={onRefreshClick}
                                onCollapseAll={onCollapseAllClick}
                            />
                        </div>
                    );
                }}
            </Tree>

            {/* Add Folder Dialog */}
            {workspaceId && (
                <AddFolderDialog
                    open={isCreateDialogOpen}
                    onClose={closeCreateDialog}
                    workspaceId={workspaceId}
                    parentTagId={parentFolderForCreate?.tagId}
                />
            )}
        </div>
    );
}
