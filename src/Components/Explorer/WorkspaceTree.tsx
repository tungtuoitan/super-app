
import React, { useEffect, useMemo } from 'react';
import { Tree, NodeApi } from 'react-arborist';
import { useDragDropManager } from 'react-dnd';
import {
    Loader2
} from 'lucide-react';
import type { Folder } from '../../types/folder.types';
import { AddFolderDialog } from '../tags/AddFolderDialog';
import { useExplorerStore } from '@/store/index';
import { useTreeSelection } from '@/hooks/explorer/useTreeSelection.helper';
import { useDialogAction } from '@/hooks/explorer/useDialogAction.helper';
import { useTreeOperation } from '@/hooks/explorer/useTreeOperation.helper';
import { useWorkspaceOperation } from '@/hooks/explorer/useWorkspaceOperation.helper';
import {CustomDragPreview} from './CustomDragPreview';
import {WorkspaceTreeEmpty} from './WorkspaceTreeEmpty';
import {FolderNode} from './FolderNode';
import {createWorkspaceRootFolder, filterTreeBySearch, getAllVisibleFolderIds, transformFoldersToTreeData, transformTreeItemToFolder, TreeFolder} from '@/hooks/explorer/tree.helper';

export function WorkspaceTree() {
    const {
        searchText,
        isDragging,
        setTreeRef,
    } = useExplorerStore();

    const {
        handleSelectionChange,
        handleKeyDown,
    } = useTreeSelection();
    const {
    } = useDialogAction();
    const {
        handleMove,
    } = useTreeOperation();
    const {
        getCurrentTree,
    } = useWorkspaceOperation();

    // Get current workspace tree data
    const data = getCurrentTree();

    // Extract folders from workspace data
    // Data is always WorkspaceWithTreeResponse, need to transform items to Folder[]
    const folders = useMemo(() => {
        if (!data || !('items' in data)) return [];
        
        // Transform WorkspaceTreeItemResponse to Folder format
        return data.items
            .map(transformTreeItemToFolder)
            .filter((folder): folder is Folder => folder !== null);
    }, [data]);
    
    const treeContainerRef = React.useRef<HTMLDivElement>(null);
    const treeRef = React.useRef<any>(null);
    const manager = useDragDropManager();
    
    // Store treeRef in context for global access
    useEffect(() => {
        setTreeRef(treeRef);
        return () => setTreeRef(null);
    }, [setTreeRef]);
    

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
        const handleKeyDownWrapper = (e: KeyboardEvent) => {
            handleKeyDown(e, allVisibleFolderIds);
        };

        document.addEventListener('keydown', handleKeyDownWrapper);
        return () => document.removeEventListener('keydown', handleKeyDownWrapper);
    }, [handleKeyDown, allVisibleFolderIds]);


    if (!treeData || treeData.length === 0) {
        return <WorkspaceTreeEmpty />;
    }
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
                onMove={async (args) => {await handleMove(args, treeData);}}
                onSelect={(nodes: NodeApi<TreeFolder>[]) => handleSelectionChange(nodes)}
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
                            />
                        </div>
                    );
                }}
            </Tree>

            {/* Add Folder Dialog */}
            <AddFolderDialog />
        </div>
    );
}
