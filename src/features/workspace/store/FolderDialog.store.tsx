import { createContext, Dispatch, SetStateAction, useContext, useState } from "react";
import { constants } from "@/utils/constants";
import { IconKey, ICON_COLORS } from "@/shared";

export interface FolderDialogFormErrors {
    name?: string;
    description?: string;
    color?: string;
}

export type DialogMode = "create" | "edit";
export type ItemType =
    | typeof constants.workspace.itemTypes.folder
    | typeof constants.workspace.itemTypes.note
    | typeof constants.workspace.itemTypes.file

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
    icon: IconKey | null;
    setIcon: Dispatch<SetStateAction<IconKey | null>>;

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
    itemType: constants.workspace.itemTypes.folder,
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

export const useFolderDialogStore = () => {
    const context = useContext(FolderDialogStore);
    if (!context) {
        throw new Error("useFolderDialogStore must be used within FolderDialogProvider");
    }
    return context;
};

export const FolderDialogProvider: React.FC<React.PropsWithChildren<unknown>> = ({ children }) => {
    // Dialog state
    const [isFolderDialogOpen, setIsFolderDialogOpen] = useState<boolean>(false);
    const [mode, setMode] = useState<DialogMode>("create");
    const [itemType, setItemType] = useState<ItemType>(constants.workspace.itemTypes.folder);
    const [editingFolder, setEditingFolder] = useState<any | null>(null);
    const [parentFolder, setParentFolder] = useState<any | null>(null);

    // Form fields
    const [newFolderName, setNewFolderName] = useState<string>("");
    const [description, setDescription] = useState<string>("");
    const [color, setColor] = useState<string>(ICON_COLORS.GREY); // Default grey
    const [icon, setIcon] = useState<IconKey | null>(null);

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
