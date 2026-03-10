/**
 * useKnowledgeCardActions.helper.ts
 * CRUD + API actions: add, edit, delete, reparent, saveParent.
 * Reads knowledgeId from store — no parameters needed.
 */

import { useKnowledgeCardStore, emptyAddDraft } from "@/store/kt/KnowledgeCard.store";
import type { EditCardDraft } from "@/store/kt/KnowledgeCard.store";
import { useKtHelper } from "@/hooks/kt/useKt.helper";
import { nextTempId } from "@/hooks/kt/useKnowledgeCard.helper";
import type { KnowledgeCard, UpsertKnowledgeCardDTO } from "@/types/knowledgeTree.types";

export function useKnowledgeCardActions() {
    const {
        knowledgeId,
        cards, setCards,
        selectedId, setSelectedId,
        setActiveLevel,
        setAdding,
        addDraft, setAddDraft,
        setEditingCardId, setEditDraft,
        setParentPickerCardId,
    } = useKnowledgeCardStore();

    const { upsertCard, deleteCard: deleteCardApi } = useKtHelper();

    // ── add-form ──────────────────────────────────────────────────────────────

    const openAddForm = () => {
        setAddDraft(emptyAddDraft());
        setAdding(true);
    };

    const cancelAddForm = () => {
        setAdding(false);
        setAddDraft(emptyAddDraft());
    };

    const submitAddForm = async () => {
        if (!addDraft.title.trim()) return;

        const tempCard: KnowledgeCard = {
            id: nextTempId(),
            knowledgeId,
            userId: 0,
            isDefinition: addDraft.isDefinition,
            title: addDraft.title.trim(),
            keyword: addDraft.keyword.trim() || addDraft.title.trim(),
            description: addDraft.description.trim(),
            linkedCardIds: addDraft.linkedCardIds,
            parentCardId: addDraft.parentCardId,
        };

        setCards((prev) => [...prev, { ...tempCard, id: -(Date.now()) }]);
        setAdding(false);
        setAddDraft(emptyAddDraft());

        const dto: UpsertKnowledgeCardDTO = {
            id: 0,
            knowledgeId,
            parentCardId: tempCard.parentCardId ?? null,
            keyword: tempCard.keyword,
            title: tempCard.title,
            description: tempCard.description,
            isDefinition: tempCard.isDefinition,
            linkedCardIds: tempCard.linkedCardIds,
        };
        await upsertCard(dto);
    };

    // ── edit in-place ─────────────────────────────────────────────────────────

    const openEdit = (card: KnowledgeCard) => {
        setEditDraft({
            title: card.title,
            keyword: card.keyword,
            description: card.description,
            isDefinition: card.isDefinition,
            linkedCardIds: card.linkedCardIds,
        });
        setEditingCardId(card.id);
    };

    const cancelEdit = () => setEditingCardId(null);

    const submitEdit = async (card: KnowledgeCard, draft: EditCardDraft) => {
        if (!draft.title.trim()) return;
        const updated = {
            title: draft.title.trim(),
            keyword: draft.keyword.trim() || draft.title.trim(),
            description: draft.description.trim(),
            isDefinition: draft.isDefinition,
            linkedCardIds: draft.linkedCardIds,
        };
        setCards((prev) => prev.map((c) => c.id === card.id ? { ...c, ...updated } : c));
        setEditingCardId(null);

        const dto: UpsertKnowledgeCardDTO = {
            id: card.id,
            knowledgeId,
            parentCardId: card.parentCardId ?? null,
            ...updated,
        };
        await upsertCard(dto);
    };

    // ── delete ────────────────────────────────────────────────────────────────

    const deleteCard = async (id: number) => {
        const card = cards.find((c) => c.id === id);
        if (!card) return;
        setCards((prev) => prev.filter((c) => c.id !== id));
        if (selectedId === id) setSelectedId(null);
        await deleteCardApi(card);
    };

    // ── reparent (DnD drop) ───────────────────────────────────────────────────

    const reparentCard = async (draggedId: number, newParentId: number) => {
        const card = cards.find((c) => c.id === draggedId);
        if (!card) return;
        setCards((prev) => prev.map((c) => c.id === draggedId ? { ...c, parentCardId: newParentId } : c));
        setActiveLevel(null);

        const dto: UpsertKnowledgeCardDTO = {
            id: draggedId,
            knowledgeId,
            parentCardId: newParentId,
            keyword: card.keyword,
            title: card.title,
            description: card.description,
            isDefinition: card.isDefinition,
            linkedCardIds: card.linkedCardIds,
        };
        await upsertCard(dto);
    };

    // ── save parent (from picker) ─────────────────────────────────────────────

    const saveParent = async (card: KnowledgeCard, newParentId: number | null) => {
        setCards((prev) => prev.map((c) => c.id === card.id ? { ...c, parentCardId: newParentId ?? undefined } : c));
        setParentPickerCardId(null);

        const dto: UpsertKnowledgeCardDTO = {
            id: card.id,
            knowledgeId,
            parentCardId: newParentId,
            keyword: card.keyword,
            title: card.title,
            description: card.description,
            isDefinition: card.isDefinition,
            linkedCardIds: card.linkedCardIds,
        };
        await upsertCard(dto);
    };

    return {
        openAddForm, cancelAddForm, submitAddForm,
        openEdit, cancelEdit, submitEdit,
        deleteCard, reparentCard, saveParent,
    };
}
