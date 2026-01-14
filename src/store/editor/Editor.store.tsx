/**
 * Editor Loading Store
 * Manages loading state when switching tabs
 */

import { createContext, useContext, useState, Dispatch, SetStateAction } from "react";

export interface EditorContextData {
    isLoadingTab: boolean;
    setIsLoadingTab: Dispatch<SetStateAction<boolean>>;
}

const editorDefaultValue: EditorContextData = {
    isLoadingTab: false,
    setIsLoadingTab: () => {},
};

export const EditorStore = createContext<EditorContextData>(editorDefaultValue);

export const useEditorStore = () => {
    const ctx = useContext(EditorStore);
    if (!ctx) {
        throw new Error("useEditorStore requires EditorProvider");
    }
    return ctx;
};

export const EditorProvider: React.FC<React.PropsWithChildren<{}>> = ({ children }) => {
    const [isLoadingTab, setIsLoadingTab] = useState<boolean>(false);

    return (
        <EditorStore.Provider
            value={{
                isLoadingTab,
                setIsLoadingTab,
            }}
        >
            {children}
        </EditorStore.Provider>
    );
};
