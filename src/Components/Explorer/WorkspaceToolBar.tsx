import React from 'react';
import { Plus, RefreshCw, ChevronsUp } from 'lucide-react';
import { useExplorerStore } from '@/store/index';
import { useTreeOperation } from '@/hooks/explorer/useTreeOperation.helper';
import { useTreeExpansion } from '@/hooks/explorer/useTreeExpansion.helper';
import { useWorkspaceOperation } from '@/hooks/explorer/useWorkspaceOperation.helper';
import { TreeFolder } from '@/hooks/explorer/tree.helper';

interface WorkspaceToolBarProps {
    treeData: TreeFolder[];
}

export function WorkspaceToolBar({ treeData }: WorkspaceToolBarProps) {
    const { currentTree } = useExplorerStore();
    const { handleNewFolder } = useTreeOperation();
    const { handleCollapseAll } = useTreeExpansion();
    const { loadTree } = useWorkspaceOperation();

    return (
        <div className="flex items-center px-4 py-2">
            <div className="flex-1 text-sm font-semibold text-editor-fg text-left uppercase tracking-wide">
                {currentTree?.name || 'Workspace'}
            </div>
            
            <div className="flex gap-0.5 ml-auto opacity-70 hover:opacity-100 transition-opacity">
                <button
                    title="Add Folder"
                    onClick={(e) => {
                        e.stopPropagation();
                        handleNewFolder(treeData);
                    }}
                    className="p-1 text-editor-fg hover:bg-editor-hover rounded"
                >
                    <Plus className="w-4 h-4" />
                </button>

                <button
                    title="Refresh"
                    onClick={(e) => {
                        e.stopPropagation();
                        if (currentTree?.workspaceId) {
                            loadTree(currentTree.workspaceId);
                        }
                    }}
                    className="p-1 text-editor-fg hover:bg-editor-hover rounded"
                >
                    <RefreshCw className="w-4 h-4" />
                </button>

                <button
                    title="Collapse All"
                    onClick={(e) => {
                        e.stopPropagation();
                        handleCollapseAll();
                    }}
                    className="p-1 text-editor-fg hover:bg-editor-hover rounded"
                >
                    <ChevronsUp className="w-4 h-4" />
                </button>
            </div>
        </div>
    );
}
