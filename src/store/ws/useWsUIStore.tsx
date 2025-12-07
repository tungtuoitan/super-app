/**
 * Workspace UI Store
 * State management for workspace UI interactions (similar to NoteUIStore)
 */

import { useContext, createContext, Dispatch, SetStateAction, useState, useRef } from 'react';
import { Ws } from './useWsListStore';

export interface WsUIContextData {
    selectedWorkspace: Ws | null;
    setSelectedWorkspace: Dispatch<SetStateAction<Ws | null>>;
    isDialogOpen: boolean;
    setIsDialogOpen: Dispatch<SetStateAction<boolean>>;
    hasUnsavedChanges: boolean;
    setHasUnsavedChanges: Dispatch<SetStateAction<boolean>>;
    originalWsRef: React.MutableRefObject<Ws | null>;
}

export const wsUIContextDefaultValue: WsUIContextData = {
    selectedWorkspace: null,
    setSelectedWorkspace: () => {},
    isDialogOpen: false,
    setIsDialogOpen: () => {},
    hasUnsavedChanges: false,
    setHasUnsavedChanges: () => {},
    originalWsRef: { current: null },
};

export const WsUIStore = createContext<WsUIContextData>(wsUIContextDefaultValue);

export const useWsUIStore = () => useContext(WsUIStore);

export const WsUIProvider: React.FC<React.PropsWithChildren<unknown>> = ({ children }) => {
    const [selectedWorkspace, setSelectedWorkspace] = useState<Ws | null>(null);
    const [isDialogOpen, setIsDialogOpen] = useState<boolean>(false);
    const [hasUnsavedChanges, setHasUnsavedChanges] = useState<boolean>(false);
    const originalWsRef = useRef<Ws | null>(null);

    return (
        <WsUIStore.Provider
            value={{
                selectedWorkspace,
                setSelectedWorkspace,
                isDialogOpen,
                setIsDialogOpen,
                hasUnsavedChanges,
                setHasUnsavedChanges,
                originalWsRef,
            }}
        >
            {children}
        </WsUIStore.Provider>
    );
};
