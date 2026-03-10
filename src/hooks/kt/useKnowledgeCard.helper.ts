/**
 * useKnowledgeCard.helper.ts
 * View-layer logic: computed values, selection, highlight.
 * Pure functions: computeLevels, isAncestor, nextTempId.
 */

import { useMemo } from "react";
import { useKnowledgeCardStore } from "@/store/kt/KnowledgeCard.store";
import type { KnowledgeCard } from "@/types/knowledgeTree.types";

// ─── Pure helpers ─────────────────────────────────────────────────────────────

let _nextId = 100;
export const nextTempId = () => ++_nextId;

export function computeLevels(cards: KnowledgeCard[]): Map<number, number> {
    const map = new Map<number, number>();
    const resolve = (id: number, visited = new Set<number>()): number => {
        if (map.has(id)) return map.get(id)!;
        if (visited.has(id)) return 1;
        visited.add(id);
        const card = cards.find((c) => c.id === id);
        if (!card || card.parentCardId == null) { map.set(id, 1); return 1; }
        const level = resolve(card.parentCardId, visited) + 1;
        map.set(id, level);
        return level;
    };
    cards.forEach((c) => resolve(c.id));
    return map;
}

export function isAncestor(ancestorId: number, cardId: number, cards: KnowledgeCard[]): boolean {
    let current = cards.find((c) => c.id === cardId);
    const visited = new Set<number>();
    while (current && current.parentCardId != null) {
        if (visited.has(current.id)) break;
        visited.add(current.id);
        if (current.parentCardId === ancestorId) return true;
        current = cards.find((c) => c.id === current!.parentCardId);
    }
    return false;
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useKnowledgeCardHelper() {
    const { cards, selectedId, setSelectedId, activeLevel } = useKnowledgeCardStore();

    // ── computed ──────────────────────────────────────────────────────────────

    const levelMap = useMemo(() => computeLevels(cards), [cards]);

    const maxLevel = useMemo(() =>
        cards.length === 0 ? 0 : Math.max(...Array.from(levelMap.values())),
        [levelMap, cards.length]
    );

    const parentIds = useMemo(() =>
        new Set(cards.map((c) => c.parentCardId).filter((id): id is number => id != null)),
        [cards]
    );

    const visibleCards = useMemo((): KnowledgeCard[] =>
        activeLevel === null ? cards : cards.filter((c) => (levelMap.get(c.id) ?? 1) === activeLevel),
        [cards, levelMap, activeLevel]
    );

    const highlightedIds = useMemo(() => {
        if (selectedId === null) return new Set<number>();
        const sel = cards.find((c) => c.id === selectedId);
        if (!sel) return new Set<number>();
        const ids = new Set<number>([selectedId]);
        if (sel.isDefinition) {
            cards.filter((c) => !c.isDefinition && c.linkedCardIds.includes(selectedId)).forEach((c) => ids.add(c.id));
        } else {
            sel.linkedCardIds.forEach((id) => ids.add(id));
        }
        return ids;
    }, [selectedId, cards]);

    const isHighlighted = (id: number) => highlightedIds.has(id);
    const isDimmed = (id: number) => selectedId !== null && !highlightedIds.has(id);

    // ── selection ─────────────────────────────────────────────────────────────

    const toggleSelect = (id: number) =>
        setSelectedId((prev) => prev === id ? null : id);

    const selectByKeyword = (kw: string) => {
        const card = cards.find((c) => c.keyword === kw);
        if (!card) return;
        // reset level filter rồi highlight card có keyword đó
        setSelectedId(card.id);
    };

    return {
        levelMap, maxLevel, parentIds, visibleCards,
        isHighlighted, isDimmed,
        toggleSelect, selectByKeyword,
    };
}
