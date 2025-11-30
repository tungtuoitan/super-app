/**
 * Folder UI Store
 * React Context store for managing folder UI state
 * Pattern: Separate store from business logic (similar to EditorTabStore)
 */

import { useContext, createContext, Dispatch, SetStateAction, useState } from 'react';
import type { Folder, FolderLayoutType } from '@/types/folder.types';

export interface FolderUIStoreData {
    // Selected folder state
    selectedFolder: Folder | null;
    setSelectedFolder: Dispatch<SetStateAction<Folder | null>>;
    isDialogOpen: boolean;
    setIsDialogOpen: Dispatch<SetStateAction<boolean>>;
    
    // Create dialog state
    isCreateDialogOpen: boolean;
    setIsCreateDialogOpen: Dispatch<SetStateAction<boolean>>;
    parentFolderForCreate: Folder | null;
    setParentFolderForCreate: Dispatch<SetStateAction<Folder | null>>;
    
    // Row selection state
    selectedRowIds: number[];
    setSelectedRowIds: Dispatch<SetStateAction<number[]>>;
    
    // Layout preferences
    currentLayout: FolderLayoutType;
    setCurrentLayout: Dispatch<SetStateAction<FolderLayoutType>>;
    
    // Tree state
    expandedNodes: Set<number>;
    setExpandedNodes: Dispatch<SetStateAction<Set<number>>>;
    
    // Filter state
    searchText: string;
    setSearchText: Dispatch<SetStateAction<string>>;
    showArchived: boolean;
    setShowArchived: Dispatch<SetStateAction<boolean>>;
    
    // Selection state (VS Code-like selection behavior)
    selectedFolderIds: number[];
    setSelectedFolderIds: Dispatch<SetStateAction<number[]>>;
    lastSelectedFolderId: number | null;
    setLastSelectedFolderId: Dispatch<SetStateAction<number | null>>;
    
    // Drag state
    isDragging: boolean;
    setIsDragging: Dispatch<SetStateAction<boolean>>;
}

export const folderUIStoreDefaultValue: FolderUIStoreData = {
    selectedFolder: null,
    setSelectedFolder: () => {},
    isDialogOpen: false,
    setIsDialogOpen: () => {},
    isCreateDialogOpen: false,
    setIsCreateDialogOpen: () => {},
    parentFolderForCreate: null,
    setParentFolderForCreate: () => {},
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
    selectedFolderIds: [],
    setSelectedFolderIds: () => {},
    lastSelectedFolderId: null,
    setLastSelectedFolderId: () => {},
    isDragging: false,
    setIsDragging: () => {},
};

export const FolderStore = createContext<FolderUIStoreData>(folderUIStoreDefaultValue);

export const useFolderStore = () => useContext(FolderStore);

export const FolderUIStoreProvider: React.FC<React.PropsWithChildren<unknown>> = ({ children }) => {
    // Dialog state
    const [selectedFolder, setSelectedFolder] = useState<Folder | null>(null);
    const [isDialogOpen, setIsDialogOpen] = useState<boolean>(false);
    
    // Create dialog state
    const [isCreateDialogOpen, setIsCreateDialogOpen] = useState<boolean>(false);
    const [parentFolderForCreate, setParentFolderForCreate] = useState<Folder | null>(null);
    
    // Row selection state
    const [selectedRowIds, setSelectedRowIds] = useState<number[]>([]);
    
    // Layout state
    const [currentLayout, setCurrentLayout] = useState<FolderLayoutType>('tree');
    
    // Tree expansion state
    const [expandedNodes, setExpandedNodes] = useState<Set<number>>(new Set());
    
    // Filter state
    const [searchText, setSearchText] = useState<string>('');
    const [showArchived, setShowArchived] = useState<boolean>(false);
    
    // Selection state (VS Code-like)
    const [selectedFolderIds, setSelectedFolderIds] = useState<number[]>([]);
    const [lastSelectedFolderId, setLastSelectedFolderId] = useState<number | null>(null);
    
    // Drag state
    const [isDragging, setIsDragging] = useState<boolean>(false);

    return (
        <FolderStore.Provider
            value={{
                selectedFolder,
                setSelectedFolder,
                isDialogOpen,
                setIsDialogOpen,
                isCreateDialogOpen,
                setIsCreateDialogOpen,
                parentFolderForCreate,
                setParentFolderForCreate,
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
                selectedFolderIds,
                setSelectedFolderIds,
                lastSelectedFolderId,
                setLastSelectedFolderId,
                isDragging,
                setIsDragging,
            }}
        >
            {children}
        </FolderStore.Provider>
    );
};
