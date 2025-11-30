/**
 * FolderDialog Store Context
 * Manages form state for FolderDialog component
 * 
 * @pattern Context for UI state (form fields, validation, loading)
 * @see FolderDialog component in src/Components/Explorer/FolderDialog
 */

import { createContext, Dispatch, SetStateAction, useContext, useState } from 'react';
import type { WorkspaceTreeItemResponse } from '@/types/workspace.types';

export interface FolderDialogFormErrors {
    name?: string;
    description?: string;
    color?: string;
}

export type DialogMode = 'create' | 'edit';

export interface FolderDialogContextData {
    // Dialog state
    isOpen: boolean;
    setIsOpen: Dispatch<SetStateAction<boolean>>;
    mode: DialogMode;
    setMode: Dispatch<SetStateAction<DialogMode>>;
    editingFolder: any | null;
    setEditingFolder: Dispatch<SetStateAction<any | null>>;
    
    // Form fields
    newFolderName: string;
    setNewFolderName: Dispatch<SetStateAction<string>>;
    description: string;
    setDescription: Dispatch<SetStateAction<string>>;
    color: string;
    setColor: Dispatch<SetStateAction<string>>;
    
    // Validation errors
    errors: FolderDialogFormErrors;
    setErrors: Dispatch<SetStateAction<FolderDialogFormErrors>>;
    
    // Loading states
    isSubmitting: boolean;
    setIsSubmitting: Dispatch<SetStateAction<boolean>>;
    isLoadingTree: boolean;
    setIsLoadingTree: Dispatch<SetStateAction<boolean>>;
    
    // Reset form to initial state
    resetForm: () => void;

}

const folderDialogContextDefaultValue: FolderDialogContextData = {
    // Dialog state
    isOpen: false,
    setIsOpen: () => {},
    mode: 'create',
    setMode: () => {},
    editingFolder: null,
    setEditingFolder: () => {},
    
    // Form fields
    newFolderName: '',
    setNewFolderName: () => {},
    description: '',
    setDescription: () => {},
    color: '#1976D2', // Default blue
    setColor: () => {},
    
    // Validation errors
    errors: {},
    setErrors: () => {},
    
    // Loading states
    isSubmitting: false,
    setIsSubmitting: () => {},
    isLoadingTree: false,
    setIsLoadingTree: () => {},
    
    // Reset form to initial state
    resetForm: () => {},

};

export const FolderDialogStore = createContext<FolderDialogContextData>(
    folderDialogContextDefaultValue
);

export const useFolderDialogStore = () => {
    const context = useContext(FolderDialogStore);
    if (!context) {
        throw new Error('useFolderDialogStore must be used within FolderDialogProvider');
    }
    return context;
};

export const FolderDialogProvider: React.FC<React.PropsWithChildren<unknown>> = ({ children }) => {
    // Dialog state
    const [isOpen, setIsOpen] = useState<boolean>(false);
    const [mode, setMode] = useState<DialogMode>('create');
    const [editingFolder, setEditingFolder] = useState<any | null>(null);
    
    // Form fields
    const [newFolderName, setNewFolderName] = useState<string>('');
    const [description, setDescription] = useState<string>('');
    const [color, setColor] = useState<string>('#1976D2'); // Default blue
    
    // Validation errors
    const [errors, setErrors] = useState<FolderDialogFormErrors>({});
    
    // Loading states
    const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
    const [isLoadingTree, setIsLoadingTree] = useState<boolean>(false);
    
    const resetForm = () => {
        setNewFolderName('');
        setDescription('');
        setColor('#1976D2');
        setErrors({});
        setIsSubmitting(false);
    };
    

    return (
        <FolderDialogStore.Provider
            value={{
                // Dialog state
                isOpen,
                setIsOpen,
                mode,
                setMode,
                editingFolder,
                setEditingFolder,
                
                // Form fields
                newFolderName,
                setNewFolderName,
                description,
                setDescription,
                color,
                setColor,
                
                // Validation errors
                errors,
                setErrors,
                
                // Loading states
                isSubmitting,
                setIsSubmitting,
                isLoadingTree,
                setIsLoadingTree,
                
                resetForm,
            }}
        >
            {children}
        </FolderDialogStore.Provider>
    );
};
