import React, { createContext, Dispatch, SetStateAction, useContext, useState } from "react";

/**
 * NoteGridPopup Store - Manages state for "Add Existing Note" dialog
 */

export interface NoteGridPopupContextData {
    // Dialog state
    isNoteGridPopupOpen: boolean;
    setIsNoteGridPopupOpen: Dispatch<SetStateAction<boolean>>;

    // Target folder info
    targetFolder: {
        id: number; // workspace_items.id
        name: string;
        entityId: number; // folder entity ID
    } | null;
    setTargetFolder: Dispatch<SetStateAction<{
        id: number;
        name: string;
        entityId: number;
    } | null>>;

    // Loading states
    isSubmitting: boolean;
    setIsSubmitting: Dispatch<SetStateAction<boolean>>;
}

const noteGridPopupContextDefaultValue: NoteGridPopupContextData = {
    isNoteGridPopupOpen: false,
    setIsNoteGridPopupOpen: () => {},
    targetFolder: null,
    setTargetFolder: () => {},
    isSubmitting: false,
    setIsSubmitting: () => {},
};

const NoteGridPopupStore = createContext<NoteGridPopupContextData>(noteGridPopupContextDefaultValue);

export const useNoteGridPopupStore = (): NoteGridPopupContextData => {
    const context = useContext(NoteGridPopupStore);
    if (!context) {
        throw new Error("useNoteGridPopupStore must be used within NoteGridPopupProvider");
    }
    return context;
};

export const NoteGridPopupProvider: React.FC<React.PropsWithChildren<unknown>> = ({ children }) => {
    const [isNoteGridPopupOpen, setIsNoteGridPopupOpen] = useState<boolean>(false);
    const [targetFolder, setTargetFolder] = useState<{
        id: number;
        name: string;
        entityId: number;
    } | null>(null);
    const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

    return (
        <NoteGridPopupStore.Provider
            value={{
                isNoteGridPopupOpen,
                setIsNoteGridPopupOpen,
                targetFolder,
                setTargetFolder,
                isSubmitting,
                setIsSubmitting,
            }}
        >
            {children}
        </NoteGridPopupStore.Provider>
    );
};
