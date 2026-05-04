import { createContext, Dispatch, SetStateAction, useContext, useState } from "react";
import type { KItemV2 } from "../types/kV2.type";
import type { BreadcrumbEntry } from "../hooks/kNodeEditor.miniHelper";

interface KNodeEditorContextData {
    rootNode: KItemV2;
    breadcrumb: BreadcrumbEntry[];
    setBreadcrumb: Dispatch<SetStateAction<BreadcrumbEntry[]>>;
    editingNodeId: number | null;
    setEditingNodeId: Dispatch<SetStateAction<number | null>>;
    editDraft: { name: string; description: string; icon: string | null; color: string | null };
    setEditDraft: Dispatch<SetStateAction<{ name: string; description: string; icon: string | null; color: string | null }>>;
    editOriginal: { name: string; description: string; icon: string | null; color: string | null };
    setEditOriginal: Dispatch<SetStateAction<{ name: string; description: string; icon: string | null; color: string | null }>>;
    parentPickerNodeId: number | null;
    setParentPickerNodeId: Dispatch<SetStateAction<number | null>>;
    unsavedPromptNodeId: number | null;
    setUnsavedPromptNodeId: Dispatch<SetStateAction<number | null>>;
    promptFlashTick: number;
    setPromptFlashTick: Dispatch<SetStateAction<number>>;
    inlineNewParentId: number | null | undefined;
    setInlineNewParentId: Dispatch<SetStateAction<number | null | undefined>>;
    showDeleted: boolean;
    setShowDeleted: Dispatch<SetStateAction<boolean>>;
    showAllChild: boolean;
    setShowAllChild: Dispatch<SetStateAction<boolean>>;
}

const KNodeEditorContext = createContext<KNodeEditorContextData | null>(null);

export function KNodeEditorProvider({ rootNode, children }: { rootNode: KItemV2; children: React.ReactNode }) {
    const [breadcrumb, setBreadcrumb] = useState<BreadcrumbEntry[]>([{ id: null, name: rootNode.name }]);
    const [editingNodeId, setEditingNodeId] = useState<number | null>(null);
    const [editDraft, setEditDraft] = useState<{ name: string; description: string; icon: string | null; color: string | null }>({ name: "", description: "", icon: null, color: null });
    const [editOriginal, setEditOriginal] = useState<{ name: string; description: string; icon: string | null; color: string | null }>({ name: "", description: "", icon: null, color: null });
    const [parentPickerNodeId, setParentPickerNodeId] = useState<number | null>(null);
    const [unsavedPromptNodeId, setUnsavedPromptNodeId] = useState<number | null>(null);
    const [promptFlashTick, setPromptFlashTick] = useState(0);
    const [inlineNewParentId, setInlineNewParentId] = useState<number | null | undefined>(undefined);
    const [showDeleted, setShowDeleted] = useState<boolean>(false);
    const [showAllChild, setShowAllChild] = useState<boolean>(true);

    return (
        <KNodeEditorContext.Provider value={{
            rootNode,
            breadcrumb, setBreadcrumb,
            editingNodeId, setEditingNodeId,
            editDraft, setEditDraft,
            editOriginal, setEditOriginal,
            parentPickerNodeId, setParentPickerNodeId,
            unsavedPromptNodeId, setUnsavedPromptNodeId,
            promptFlashTick, setPromptFlashTick,
            inlineNewParentId, setInlineNewParentId,
            showDeleted, setShowDeleted,
            showAllChild, setShowAllChild,
        }}>
            {children}
        </KNodeEditorContext.Provider>
    );
}

export function useKNodeEditorStore() {
    const ctx = useContext(KNodeEditorContext);
    if (!ctx) throw new Error("useKNodeEditorStore must be used within KNodeEditorProvider");
    return ctx;
}
