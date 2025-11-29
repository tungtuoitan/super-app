/**
 * Editor Tab Context
 * Centralized state management for all editor tabs
 * Supports multiple tab types: Note, Tag, etc.
 */

import { useContext, createContext, Dispatch, SetStateAction, useState } from 'react';
import type { EditorTab } from '../../types/editor/tab.types';

export interface EditorTabContextData {
    openTabs: EditorTab[];
    setOpenTabs: Dispatch<SetStateAction<EditorTab[]>>;
    activeTabId: string | null;
    setActiveTabId: Dispatch<SetStateAction<string | null>>;
    confirmCloseTabId: string | null;
    setConfirmCloseTabId: Dispatch<SetStateAction<string | null>>;
}

export const editorTabContextDefaultValue: EditorTabContextData = {
    openTabs: [],
    setOpenTabs: () => {},
    activeTabId: null,
    setActiveTabId: () => {},
    confirmCloseTabId: null,
    setConfirmCloseTabId: () => {},
};

export const EditorTabStore = createContext<EditorTabContextData>(editorTabContextDefaultValue);

export const useEditorTabsStore = () => useContext(EditorTabStore);

export const EditorTabProvider: React.FC<React.PropsWithChildren<unknown>> = ({ children }) => {
    const [openTabs, setOpenTabs] = useState<EditorTab[]>([]);
    const [activeTabId, setActiveTabId] = useState<string | null>(null);
    const [confirmCloseTabId, setConfirmCloseTabId] = useState<string | null>(null);

    return (
        <EditorTabStore.Provider
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
        </EditorTabStore.Provider>
    );
}
