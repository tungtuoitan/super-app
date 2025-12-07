
import React, { useEffect, useMemo } from 'react';
import { Tree, NodeApi } from 'react-arborist';
import { useDragDropManager } from 'react-dnd';
import {
    Loader2
} from 'lucide-react';
import { useExplorerStore } from '@/store/index';
import { useTreeSelection } from '@/hooks/explorer/useTreeSelection.helper';
import { useTreeOperation } from '@/hooks/explorer/useTreeOperation.helper';
import {CustomDragPreview} from './CustomDragPreview';
import {FolderNode} from './FolderNode';
import {RootFolderNode} from './RootFolderNode';
import {getAllVisibleFolderIds, transformToTreeData, TreeFolder} from '@/hooks/explorer/tree.helper';
import {FolderDialog} from './FolderDialog/FolderDialog';

export function WorkspaceTree() {
    const {
        searchText,
        isDragging,
        setTreeRef,
        currentTree,
    } = useExplorerStore();

    const {
        handleSelectionChange,
        handleKeyDown,
    } = useTreeSelection();

    const {
        handleMove,
    } = useTreeOperation();


    const treeContainerRef = React.useRef<HTMLDivElement>(null);
    const treeRef = React.useRef<any>(null);
    const manager = useDragDropManager();
    
    // Store treeRef in context for global access
    useEffect(() => {
        setTreeRef(treeRef);
        return () => setTreeRef(null);
    }, [setTreeRef]);

    // Transform workspace data to tree format
    // Handles: extract folders → filter by search → wrap in workspace root → convert to TreeFolder
    const treeData = useMemo(() => {
        return transformToTreeData(currentTree, searchText);
    }, [currentTree, searchText]);

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


    return (
        <>
            <div
                ref={treeContainerRef}
                data-workspace-tree
                tabIndex={0}
                className="h-full flex flex-col p-4 pt-0 relative focus:outline-none focus-within:bg-editor-hover/30 transition-colors overflow-auto"
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
                    // Check if this is the workspace root node
                    const isWorkspaceRoot = node.data.data.id < 0;
                    
                    // Wrap in div to ensure native DOM element for DnD
                    return (
                        <div style={style}>
                            {isWorkspaceRoot ? (
                                <RootFolderNode
                                    node={node}
                                    style={{ height: '100%' }}
                                    treeData={treeData}
                                />
                            ) : (
                                <FolderNode
                                    node={node}
                                    style={{ height: '100%' }}
                                    dragHandle={dragHandle}
                                    treeData={treeData}
                                />
                            )}
                        </div>
                    );
                }}
            </Tree>


        </div>
        </>
    );
}
