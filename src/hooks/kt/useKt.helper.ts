import { useCallback } from "react";
import { useSnackbar } from "notistack";
import { ktService } from "@/services/kt.service";
import { useKtStore } from "@/store/kt/useKt.store";
import type { Knowledge, KnowledgeCard, KnowledgeDTO, KnowledgeCardDTO, UpsertKnowledgeDTO, UpsertKnowledgeCardDTO } from "@/types/knowledgeTree.types";

// ─── transforms ──────────────────────────────────────────────────────────────

function toKnowledge(dto: KnowledgeDTO): Knowledge {
    return {
        id: dto.id,
        userId: dto.userId,
        parentId: dto.parentId,
        title: dto.title,
        description: dto.description,
        createdAt: dto.createdAt ? new Date(dto.createdAt) : undefined,
        updatedAt: dto.updatedAt ? new Date(dto.updatedAt) : undefined,
        deletedAt: dto.deletedAt ? new Date(dto.deletedAt) : null,
    };
}

function toCard(dto: KnowledgeCardDTO): KnowledgeCard {
    return {
        id: dto.id,
        knowledgeId: dto.knowledgeId,
        parentCardId: dto.parentCardId,
        userId: dto.userId,
        keyword: dto.keyword ?? "",
        title: dto.title,
        description: dto.description ?? "",
        isDefinition: dto.isDefinition,
        linkedCardIds: dto.sourceLinks?.map((l) => l.targetCardId) ?? [],
        createdAt: dto.createdAt ? new Date(dto.createdAt) : undefined,
        updatedAt: dto.updatedAt ? new Date(dto.updatedAt) : undefined,
        deletedAt: dto.deletedAt ? new Date(dto.deletedAt) : null,
    };
}

// ─── hook ────────────────────────────────────────────────────────────────────

export function useKtHelper() {
    const { setKnowledges, setCards, setIsLoading, setError } = useKtStore();
    const { enqueueSnackbar } = useSnackbar();

    // ── Knowledge ─────────────────────────────────────────────────────────────

    const loadKnowledges = useCallback(async () => {
        setIsLoading(true);
        setError(null);
        try {
            const result = await ktService._getKnowledges({ deletedAt: "null" });
            if (result.success && result.data) {
                setKnowledges(result.data.map(toKnowledge));
            }
        } catch (err) {
            const msg = "Failed to load knowledges";
            setError(msg);
            console.error(msg, err);
        } finally {
            setIsLoading(false);
        }
    }, [setKnowledges, setIsLoading, setError]);

    const upsertKnowledge = useCallback(async (dto: UpsertKnowledgeDTO): Promise<Knowledge | null> => {
        try {
            const result = await ktService._upsertKnowledges([dto]);
            if (result.success && result.data?.[0]) {
                await loadKnowledges();
                return toKnowledge(result.data[0]);
            }
            return null;
        } catch (err) {
            enqueueSnackbar("Failed to save knowledge", { variant: "error" });
            console.error(err);
            return null;
        }
    }, [loadKnowledges, enqueueSnackbar]);

    const deleteKnowledge = useCallback(async (item: Knowledge) => {
        try {
            await ktService._upsertKnowledges([{
                id: item.id,
                title: item.title,
                parentId: item.parentId,
                deletedAt: new Date().toISOString(),
            }]);
            await loadKnowledges();
        } catch (err) {
            enqueueSnackbar("Failed to delete knowledge", { variant: "error" });
            console.error(err);
        }
    }, [loadKnowledges, enqueueSnackbar]);

    // ── Cards ─────────────────────────────────────────────────────────────────

    const loadCards = useCallback(async (knowledgeId: number) => {
        setIsLoading(true);
        setError(null);
        try {
            const result = await ktService._getCards({ knowledgeId, deletedAt: "null" });
            if (result.success && result.data) {
                setCards(result.data.map(toCard));
            }
        } catch (err) {
            const msg = "Failed to load cards";
            setError(msg);
            console.error(msg, err);
        } finally {
            setIsLoading(false);
        }
    }, [setCards, setIsLoading, setError]);

    const upsertCard = useCallback(async (dto: UpsertKnowledgeCardDTO): Promise<KnowledgeCard | null> => {
        try {
            const result = await ktService._upsertCards([dto]);
            if (result.success && result.data?.[0]) {
                await loadCards(dto.knowledgeId);
                return toCard(result.data[0]);
            }
            return null;
        } catch (err) {
            enqueueSnackbar("Failed to save card", { variant: "error" });
            console.error(err);
            return null;
        }
    }, [loadCards, enqueueSnackbar]);

    const upsertCards = useCallback(async (dtos: UpsertKnowledgeCardDTO[]): Promise<KnowledgeCard[]> => {
        if (dtos.length === 0) return [];
        try {
            const result = await ktService._upsertCards(dtos);
            if (result.success && result.data) {
                if (dtos[0]) await loadCards(dtos[0].knowledgeId);
                return result.data.map(toCard);
            }
            return [];
        } catch (err) {
            enqueueSnackbar("Failed to save cards", { variant: "error" });
            console.error(err);
            return [];
        }
    }, [loadCards, enqueueSnackbar]);

    const deleteCard = useCallback(async (card: KnowledgeCard) => {
        try {
            await ktService._upsertCards([{
                id: card.id,
                knowledgeId: card.knowledgeId,
                parentCardId: card.parentCardId,
                keyword: card.keyword,
                title: card.title,
                description: card.description,
                isDefinition: card.isDefinition,
                linkedCardIds: card.linkedCardIds,
                deletedAt: new Date().toISOString(),
            }]);
            await loadCards(card.knowledgeId);
        } catch (err) {
            enqueueSnackbar("Failed to delete card", { variant: "error" });
            console.error(err);
        }
    }, [loadCards, enqueueSnackbar]);

    return { loadKnowledges, upsertKnowledge, deleteKnowledge, loadCards, upsertCard, upsertCards, deleteCard };
}
