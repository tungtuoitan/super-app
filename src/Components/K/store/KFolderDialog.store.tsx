import { createContext, Dispatch, SetStateAction, useContext, useState } from "react";
import {kconstants} from "../utils/K.Constants";
import {IconType} from "../shared/icons/icon.types";
import {ICON_COLORS} from "../shared/icons/icon.config";

export interface FolderDialogFormErrors {
    name?: string;
    description?: string; 
    color?: string;
}

export type DialogMode = "create" | "edit";
export type ItemType =
    | typeof kconstants.workspace.itemTypes.folder

export interface FolderDialogContextData {
    // Dialog state
    isFolderDialogOpen: boolean;
    setIsFolderDialogOpen: Dispatch<SetStateAction<boolean>>;
    mode: DialogMode;
    setMode: Dispatch<SetStateAction<DialogMode>>;
    itemType: ItemType;
    setItemType: Dispatch<SetStateAction<ItemType>>;
    editingFolder: any | null;
    setEditingFolder: Dispatch<SetStateAction<any | null>>;
    parentFolder: any | null;
    setParentFolder: Dispatch<SetStateAction<any | null>>;

    // Form fields
    newFolderName: string;
    setNewFolderName: Dispatch<SetStateAction<string>>;
    description: string;
    setDescription: Dispatch<SetStateAction<string>>;
    color: string;
    setColor: Dispatch<SetStateAction<string>>;
    icon: IconType | null;
    setIcon: Dispatch<SetStateAction<IconType | null>>;

    // Validation errors
    errors: FolderDialogFormErrors;
    setErrors: Dispatch<SetStateAction<FolderDialogFormErrors>>;

    // Loading states
    isSubmitting: boolean;
    setIsSubmitting: Dispatch<SetStateAction<boolean>>;
    isLoadingTree: boolean;
    setIsLoadingTree: Dispatch<SetStateAction<boolean>>;
}

const folderDialogContextDefaultValue: FolderDialogContextData = {
    // Dialog state
    isFolderDialogOpen: false,
    setIsFolderDialogOpen: () => {},
    mode: "create",
    setMode: () => {},
    itemType: kconstants.workspace.itemTypes.folder,
    setItemType: () => {},
    editingFolder: null,
    setEditingFolder: () => {},
    parentFolder: null,
    setParentFolder: () => {},

    // Form fields
    newFolderName: "",
    setNewFolderName: () => {},
    description: "",
    setDescription: () => {},
    color: ICON_COLORS.GREY, // Default grey
    setColor: () => {},
    icon: null,
    setIcon: () => {},

    // Validation errors
    errors: {},
    setErrors: () => {},

    // Loading states
    isSubmitting: false,
    setIsSubmitting: () => {},
    isLoadingTree: false,
    setIsLoadingTree: () => {},
};

export const FolderDialogStore = createContext<FolderDialogContextData>(folderDialogContextDefaultValue);

export const KuseFolderDialogStore = () => {
    const context = useContext(FolderDialogStore);
    if (!context) {
        throw new Error("KuseFolderDialogStore must be used within FolderDialogProvider");
    }
    return context;
};

export const KFolderDialogProvider: React.FC<React.PropsWithChildren<unknown>> = ({ children }) => {
    // Dialog state
    const [isFolderDialogOpen, setIsFolderDialogOpen] = useState<boolean>(false);
    const [mode, setMode] = useState<DialogMode>("create");
    const [itemType, setItemType] = useState<ItemType>(kconstants.workspace.itemTypes.folder);
    const [editingFolder, setEditingFolder] = useState<any | null>(null);
    const [parentFolder, setParentFolder] = useState<any | null>(null);

    // Form fields
    const [newFolderName, setNewFolderName] = useState<string>("");
    const [description, setDescription] = useState<string>("");
    const [color, setColor] = useState<string>(ICON_COLORS.GREY); // Default grey
    const [icon, setIcon] = useState<IconType | null>(null);

    // Validation errors
    const [errors, setErrors] = useState<FolderDialogFormErrors>({});

    // Loading states
    const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
    const [isLoadingTree, setIsLoadingTree] = useState<boolean>(false);

    return (
        <FolderDialogStore.Provider
            value={{
                // Dialog state
                isFolderDialogOpen,
                setIsFolderDialogOpen,
                mode,
                setMode,
                itemType,
                setItemType,
                editingFolder,
                setEditingFolder,
                parentFolder,
                setParentFolder,

                // Form fields
                newFolderName,
                setNewFolderName,
                description,
                setDescription,
                color,
                setColor,
                icon,
                setIcon,

                // Validation errors
                errors,
                setErrors,

                // Loading states
                isSubmitting,
                setIsSubmitting,
                isLoadingTree,
                setIsLoadingTree,
            }}
        >
            {children}
        </FolderDialogStore.Provider>
    );
};

