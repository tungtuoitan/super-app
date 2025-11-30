/**
 * Tree Expansion Helper Hook
 * Handles tree node expand/collapse operations
 * 
 * @pattern Functions only - State should be accessed directly from useExplorerStore()
 * @returns {Object} Expansion action functions only (no state)
 */

import { useExplorerStore } from '@/store/explorer/ExplorerStore';

export const useTreeExpansion = () => {
    const {
        expandedNodes,
        setExpandedNodes,
        treeRef,
    } = useExplorerStore();

    /**
     * Toggle expand/collapse for a single node
     */
    const toggleNodeExpansion = (folderId: number) => {
        setExpandedNodes(prev => {
            const newSet = new Set(prev);
            if (newSet.has(folderId)) {
                newSet.delete(folderId);
            } else {
                newSet.add(folderId);
            }
            return newSet;
        });
    };

    /**
     * Expand a single node
     */
    const expandNode = (folderId: number) => {
        setExpandedNodes(prev => new Set(prev).add(folderId));
    };

    /**
     * Collapse a single node
     */
    const collapseNode = (folderId: number) => {
        setExpandedNodes(prev => {
            const newSet = new Set(prev);
            newSet.delete(folderId);
            return newSet;
        });
    };

    /**
     * Expand all nodes
     * TODO: This should accept all folder IDs dynamically
     */
    const expandAll = () => {
        // For now, expand first few levels
        setExpandedNodes(new Set([1, 2, 3, 4, 5, 6, 7, 8]));
    };

    /**
     * Collapse all nodes
     */
    const collapseAll = () => {
        setExpandedNodes(new Set());
    };

    /**
     * Collapse all nodes using tree ref (react-arborist API)
     */
    const handleCollapseAll = () => {
        console.log('📂 Collapse All clicked');
        if (treeRef && treeRef.current) {
            treeRef.current.closeAll();
        }
    };

    return {
        toggleNodeExpansion,
        expandNode,
        collapseNode,
        expandAll,
        collapseAll,
        handleCollapseAll,
    };
};
