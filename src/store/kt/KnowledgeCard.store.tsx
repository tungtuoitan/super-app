/**
 * KnowledgeCard Store
 * Centralized state for the card grid view inside a Knowledge.
 * Covers: knowledgeId, breadcrumb stack, card list, selection/highlight,
 *         level filter, add-form, edit-in-place, parent-picker, open-as-knowledge signal.
 */

import { createContext, useContext, useState } from "react";
import type { PropsWithChildren, Dispatch, SetStateAction } from "react";
import type { KnowledgeCard } from "@/types/knowledgeTree.types";

// ─── Breadcrumb ───────────────────────────────────────────────────────────────

export interface BreadcrumbEntry {
    id: number | null;
    title: string;
}

// ─── Add-form draft ───────────────────────────────────────────────────────────

export interface AddCardDraft {
    title: string;
    keyword: string;
    description: string;
    isDefinition: boolean;
    linkedCardIds: number[];
    parentCardId: number | undefined;
}

const defaultDraft: AddCardDraft = {
    title: "",
    keyword: "",
    description: "",
    isDefinition: true,
    linkedCardIds: [],
    parentCardId: undefined,
};

export const emptyAddDraft = (): AddCardDraft => ({ ...defaultDraft });

// ─── Edit-in-place draft ──────────────────────────────────────────────────────

export interface EditCardDraft {
    title: string;
    keyword: string;
    description: string;
    isDefinition: boolean;
    linkedCardIds: number[];
}

// ─── Context shape ────────────────────────────────────────────────────────────

interface KnowledgeCardStoreValue {
    // current knowledge context — set once when panel mounts
    knowledgeId: number;
    setKnowledgeId: Dispatch<SetStateAction<number>>;

    // breadcrumb stack — managed by EditorPanel, read by Breadcrumb UI
    breadcrumbStack: BreadcrumbEntry[];
    setBreadcrumbStack: Dispatch<SetStateAction<BreadcrumbEntry[]>>;

    // cards scoped to current breadcrumb level — set by EditorPanel
    scopedCards: KnowledgeCard[];
    setScopedCards: Dispatch<SetStateAction<KnowledgeCard[]>>;

    // card list (full list for current knowledge, synced after API reload)
    cards: KnowledgeCard[];
    setCards: Dispatch<SetStateAction<KnowledgeCard[]>>;

    // selection / highlight
    selectedId: number | null;
    setSelectedId: Dispatch<SetStateAction<number | null>>;

    // level filter
    activeLevel: number | null;
    setActiveLevel: Dispatch<SetStateAction<number | null>>;

    // add-form visibility + draft
    adding: boolean;
    setAdding: Dispatch<SetStateAction<boolean>>;
    addDraft: AddCardDraft;
    setAddDraft: Dispatch<SetStateAction<AddCardDraft>>;

    // edit in-place
    editingCardId: number | null;
    setEditingCardId: Dispatch<SetStateAction<number | null>>;
    editDraft: EditCardDraft;
    setEditDraft: Dispatch<SetStateAction<EditCardDraft>>;

    // parent-picker: card.id or -1 (add-form)
    parentPickerCardId: number | null;
    setParentPickerCardId: Dispatch<SetStateAction<number | null>>;

    // signal: CardItem → EditorPanel to push breadcrumb
    openAsKnowledgeCardId: number | null;
    setOpenAsKnowledgeCardId: Dispatch<SetStateAction<number | null>>;
}

// ─── Context ──────────────────────────────────────────────────────────────────

const KnowledgeCardContext = createContext<KnowledgeCardStoreValue | null>(null);

// ─── Provider ─────────────────────────────────────────────────────────────────

export function KnowledgeCardProvider({ children }: PropsWithChildren) {
    const [knowledgeId, setKnowledgeId] = useState<number>(0);
    const [breadcrumbStack, setBreadcrumbStack] = useState<BreadcrumbEntry[]>([]);
    const [scopedCards, setScopedCards] = useState<KnowledgeCard[]>([]);
    const [cards, setCards] = useState<KnowledgeCard[]>([]);
    const [selectedId, setSelectedId] = useState<number | null>(null);
    const [activeLevel, setActiveLevel] = useState<number | null>(null);
    const [adding, setAdding] = useState(false);
    const [addDraft, setAddDraft] = useState<AddCardDraft>(defaultDraft);
    const [editingCardId, setEditingCardId] = useState<number | null>(null);
    const [editDraft, setEditDraft] = useState<EditCardDraft>({
        title: "", keyword: "", description: "", isDefinition: true, linkedCardIds: [],
    });
    const [parentPickerCardId, setParentPickerCardId] = useState<number | null>(null);
    const [openAsKnowledgeCardId, setOpenAsKnowledgeCardId] = useState<number | null>(null);

    return (
        <KnowledgeCardContext.Provider value={{
            knowledgeId, setKnowledgeId,
            breadcrumbStack, setBreadcrumbStack,
            scopedCards, setScopedCards,
            cards, setCards,
            selectedId, setSelectedId,
            activeLevel, setActiveLevel,
            adding, setAdding,
            addDraft, setAddDraft,
            editingCardId, setEditingCardId,
            editDraft, setEditDraft,
            parentPickerCardId, setParentPickerCardId,
            openAsKnowledgeCardId, setOpenAsKnowledgeCardId,
        }}>
            {children}
        </KnowledgeCardContext.Provider>
    );
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useKnowledgeCardStore() {
    const ctx = useContext(KnowledgeCardContext);
    if (!ctx) throw new Error("useKnowledgeCardStore must be used within KnowledgeCardProvider");
    return ctx;
}
