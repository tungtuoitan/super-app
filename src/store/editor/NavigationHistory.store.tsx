/**
 * Navigation History Store
 * Minimal state management for navigation history
 * - Only stores historyStack and currentIndex
 * - Business logic in useNavigationHistory.helper.ts
 * - localStorage persistence handled in helper
 */

import { createContext, useContext, useState, Dispatch, SetStateAction } from "react";

/**
 * Scroll position for a specific DOM element
 */
export interface ScrollPosition {
    elementId: string;
    scrollTop: number;
    scrollLeft: number;
}

/**
 * Cursor/selection position in a textarea/input
 */
export interface CursorPosition {
    fieldId?: string; // e.g., "note-description-field", "note-name-field"
    selectionStart: number;
    selectionEnd: number;
}

/**
 * Single entry in navigation history
 */
export interface HistoryEntry {
    tabId: string;
    type: string; // e.g., 'note', 'file', 'folder'
    itemId: string;
    timestamp: number;
    // Optional position tracking
    scrollPositions?: ScrollPosition[];
    cursorPosition?: CursorPosition;
    focusedFieldId?: string; // ID of field that has focus
}

export interface NavigationHistoryContextData {
    // State - Past/Present/Future model
    past: HistoryEntry[]; // Stack of previous locations (for Back)
    setPast: Dispatch<SetStateAction<HistoryEntry[]>>;
    present: HistoryEntry | null; // Current location
    setPresent: Dispatch<SetStateAction<HistoryEntry | null>>;
    future: HistoryEntry[]; // Stack of forward locations (for Forward)
    setFuture: Dispatch<SetStateAction<HistoryEntry[]>>;
}

const navigationHistoryDefaultValue: NavigationHistoryContextData = {
    past: [],
    setPast: () => {},
    present: null,
    setPresent: () => {},
    future: [],
    setFuture: () => {},
};

export const NavigationHistoryStore = createContext<NavigationHistoryContextData>(navigationHistoryDefaultValue);

export const useNavigationHistoryStore = () => {
    const ctx = useContext(NavigationHistoryStore);
    if (!ctx) {
        throw new Error("useNavigationHistoryStore requires NavigationHistoryProvider");
    }
    return ctx;
};

export const NavigationHistoryProvider: React.FC<React.PropsWithChildren<{  }>> = ({ children }) => {
    const [past, setPast] = useState<HistoryEntry[]>([]);
    const [present, setPresent] = useState<HistoryEntry | null>(null);
    const [future, setFuture] = useState<HistoryEntry[]>([]);

    return (
        <NavigationHistoryStore.Provider
            value={{
                past,
                setPast,
                present,
                setPresent,
                future,
                setFuture,
            }}
        >
            {children}
        </NavigationHistoryStore.Provider>
    );
};
