import React from 'react';
import { NodeApi } from 'react-arborist';
import {
    ChevronDown,
    ChevronRight,
    Layers,
    Plus,
    RefreshCw,
    ChevronsUp
} from 'lucide-react';
import { useExplorerStore } from '@/store/index';
import { useTreeOperation } from '@/hooks/explorer/useTreeOperation.helper';
import { useTreeExpansion } from '@/hooks/explorer/useTreeExpansion.helper';
import { useWorkspaceOperation } from '@/hooks/explorer/useWorkspaceOperation.helper';
import { TreeFolder } from '@/hooks/explorer/tree.helper';

interface RootFolderNodeProps {
    node: NodeApi<TreeFolder>;
    style: React.CSSProperties;
    treeData: TreeFolder[];
}

/**
 * Root Folder Node - Special node for workspace root with action buttons
 * Shows workspace name and provides quick actions: Add Folder, Refresh, Collapse All
 */
export function RootFolderNode({ node, style, treeData }: RootFolderNodeProps) {
    const { currentTree } = useExplorerStore();
    const { handleNewFolder } = useTreeOperation();
    const { handleCollapseAll } = useTreeExpansion();
    const { loadTree } = useWorkspaceOperation();

    const folder = node.data.data;
    const hasChildren = node.data.children && node.data.children.length > 0;

    return (
        <div
            style={{ ...style, paddingLeft: `${node.level * 8}px` }}
            onClick={(e) => {
                e.stopPropagation();
                e.preventDefault();
                if (hasChildren) {
                    node.toggle();
                }
            }}
            className="flex items-center h-full w-full py-1 pr-2 cursor-pointer rounded group hover:bg-editor-hover transition-colors"
        >
            {/* Expand/Collapse Button */}
            <button
                onClick={(e) => {
                    e.stopPropagation();
                    e.preventDefault();
                    node.toggle();
                }}
                className={`p-0.5 ${hasChildren ? 'visible' : 'invisible'} text-editor-fg`}
            >
                {hasChildren ? (
                    node.isOpen ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />
                ) : null}
            </button>

            {/* Workspace Icon */}
            <div className="mr-2 flex items-center">
                <Layers
                    className="w-4 h-4"
                    style={{ color: folder.color || '#75beff' }}
                />
            </div>

            {/* Workspace Name */}
            <div className="flex-1 min-w-0 flex items-center gap-2">
                <span className="text-sm font-semibold uppercase tracking-wide text-editor-fg truncate">
                    {folder.name}
                </span>
            </div>

            {/* Action Buttons - Hidden by default, shown on hover */}
            <div className="flex gap-0.5 opacity-0 group-hover:opacity-70 hover:opacity-100 transition-opacity">
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
