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

export interface FolderDialogContextData {
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
    
    // Workspace tree data
    workspaceTree: WorkspaceTreeItemResponse[];
    setWorkspaceTree: Dispatch<SetStateAction<WorkspaceTreeItemResponse[]>>;
    
    // Helper functions
    resetForm: () => void;
}

const folderDialogContextDefaultValue: FolderDialogContextData = {
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
    
    // Workspace tree data
    workspaceTree: [],
    setWorkspaceTree: () => {},
    
    // Helper functions
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
    // Form fields
    const [newFolderName, setNewFolderName] = useState<string>('');
    const [description, setDescription] = useState<string>('');
    const [color, setColor] = useState<string>('#1976D2'); // Default blue
    
    // Validation errors
    const [errors, setErrors] = useState<FolderDialogFormErrors>({});
    
    // Loading states
    const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
    const [isLoadingTree, setIsLoadingTree] = useState<boolean>(false);
    
    // Workspace tree data
    const [workspaceTree, setWorkspaceTree] = useState<WorkspaceTreeItemResponse[]>([]);
    
    // Helper function to reset form
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
                
                // Workspace tree data
                workspaceTree,
                setWorkspaceTree,
                
                // Helper functions
                resetForm,
            }}
        >
            {children}
        </FolderDialogStore.Provider>
    );
};
