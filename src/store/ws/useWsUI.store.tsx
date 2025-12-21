/**
 * Workspace UI Store
 * State management for workspace UI interactions (similar to NoteUIStore)
 */

import { useContext, createContext, Dispatch, SetStateAction, useState, useRef } from 'react';
import { Ws } from './useWsList.store';

export interface WsUIContextData {
    selectedWorkspace: Ws | null;
    setSelectedWorkspace: Dispatch<SetStateAction<Ws | null>>;
    isDialogOpen: boolean;
    setIsDialogOpen: Dispatch<SetStateAction<boolean>>;
    wsHasChanges: boolean;
    setWsHasChanges: Dispatch<SetStateAction<boolean>>;
    originalWsRef: React.MutableRefObject<Ws | null>;
}

export const wsUIContextDefaultValue: WsUIContextData = {
    selectedWorkspace: null,
    setSelectedWorkspace: () => {},
    isDialogOpen: false,
    setIsDialogOpen: () => {},
    wsHasChanges: false,
    setWsHasChanges: () => {},
    originalWsRef: { current: null },
};

export const WsUIStore = createContext<WsUIContextData>(wsUIContextDefaultValue);

export const useWsUIStore = () => useContext(WsUIStore);

export const WsUIProvider: React.FC<React.PropsWithChildren<unknown>> = ({ children }) => {
    const [selectedWorkspace, setSelectedWorkspace] = useState<Ws | null>(null);
    const [isDialogOpen, setIsDialogOpen] = useState<boolean>(false);
    const [wsHasChanges, setWsHasChanges] = useState<boolean>(false);
    const originalWsRef = useRef<Ws | null>(null);

    return (
        <WsUIStore.Provider
            value={{
                selectedWorkspace,
                setSelectedWorkspace,
                isDialogOpen,
                setIsDialogOpen,
                wsHasChanges,
                setWsHasChanges,
                originalWsRef,
            }}
        >
            {children}
        </WsUIStore.Provider>
    );
};
