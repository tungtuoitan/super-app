import { createContext, Dispatch, SetStateAction, useContext, useState } from "react";
import { workspaceConstants } from "@/features/workspace/workspace.constants";
import { kconstants } from "../utils/K.Constants";
import {ICON_COLORS, IconKey} from "@/shared";

export interface NodeDialogFormErrors {
    name?: string;
    description?: string;
    color?: string;
    nodeType?: string;
}

export type DialogMode = "create" | "edit";
export type NodeItemType = typeof workspaceConstants.itemTypes.node;
export type KNodeType = "entity" | "question";

export interface NodeDialogContextData {
    // Dialog state
    isNodeDialogOpen: boolean;
    setIsNodeDialogOpen: Dispatch<SetStateAction<boolean>>;
    mode: DialogMode;
    setMode: Dispatch<SetStateAction<DialogMode>>;
    itemType: NodeItemType;
    setItemType: Dispatch<SetStateAction<NodeItemType>>;
    editingNode: any | null;
    setEditingNode: Dispatch<SetStateAction<any | null>>;
    parentNode: any | null;
    setParentNode: Dispatch<SetStateAction<any | null>>;

    // Form fields
    newNodeName: string;
    setNewNodeName: Dispatch<SetStateAction<string>>;
    description: string;
    setDescription: Dispatch<SetStateAction<string>>;
    color: string;
    setColor: Dispatch<SetStateAction<string>>;
    icon: IconKey | null;
    setIcon: Dispatch<SetStateAction<IconKey | null>>;
    nodeType: KNodeType | null;
    setNodeType: Dispatch<SetStateAction<KNodeType | null>>;

    // Validation
    errors: NodeDialogFormErrors;
    setErrors: Dispatch<SetStateAction<NodeDialogFormErrors>>;

    // Loading
    isSubmitting: boolean;
    setIsSubmitting: Dispatch<SetStateAction<boolean>>;
    isLoadingTree: boolean;
    setIsLoadingTree: Dispatch<SetStateAction<boolean>>;
}

// @deprecated aliases â€” remove after all consumers updated
export interface FolderDialogFormErrors extends NodeDialogFormErrors {}
export interface FolderDialogContextData extends NodeDialogContextData {}

const nodeDialogContextDefaultValue: NodeDialogContextData = {
    isNodeDialogOpen: false,
    setIsNodeDialogOpen: () => {},
    mode: "create",
    setMode: () => {},
    itemType: workspaceConstants.itemTypes.node,
    setItemType: () => {},
    editingNode: null,
    setEditingNode: () => {},
    parentNode: null,
    setParentNode: () => {},

    newNodeName: "",
    setNewNodeName: () => {},
    description: "",
    setDescription: () => {},
    color: ICON_COLORS.GREY,
    setColor: () => {},
    icon: null,
    setIcon: () => {},
    nodeType: null,
    setNodeType: () => {},

    errors: {},
    setErrors: () => {},

    isSubmitting: false,
    setIsSubmitting: () => {},
    isLoadingTree: false,
    setIsLoadingTree: () => {},
};

// @deprecated alias
export const folderDialogContextDefaultValue = nodeDialogContextDefaultValue;

export const NodeDialogStore = createContext<NodeDialogContextData>(nodeDialogContextDefaultValue);

// @deprecated alias
export const FolderDialogStore = NodeDialogStore;

export const useNodeDialogStore = () => {
    const context = useContext(NodeDialogStore);
    if (!context) throw new Error("useNodeDialogStore must be used within KNodeDialogProvider");
    return context;
};

// @deprecated alias
export const KuseFolderDialogStore = useNodeDialogStore;

export const KNodeDialogProvider: React.FC<React.PropsWithChildren<unknown>> = ({ children }) => {
    const [isNodeDialogOpen, setIsNodeDialogOpen] = useState<boolean>(false);
    const [mode, setMode] = useState<DialogMode>("create");
    const [itemType, setItemType] = useState<NodeItemType>(workspaceConstants.itemTypes.node);
    const [editingNode, setEditingNode] = useState<any | null>(null);
    const [parentNode, setParentNode] = useState<any | null>(null);

    const [newNodeName, setNewNodeName] = useState<string>("");
    const [description, setDescription] = useState<string>("");
    const [color, setColor] = useState<string>(ICON_COLORS.GREY);
    const [icon, setIcon] = useState<IconKey | null>(null);
    const [nodeType, setNodeType] = useState<"entity" | "question" | null>(null);

    const [errors, setErrors] = useState<NodeDialogFormErrors>({});
    const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
    const [isLoadingTree, setIsLoadingTree] = useState<boolean>(false);

    return (
        <NodeDialogStore.Provider
            value={{
                isNodeDialogOpen,
                setIsNodeDialogOpen,
                mode,
                setMode,
                itemType,
                setItemType,
                editingNode,
                setEditingNode,
                parentNode,
                setParentNode,

                newNodeName,
                setNewNodeName,
                description,
                setDescription,
                color,
                setColor,
                icon,
                setIcon,
                nodeType,
                setNodeType,

                errors,
                setErrors,
                isSubmitting,
                setIsSubmitting,
                isLoadingTree,
                setIsLoadingTree,
            }}
        >
            {children}
        </NodeDialogStore.Provider>
    );
};

// @deprecated alias
export const KFolderDialogProvider = KNodeDialogProvider;



