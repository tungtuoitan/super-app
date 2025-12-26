/**
 * Editor Toolbar Context
 * Centralized state management for editor toolbar actions
 * Manages loading states for save/undo operations
 */

import { useContext, createContext, Dispatch, SetStateAction, useState } from "react";

export interface EditorToolbarContextData {
    // Loading states for toolbar actions
    isSaving: boolean;
    setIsSaving: Dispatch<SetStateAction<boolean>>;
}

export const editorToolbarContextDefaultValue: EditorToolbarContextData = {
    isSaving: false,
    setIsSaving: () => {},
};

export const EditorToolbarStore = createContext<EditorToolbarContextData>(editorToolbarContextDefaultValue);

export const EditorToolbarProvider: React.FC<React.PropsWithChildren<unknown>> = ({ children }) => {
    const [isSaving, setIsSaving] = useState<boolean>(false);

    return (
        <EditorToolbarStore.Provider
            value={{
                isSaving,
                setIsSaving,
            }}
        >
            {children}
        </EditorToolbarStore.Provider>
    );
};

export function useEditorToolbarStore(): EditorToolbarContextData {
    const ctx = useContext(EditorToolbarStore);
    if (!ctx) {
        throw new Error("useEditorToolbarStore requires EditorToolbarProvider");
    }
    return ctx;
}
