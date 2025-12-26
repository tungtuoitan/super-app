/**
 * Workspace UI Store
 * State management for workspace UI interactions (similar to NoteUIStore)
 */

import { useContext, createContext, Dispatch, SetStateAction, useState, useRef } from "react";
import { Ws } from "./useWs.store";

export interface WsDetailContextData {
    selectedWorkspace: Ws | null;
    setSelectedWorkspace: Dispatch<SetStateAction<Ws | null>>;
    wsHasChanges: boolean;
    setWsHasChanges: Dispatch<SetStateAction<boolean>>;
    originalWsRef: React.MutableRefObject<Ws | null>;
    wsNameRef: React.RefObject<HTMLInputElement>;
}

export const wsDetailContextDefaultValue: WsDetailContextData = {
    selectedWorkspace: null,
    setSelectedWorkspace: () => {},
    wsHasChanges: false,
    setWsHasChanges: () => {},
    originalWsRef: { current: null },
    wsNameRef: { current: null },
};

export const WsDetailStore = createContext<WsDetailContextData>(wsDetailContextDefaultValue);

export const useWsDetailStore = () => useContext(WsDetailStore);

export const WsDetailProvider: React.FC<React.PropsWithChildren<unknown>> = ({ children }) => {
    const [selectedWorkspace, setSelectedWorkspace] = useState<Ws | null>(null);
    const [wsHasChanges, setWsHasChanges] = useState<boolean>(false);
    const originalWsRef = useRef<Ws | null>(null);
    const wsNameRef = useRef<HTMLInputElement>(null);

    return (
        <WsDetailStore.Provider
            value={{
                selectedWorkspace,
                setSelectedWorkspace,
                wsHasChanges,
                setWsHasChanges,
                originalWsRef,
                wsNameRef,
            }}
        >
            {children}
        </WsDetailStore.Provider>
    );
};
