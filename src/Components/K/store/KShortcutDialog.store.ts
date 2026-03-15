/**
 * KShortcutDialog Store
 * Pattern: giống hệt K.store.tsx — interface + defaultValue + createContext + useXStore + XProvider
 * Không dùng JSX (file .ts) → Provider dùng React.createElement thay vì JSX syntax.
 */

import React, { useContext, createContext, Dispatch, SetStateAction, useState } from "react";
import type { KItemV2 } from "../types/K-v2.types";
import type { KDTO } from "../types/K-dto.types";

// ── 1. Context shape ──────────────────────────────────────────────────────────

export interface KShortcutDialogContextData {
    // Dialog open/close
    isOpen:     boolean;
    setIsOpen:  Dispatch<SetStateAction<boolean>>;

    // Node mà shortcut sẽ được tạo bên trong (parent của shortcut)
    parentNode:    KItemV2 | null;
    setParentNode: Dispatch<SetStateAction<KItemV2 | null>>;

    // Target knowledge picker
    targetKnowledgeId:    number | null;
    setTargetKnowledgeId: Dispatch<SetStateAction<number | null>>;

    // Target knowledge tree (loaded on demand)
    targetTree:    KDTO | null;
    setTargetTree: Dispatch<SetStateAction<KDTO | null>>;

    // Loading state khi fetch target tree
    isLoadingTree:    boolean;
    setIsLoadingTree: Dispatch<SetStateAction<boolean>>;

    // Danh sách nodes đang được chọn làm shortcut targets (multi-select)
    selectedNodes:    KItemV2[];
    setSelectedNodes: Dispatch<SetStateAction<KItemV2[]>>;

    // Submitting state khi gọi API tạo shortcut
    isSubmitting:    boolean;
    setIsSubmitting: Dispatch<SetStateAction<boolean>>;
}

// ── 2. Default value ──────────────────────────────────────────────────────────

const kShortcutDialogContextDefaultValue: KShortcutDialogContextData = {
    isOpen:     false,
    setIsOpen:  () => {},

    parentNode:    null,
    setParentNode: () => {},

    targetKnowledgeId:    null,
    setTargetKnowledgeId: () => {},

    targetTree:    null,
    setTargetTree: () => {},

    isLoadingTree:    false,
    setIsLoadingTree: () => {},

    selectedNodes:    [],
    setSelectedNodes: () => {},

    isSubmitting:    false,
    setIsSubmitting: () => {},
};

// ── 3. Context ────────────────────────────────────────────────────────────────

export const KShortcutDialogStore = createContext<KShortcutDialogContextData>(
    kShortcutDialogContextDefaultValue
);

// ── 4. Hook ───────────────────────────────────────────────────────────────────

export const useKShortcutDialogStore = () => useContext(KShortcutDialogStore);

// ── 5. Provider ───────────────────────────────────────────────────────────────

export const KShortcutDialogProvider: React.FC<React.PropsWithChildren<unknown>> = ({ children }) => {
    const [isOpen,             setIsOpen]             = useState<boolean>(false);
    const [parentNode,         setParentNode]         = useState<KItemV2 | null>(null);
    const [targetKnowledgeId,  setTargetKnowledgeId]  = useState<number | null>(null);
    const [targetTree,         setTargetTree]         = useState<KDTO | null>(null);
    const [isLoadingTree,      setIsLoadingTree]      = useState<boolean>(false);
    const [selectedNodes,      setSelectedNodes]      = useState<KItemV2[]>([]);
    const [isSubmitting,       setIsSubmitting]       = useState<boolean>(false);

    return React.createElement(
        KShortcutDialogStore.Provider,
        {
            value: {
                isOpen,             setIsOpen,
                parentNode,         setParentNode,
                targetKnowledgeId,  setTargetKnowledgeId,
                targetTree,         setTargetTree,
                isLoadingTree,      setIsLoadingTree,
                selectedNodes,      setSelectedNodes,
                isSubmitting,       setIsSubmitting,
            },
        },
        children,
    );
};
