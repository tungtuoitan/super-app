/**
 * Context Menu Store
 * React Context store for managing context menu state
 * Pattern: Separate store from business logic (similar to EditorTabBarStore)
 */

import { useContext, createContext, Dispatch, SetStateAction, useState } from "react";
import { constants } from "@/shared";

export interface ContextMenuPosition {
    x: number;
    y: number;
}

export type OrchestratorContextMenuType = (typeof constants.contextMenu.contextMenuTypes)[keyof typeof constants.contextMenu.contextMenuTypes];

export interface OrchestratorContextMenuStoreData {
    // Menu state
    isContextMenuOpen: boolean;
    setIsContextMenuOpen: Dispatch<SetStateAction<boolean>>;
    anchorPoint: ContextMenuPosition;
    setAnchorPoint: Dispatch<SetStateAction<ContextMenuPosition>>;
    contextType: OrchestratorContextMenuType;
    setContextType: Dispatch<SetStateAction<OrchestratorContextMenuType>>;
    contextData: unknown;
    setContextData: Dispatch<SetStateAction<unknown>>;

    // Edit dialog state
    isEditDialogOpen: boolean;
    setIsEditDialogOpen: Dispatch<SetStateAction<boolean>>;
    editItemData: unknown;
    setEditItemData: Dispatch<SetStateAction<unknown>>;

    // Note dialog state
    isNoteDialogOpen: boolean;
    setIsNoteDialogOpen: Dispatch<SetStateAction<boolean>>;
    noteDialogParentFolder: unknown;
    setNoteDialogParentFolder: Dispatch<SetStateAction<unknown>>;
}

export const contextMenuStoreDefaultValue: OrchestratorContextMenuStoreData = {
    isContextMenuOpen: false,
    setIsContextMenuOpen: () => {},
    anchorPoint: { x: 0, y: 0 },
    setAnchorPoint: () => {},
    contextType: "default",
    setContextType: () => {},
    contextData: null,
    setContextData: () => {},
    isEditDialogOpen: false,
    setIsEditDialogOpen: () => {},
    editItemData: null,
    setEditItemData: () => {},
    isNoteDialogOpen: false,
    setIsNoteDialogOpen: () => {},
    noteDialogParentFolder: null,
    setNoteDialogParentFolder: () => {},
};

export const OrchestratorContextMenuStore = createContext<OrchestratorContextMenuStoreData>(contextMenuStoreDefaultValue);

export const useOrchestratorContextMenuStore = () => useContext(OrchestratorContextMenuStore);

export const OrchestratorContextMenuStoreProvider: React.FC<React.PropsWithChildren<unknown>> = ({ children }) => {
    const [isContextMenuOpen, setIsContextMenuOpen] = useState<boolean>(false);
    const [anchorPoint, setAnchorPoint] = useState<ContextMenuPosition>({ x: 0, y: 0 });
    const [contextType, setContextType] = useState<OrchestratorContextMenuType>(constants.contextMenu.contextMenuTypes.default);
    const [contextData, setContextData] = useState<unknown>(null);
    const [isEditDialogOpen, setIsEditDialogOpen] = useState<boolean>(false);
    const [editItemData, setEditItemData] = useState<unknown>(null);
    const [isNoteDialogOpen, setIsNoteDialogOpen] = useState<boolean>(false);
    const [noteDialogParentFolder, setNoteDialogParentFolder] = useState<unknown>(null);

    return (
        <OrchestratorContextMenuStore.Provider
            value={{
                isContextMenuOpen,
                setIsContextMenuOpen,
                anchorPoint,
                setAnchorPoint,
                contextType,
                setContextType,
                contextData,
                setContextData,
                isEditDialogOpen,
                setIsEditDialogOpen,
                editItemData,
                setEditItemData,
                isNoteDialogOpen,
                setIsNoteDialogOpen,
                noteDialogParentFolder,
                setNoteDialogParentFolder,
            }}
        >
            {children}
        </OrchestratorContextMenuStore.Provider>
    );
};
