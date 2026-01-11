/**
 * Workspace UI Context
 * Minimal UI state management for workspace feature
 * Server state is handled by React Query hooks
 * Tab management is handled by WorkspaceTabStore
 */

import { Ws } from "@/types/workspace.types";
import React, { useContext, createContext, Dispatch, SetStateAction, useState, useRef } from "react";

export interface WsDetailContextData {
    // Dialog state
    originalWsRef: React.MutableRefObject<Ws | null>;

    // Container refs
    wsNameRef: React.RefObject<HTMLInputElement>;

    // Focus state
    shouldFocusWsName: boolean;
    setShouldFocusWsName: Dispatch<SetStateAction<boolean>>;

    // Validation state
    nameError: string;
    setNameError: Dispatch<SetStateAction<string>>;
}

export const wsDetailContextDefaultValue: WsDetailContextData = {
    // Dialog state
    originalWsRef: { current: null },

    // Container refs
    wsNameRef: { current: null },

    // Focus state
    shouldFocusWsName: false,
    setShouldFocusWsName: () => {},

    // Validation state
    nameError: "",
    setNameError: () => {},
};

const WsDetailContext = createContext<WsDetailContextData>(wsDetailContextDefaultValue);

export const useWsDetailStore = () => useContext(WsDetailContext);

export const WsDetailProvider: React.FC<React.PropsWithChildren<unknown>> = ({ children }) => {
    // Container refs
    const wsNameRef = useRef<HTMLInputElement>(null);
    const originalWsRef = useRef<Ws | null>(null);

    // Focus state
    const [shouldFocusWsName, setShouldFocusWsName] = useState(false);

    // Validation state
    const [nameError, setNameError] = useState("");

    return (
        <WsDetailContext.Provider
            value={{
                // Dialog state
                originalWsRef,

                // Container refs
                wsNameRef,

                // Focus state
                shouldFocusWsName,
                setShouldFocusWsName,

                // Validation state
                nameError,
                setNameError,
            }}
        >
            {children}
        </WsDetailContext.Provider>
    );
};
