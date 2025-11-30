/**
 * Tag UI Store
 * React Context store for managing tag UI state
 * Pattern: Separate store from business logic (similar to EditorTabStore)
 */

import { useContext, createContext, Dispatch, SetStateAction, useState } from 'react';
import type { Folder as Tag, FolderLayoutType as TagLayoutType } from '@/types/folder.types';

export interface TagUIStoreData {
    // Selected tag state
    selectedTag: Tag | null;
    setSelectedTag: Dispatch<SetStateAction<Tag | null>>;
    isDialogOpen: boolean;
    setIsDialogOpen: Dispatch<SetStateAction<boolean>>;
    
    // Create dialog state
    isCreateDialogOpen: boolean;
    setIsCreateDialogOpen: Dispatch<SetStateAction<boolean>>;
    parentTagForCreate: Tag | null;
    setParentTagForCreate: Dispatch<SetStateAction<Tag | null>>;
    
    // Row selection state
    selectedRowIds: number[];
    setSelectedRowIds: Dispatch<SetStateAction<number[]>>;
    
    // Layout preferences
    currentLayout: TagLayoutType;
    setCurrentLayout: Dispatch<SetStateAction<TagLayoutType>>;
    
    // Tree state
    expandedNodes: Set<number>;
    setExpandedNodes: Dispatch<SetStateAction<Set<number>>>;
    
    // Filter state
    searchText: string;
    setSearchText: Dispatch<SetStateAction<string>>;
    showArchived: boolean;
    setShowArchived: Dispatch<SetStateAction<boolean>>;
    
    // Selection state (VS Code-like selection behavior)
    selectedTagIds: number[];
    setSelectedTagIds: Dispatch<SetStateAction<number[]>>;
    lastSelectedTagId: number | null;
    setLastSelectedTagId: Dispatch<SetStateAction<number | null>>;
}

export const tagUIStoreDefaultValue: TagUIStoreData = {
    selectedTag: null,
    setSelectedTag: () => {},
    isDialogOpen: false,
    setIsDialogOpen: () => {},
    isCreateDialogOpen: false,
    setIsCreateDialogOpen: () => {},
    parentTagForCreate: null,
    setParentTagForCreate: () => {},
    selectedRowIds: [],
    setSelectedRowIds: () => {},
    currentLayout: 'tree',
    setCurrentLayout: () => {},
    expandedNodes: new Set(),
    setExpandedNodes: () => {},
    searchText: '',
    setSearchText: () => {},
    showArchived: false,
    setShowArchived: () => {},
    selectedTagIds: [],
    setSelectedTagIds: () => {},
    lastSelectedTagId: null,
    setLastSelectedTagId: () => {},
};

export const TagUIStore = createContext<TagUIStoreData>(tagUIStoreDefaultValue);

export const useTagUIStore = () => useContext(TagUIStore);

export const TagUIStoreProvider: React.FC<React.PropsWithChildren<unknown>> = ({ children }) => {
    // Dialog state
    const [selectedTag, setSelectedTag] = useState<Tag | null>(null);
    const [isDialogOpen, setIsDialogOpen] = useState<boolean>(false);
    
    // Create dialog state
    const [isCreateDialogOpen, setIsCreateDialogOpen] = useState<boolean>(false);
    const [parentTagForCreate, setParentTagForCreate] = useState<Tag | null>(null);
    
    // Row selection state
    const [selectedRowIds, setSelectedRowIds] = useState<number[]>([]);
    
    // Layout state
    const [currentLayout, setCurrentLayout] = useState<TagLayoutType>('tree');
    
    // Tree expansion state
    const [expandedNodes, setExpandedNodes] = useState<Set<number>>(new Set());
    
    // Filter state
    const [searchText, setSearchText] = useState<string>('');
    const [showArchived, setShowArchived] = useState<boolean>(false);
    
    // Selection state (VS Code-like)
    const [selectedTagIds, setSelectedTagIds] = useState<number[]>([]);
    const [lastSelectedTagId, setLastSelectedTagId] = useState<number | null>(null);

    return (
        <TagUIStore.Provider
            value={{
                selectedTag,
                setSelectedTag,
                isDialogOpen,
                setIsDialogOpen,
                isCreateDialogOpen,
                setIsCreateDialogOpen,
                parentTagForCreate,
                setParentTagForCreate,
                selectedRowIds,
                setSelectedRowIds,
                currentLayout,
                setCurrentLayout,
                expandedNodes,
                setExpandedNodes,
                searchText,
                setSearchText,
                showArchived,
                setShowArchived,
                selectedTagIds,
                setSelectedTagIds,
                lastSelectedTagId,
                setLastSelectedTagId,
            }}
        >
            {children}
        </TagUIStore.Provider>
    );
};
