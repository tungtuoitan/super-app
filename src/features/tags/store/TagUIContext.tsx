/**
 * Tag UI Context - Feature UI state management
 * Manages tag-specific UI state like selected tag, dialog state, layout preferences, etc.
 * Following the centralized provider pattern - this will be added to Main.tsx
 */

import { createContext, useContext, useState, useCallback } from 'react';
import type { Tag, TagLayoutType } from '../types/tag.types';

interface TagUIContextValue {
    // Selected tag state
    selectedTag: Tag | null;
    isDialogOpen: boolean;
    openDialog: (tag: Tag) => void;
    closeDialog: () => void;
    updateSelectedTag: (tag: Tag) => void;
    
    // Row selection state
    selectedRowIds: number[];
    setSelectedRowIds: (ids: number[]) => void;
    
    // Layout preferences
    currentLayout: TagLayoutType;
    setCurrentLayout: (layout: TagLayoutType) => void;
    
    // Tree state
    expandedNodes: Set<number>;
    toggleNodeExpansion: (tagId: number) => void;
    expandNode: (tagId: number) => void;
    collapseNode: (tagId: number) => void;
    expandAll: () => void;
    collapseAll: () => void;
    
    // Filter state  
    searchText: string;
    setSearchText: (text: string) => void;
    showArchived: boolean;
    setShowArchived: (show: boolean) => void;
    
    // Selection state (for bulk operations)
    selectedTagIds: Set<number>;
    toggleTagSelection: (tagId: number) => void;
    selectAllTags: (tagIds: number[]) => void;
    clearSelection: () => void;
    isTagSelected: (tagId: number) => boolean;
}

const TagUIContext = createContext<TagUIContextValue | null>(null);

export function TagUIProvider({ children }: { children: React.ReactNode }) {
    // Dialog state
    const [selectedTag, setSelectedTag] = useState<Tag | null>(null);
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    
    // Layout state
    const [currentLayout, setCurrentLayout] = useState<TagLayoutType>('tree');
    
    // Tree expansion state
    const [expandedNodes, setExpandedNodes] = useState<Set<number>>(new Set());
    
    // Filter state
    const [searchText, setSearchText] = useState('');
    const [showArchived, setShowArchived] = useState(false);
    
    // Selection state
    const [selectedTagIds, setSelectedTagIds] = useState<Set<number>>(new Set());
    const [selectedRowIds, setSelectedRowIds] = useState<number[]>([]);

    // Dialog actions
    const openDialog = useCallback((tag: Tag) => {
        setSelectedTag(tag);
        setIsDialogOpen(true);
    }, []);

    const closeDialog = useCallback(() => {
        setIsDialogOpen(false);
        setTimeout(() => setSelectedTag(null), 200); // After animation
    }, []);

    const updateSelectedTag = useCallback((tag: Tag) => {
        setSelectedTag(tag);
    }, []);

    // Tree expansion actions
    const toggleNodeExpansion = useCallback((tagId: number) => {
        setExpandedNodes(prev => {
            const newSet = new Set(prev);
            if (newSet.has(tagId)) {
                newSet.delete(tagId);
            } else {
                newSet.add(tagId);
            }
            return newSet;
        });
    }, []);

    const expandNode = useCallback((tagId: number) => {
        setExpandedNodes(prev => new Set(prev).add(tagId));
    }, []);

    const collapseNode = useCallback((tagId: number) => {
        setExpandedNodes(prev => {
            const newSet = new Set(prev);
            newSet.delete(tagId);
            return newSet;
        });
    }, []);

    const expandAll = useCallback(() => {
        // This would need to be called with all tag IDs
        // For now, we'll just expand first few levels
        setExpandedNodes(new Set([1, 2, 3, 4, 5, 6, 7, 8]));
    }, []);

    const collapseAll = useCallback(() => {
        setExpandedNodes(new Set());
    }, []);

    // Selection actions
    const toggleTagSelection = useCallback((tagId: number) => {
        setSelectedTagIds(prev => {
            const newSet = new Set(prev);
            if (newSet.has(tagId)) {
                newSet.delete(tagId);
            } else {
                newSet.add(tagId);
            }
            return newSet;
        });
    }, []);

    const selectAllTags = useCallback((tagIds: number[]) => {
        setSelectedTagIds(new Set(tagIds));
    }, []);

    const clearSelection = useCallback(() => {
        setSelectedTagIds(new Set());
    }, []);

    const isTagSelected = useCallback((tagId: number) => {
        return selectedTagIds.has(tagId);
    }, [selectedTagIds]);

    const value: TagUIContextValue = {
        // Dialog state
        selectedTag,
        isDialogOpen,
        openDialog,
        closeDialog,
        updateSelectedTag,
        
        // Row selection state
        selectedRowIds,
        setSelectedRowIds,
        
        // Layout state
        currentLayout,
        setCurrentLayout,
        
        // Tree state
        expandedNodes,
        toggleNodeExpansion,
        expandNode,
        collapseNode,
        expandAll,
        collapseAll,
        
        // Filter state
        searchText,
        setSearchText,
        showArchived,
        setShowArchived,
        
        // Selection state
        selectedTagIds,
        toggleTagSelection,
        selectAllTags,
        clearSelection,
        isTagSelected,
    };

    return (
        <TagUIContext.Provider value={value}>
            {children}
        </TagUIContext.Provider>
    );
}

export function useTagUI(): TagUIContextValue {
    const context = useContext(TagUIContext);
    if (!context) {
        throw new Error('useTagUI must be used within TagUIProvider');
    }
    return context;
}