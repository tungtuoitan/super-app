/**
 * ActivityBar UI Context
 * Minimal UI state management for ActivityBar component
 * Server state is handled by React Query hooks
 * Navigation is handled by NavigationContext
 */

import React, { useContext, createContext, Dispatch, SetStateAction, useState } from "react";
import { storageService } from "@/shared";
import { shellConstants } from "../shell.constants";

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
    /** Homepage covering the workbench (desktop). Open at startup; the logo toggles it. */
    isHomeOpen: boolean;
    setIsHomeOpen: Dispatch<SetStateAction<boolean>>;
    /** Id of the last console message the user has seen (bottom panel Console tab) */
    consoleSeenId: string | null;
    setConsoleSeenId: Dispatch<SetStateAction<string | null>>;
    /** Panel tab to switch to on next render (e.g. "console" when opened with unread errors) */
    panelTabRequest: string | null;
    setPanelTabRequest: Dispatch<SetStateAction<string | null>>;
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
    isHomeOpen: false,
    setIsHomeOpen: () => {},
    consoleSeenId: null,
    setConsoleSeenId: () => {},
    panelTabRequest: null,
    setPanelTabRequest: () => {},
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
    // Bottom panel: collapsed by default, remembered across sessions (#1514)
    const [isPanelVisible, setPanelVisibleState] = useState<boolean>(() => storageService.get<boolean>(shellConstants.storage.panelVisible) ?? false);
    const setIsPanelVisible: Dispatch<SetStateAction<boolean>> = (value) =>
        setPanelVisibleState((prev) => {
            const next = typeof value === "function" ? value(prev) : value;
            storageService.set(shellConstants.storage.panelVisible, next);
            return next;
        });
    const [isHomeOpen, setIsHomeOpen] = useState(true);
    const [consoleSeenId, setConsoleSeenId] = useState<string | null>(null);
    const [panelTabRequest, setPanelTabRequest] = useState<string | null>(null);

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
                isHomeOpen,
                setIsHomeOpen,
                consoleSeenId,
                setConsoleSeenId,
                panelTabRequest,
                setPanelTabRequest,
            }}
        >
            {children}
        </ActivityBarContext.Provider>
    );
};
