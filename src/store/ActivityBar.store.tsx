/**
 * ActivityBar UI Context
 * Minimal UI state management for ActivityBar component
 * Server state is handled by React Query hooks
 * Navigation is handled by NavigationContext
 */

import React, { useContext, createContext, Dispatch, SetStateAction, useState } from "react";

export interface ActivityBarContextData {
    // Dialog states
    settingsOpen: boolean;
    setSettingsOpen: Dispatch<SetStateAction<boolean>>;
    accountsOpen: boolean;
    setAccountsOpen: Dispatch<SetStateAction<boolean>>;

    // Layout states
    isSideBarVisible: boolean;
    setIsSideBarVisible: Dispatch<SetStateAction<boolean>>;
    isPanelVisible: boolean;
    setIsPanelVisible: Dispatch<SetStateAction<boolean>>;
}

export const activityBarContextDefaultValue: ActivityBarContextData = {
    // Dialog states
    settingsOpen: false,
    setSettingsOpen: () => {},
    accountsOpen: false,
    setAccountsOpen: () => {},

    // Layout states
    isSideBarVisible: true,
    setIsSideBarVisible: () => {},
    isPanelVisible: true,
    setIsPanelVisible: () => {},
};

const ActivityBarContext = createContext<ActivityBarContextData>(activityBarContextDefaultValue);

export const useActivityBarStore = () => {
    const ctx = useContext(ActivityBarContext);
    if (!ctx) {
        throw new Error("useActivityBarStore must be used within ActivityBarProvider");
    }
    return ctx;
};

export const ActivityBarProvider: React.FC<React.PropsWithChildren<unknown>> = ({ children }) => {
    // Dialog states
    const [settingsOpen, setSettingsOpen] = useState(false);
    const [accountsOpen, setAccountsOpen] = useState(false);

    // Layout states
    const [isSideBarVisible, setIsSideBarVisible] = useState(true);
    const [isPanelVisible, setIsPanelVisible] = useState(true);

    return (
        <ActivityBarContext.Provider
            value={{
                // Dialog states
                settingsOpen,
                setSettingsOpen,
                accountsOpen,
                setAccountsOpen,

                // Layout states
                isSideBarVisible,
                setIsSideBarVisible,
                isPanelVisible,
                setIsPanelVisible,
            }}
        >
            {children}
        </ActivityBarContext.Provider>
    );
};
