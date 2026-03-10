import React, { createContext, Dispatch, SetStateAction, useContext, useState } from "react";

/**
 * NoteGridPopup Store - Manages state for "Add Existing Note" dialog
 * Pattern: Similar to FolderDialog store
 */

// ========================================
// 1. Context Data Interface
// ========================================

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

// ========================================
// 2. Context & Default Value
// ========================================

const noteGridPopupContextDefaultValue: NoteGridPopupContextData = {
    // Dialog state
    isNoteGridPopupOpen: false,
    setIsNoteGridPopupOpen: () => {},
    
    // Target folder info
    targetFolder: null,
    setTargetFolder: () => {},

    // Loading states
    isSubmitting: false,
    setIsSubmitting: () => {},
};

const NoteGridPopupStore = createContext<NoteGridPopupContextData>(noteGridPopupContextDefaultValue);

// ========================================
// 3. Custom Hook
// ========================================

export const useNoteGridPopupStore = (): NoteGridPopupContextData => {
    const context = useContext(NoteGridPopupStore);
    if (!context) {
        throw new Error("useNoteGridPopupStore must be used within NoteGridPopupProvider");
    }
    return context;
};

// ========================================
// 4. Provider Component
// ========================================

export const NoteGridPopupProvider: React.FC<React.PropsWithChildren<unknown>> = ({ children }) => {
    // Dialog state
    const [isNoteGridPopupOpen, setIsNoteGridPopupOpen] = useState<boolean>(false);
    
    // Target folder info
    const [targetFolder, setTargetFolder] = useState<{
        id: number;
        name: string;
        entityId: number;
    } | null>(null);

    // Loading states
    const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

    return (
        <NoteGridPopupStore.Provider
            value={{
                // Dialog state
                isNoteGridPopupOpen,
                setIsNoteGridPopupOpen,
                
                // Target folder info
                targetFolder,
                setTargetFolder,

                // Loading states
                isSubmitting,
                setIsSubmitting,
            }}
        >
            {children}
        </NoteGridPopupStore.Provider>
    );
};
