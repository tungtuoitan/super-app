/**
 * Note Tab Store
 * Centralized state management for note tabs
 */

import { useContext, createContext, Dispatch, SetStateAction, useState, useRef } from 'react';
import { Note } from '../../types/note.types';

export interface TabItem {
    id: string;
    noteId: number;
    title: string;
    note: Note;
    hasUnsavedChanges?: boolean;
}

export interface NoteTabContextData {
    openTabs: TabItem[];
    activeTabId: string | null;
    confirmCloseTabId: string | null;
    setOpenTabs: Dispatch<SetStateAction<TabItem[]>>;
    setActiveTabId: Dispatch<SetStateAction<string | null>>;
    setConfirmCloseTabId: Dispatch<SetStateAction<string | null>>;
}

export const noteTabContextDefaultValue: NoteTabContextData = {
    openTabs: [],
    activeTabId: null,
    confirmCloseTabId: null,
    setOpenTabs: () => {},
    setActiveTabId: () => {},
    setConfirmCloseTabId: () => {},
};

export const NoteTabStore = createContext<NoteTabContextData>(noteTabContextDefaultValue);

export const useNoteTabStore = () => useContext(NoteTabStore);

export const NoteTabProvider: React.FC<React.PropsWithChildren<unknown>> = ({ children }) => {
    const [openTabs, setOpenTabs] = useState<TabItem[]>([]);
    const [activeTabId, setActiveTabId] = useState<string | null>(null);
    const [confirmCloseTabId, setConfirmCloseTabId] = useState<string | null>(null);

    return (
        <NoteTabStore.Provider
            value={{
                openTabs,
                setOpenTabs,
                activeTabId,
                setActiveTabId,
                confirmCloseTabId,
                setConfirmCloseTabId,
            }}
        >
            {children}
        </NoteTabStore.Provider>
    );
};
