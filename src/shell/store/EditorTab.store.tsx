/**
 * Editor Tab Context
 * Centralized state management for all editor tabs
 * Supports multiple tab types: Note, etc.
 */

import { useContext, createContext, Dispatch, SetStateAction, useState, useCallback, RefObject, useRef, MutableRefObject } from "react";
import type { BaseTab, TabViewState } from "../types/tab.types";

export interface EditorTabBarContextData {
    openTabs: BaseTab[];
    setOpenTabs: Dispatch<SetStateAction<BaseTab[]>>;
    activeTabId: string | null;
    setActiveTabId: Dispatch<SetStateAction<string | null>>;
    confirmCloseTabId: string | null;
    setConfirmCloseTabId: Dispatch<SetStateAction<string | null>>;
    isLoadingTabs: boolean;
    setIsLoadingTabs: Dispatch<SetStateAction<boolean>>;
    editorAreaRef?: RefObject<HTMLDivElement>;
    draggedTabId: string | null;
    setDraggedTabId: Dispatch<SetStateAction<string | null>>;
    dragOverTabId: string | null;
    setDragOverTabId: Dispatch<SetStateAction<string | null>>;
    dragOverPosition: "left" | "right" | null;
    setDragOverPosition: Dispatch<SetStateAction<"left" | "right" | null>>;
    dragCounterRef: MutableRefObject<number>;
    isLoadingTab: boolean;
    setIsLoadingTab: Dispatch<SetStateAction<boolean>>;
    isSaving: boolean;
    setIsSaving: Dispatch<SetStateAction<boolean>>;
}

export const editorTabBarContextDefaultValue: EditorTabBarContextData = {
    openTabs: [],
    setOpenTabs: () => {},
    activeTabId: null,
    setActiveTabId: () => {},
    confirmCloseTabId: null,
    setConfirmCloseTabId: () => {},
    isLoadingTabs: false,
    setIsLoadingTabs: () => {},
    editorAreaRef: undefined,
    draggedTabId: null,
    setDraggedTabId: () => {},
    dragOverTabId: null,
    setDragOverTabId: () => {},
    dragOverPosition: null,
    setDragOverPosition: () => {},
    dragCounterRef: { current: 0 },
    isLoadingTab: false,
    setIsLoadingTab: () => {},
    isSaving: false,
    setIsSaving: () => {}

};

export const EditorTabBarStore = createContext<EditorTabBarContextData>(editorTabBarContextDefaultValue);

export const useEditorTabBarStore = () => useContext(EditorTabBarStore);

export const EditorTabBarProvider: React.FC<React.PropsWithChildren<unknown>> = ({ children }) => {
    const [openTabs, setOpenTabs] = useState<BaseTab[]>([]);
    const [activeTabId, setActiveTabId] = useState<string | null>(null);
    const [confirmCloseTabId, setConfirmCloseTabId] = useState<string | null>(null);
    const [isLoadingTabs, setIsLoadingTabs] = useState<boolean>(false);
    const editorAreaRef = useRef<HTMLDivElement>(null);
    const [draggedTabId, setDraggedTabId] = useState<string | null>(null);
    const [dragOverTabId, setDragOverTabId] = useState<string | null>(null);
    const [dragOverPosition, setDragOverPosition] = useState<"left" | "right" | null>(null);
    const dragCounterRef = useRef(0);
    const [isLoadingTab, setIsLoadingTab] = useState<boolean>(false);
    const [isSaving, setIsSaving] = useState<boolean>(false);

    return (
        <EditorTabBarStore.Provider
            value={{
                openTabs,
                setOpenTabs,
                activeTabId,
                setActiveTabId,
                confirmCloseTabId,
                setConfirmCloseTabId,
                isLoadingTabs,
                setIsLoadingTabs,
                editorAreaRef,
                draggedTabId,
                setDraggedTabId,
                dragOverTabId,
                setDragOverTabId,
                dragOverPosition,
                setDragOverPosition,
                dragCounterRef,
                isLoadingTab,
                setIsLoadingTab,
                isSaving,
                setIsSaving

            }}
        >
            {children}
        </EditorTabBarStore.Provider>
    );
};
