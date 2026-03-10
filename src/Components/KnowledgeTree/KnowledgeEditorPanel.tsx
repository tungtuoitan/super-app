import { useMemo, useEffect } from "react";
import { ChevronRight } from "lucide-react";
import { KnowledgeCardView } from "./KnowledgeCardView/index";
import { KnowledgeCardProvider, useKnowledgeCardStore } from "@/store/kt/KnowledgeCard.store";
import { useKtStore } from "@/store/kt/useKt.store";
import { useKtHelper } from "@/hooks/kt/useKt.helper";
import type { KnowledgeCard } from "@/types/knowledgeTree.types";

interface KnowledgeEditorPanelProps {
    knowledgeId: number;
}

function getDescendantIds(rootId: number, allCards: KnowledgeCard[]): Set<number> {
    const result = new Set<number>();
    const queue = [rootId];
    while (queue.length > 0) {
        const id = queue.shift()!;
        allCards.forEach((c) => {
            if (c.parentCardId === id && !result.has(c.id)) {
                result.add(c.id);
                queue.push(c.id);
            }
        });
    }
    return result;
}

// ─── Inner (runs inside KnowledgeCardProvider) ────────────────────────────────

function KnowledgeEditorPanelInner({ knowledgeId }: KnowledgeEditorPanelProps) {
    const { cards, isLoading, knowledges } = useKtStore();
    const { loadCards } = useKtHelper();
    const {
        setKnowledgeId,
        breadcrumbStack, setBreadcrumbStack,
        setScopedCards,
        openAsKnowledgeCardId, setOpenAsKnowledgeCardId,
    } = useKnowledgeCardStore();

    const knowledge = knowledges.find((k) => k.id === knowledgeId) ?? null;

    // Khi mount (mỗi instance chỉ mount 1 lần cho 1 knowledgeId cố định)
    useEffect(() => {
        setKnowledgeId(knowledgeId);
        loadCards(knowledgeId);
        if (knowledge) setBreadcrumbStack([{ id: null, title: knowledge.title }]);
    }, [knowledgeId]);

    // Sync title vào breadcrumb root nếu knowledge.title thay đổi sau khi load
    useEffect(() => {
        if (!knowledge) return;
        setBreadcrumbStack((prev) => {
            if (prev.length === 0) return [{ id: null, title: knowledge.title }];
            if (prev[0].title === knowledge.title) return prev;
            return [{ ...prev[0], title: knowledge.title }, ...prev.slice(1)];
        });
    }, [knowledge?.title]);

    // Watch signal "Open as knowledge" từ CardItem → push breadcrumb
    useEffect(() => {
        if (openAsKnowledgeCardId == null) return;
        const card = cards.find((c) => c.id === openAsKnowledgeCardId);
        if (card) setBreadcrumbStack((prev) => {
            // Không push nếu card đó đã là entry cuối cùng
            if (prev[prev.length - 1]?.id === card.id) return prev;
            return [...prev, { id: card.id, title: card.title }];
        });
        setOpenAsKnowledgeCardId(null);
    }, [openAsKnowledgeCardId]);

    const knowledgeCards = useMemo(
        () => cards.filter((c) => c.knowledgeId === knowledgeId),
        [cards, knowledgeId]
    );

    const current = breadcrumbStack[breadcrumbStack.length - 1];

    const scopedCards = useMemo(() => {
        if (!current || current.id === null) return knowledgeCards;
        const descIds = getDescendantIds(current.id, knowledgeCards);
        return knowledgeCards.filter((c) => descIds.has(c.id));
    }, [current?.id, knowledgeCards]);

    useEffect(() => { setScopedCards(scopedCards); }, [scopedCards]);

    const defCount = scopedCards.filter((c) => c.isDefinition).length;
    const relCount = scopedCards.filter((c) => !c.isDefinition).length;

    return (
        <div className="flex flex-col h-full w-full">
            {/* breadcrumb + stats */}
            <div className="flex items-center gap-2 px-6 py-2.5 border-b border-zinc-800 shrink-0 min-w-0">
                <div className="flex items-center gap-1 min-w-0 flex-1">
                    {breadcrumbStack.map((entry, i) => {
                        const isLast = i === breadcrumbStack.length - 1;
                        return (
                            <span key={i} className="flex items-center gap-1 min-w-0">
                                {i > 0 && <ChevronRight className="w-3.5 h-3.5 text-zinc-600 shrink-0" />}
                                <button
                                    onClick={() => setBreadcrumbStack((prev) => prev.slice(0, i + 1))}
                                    disabled={isLast}
                                    className={`text-sm truncate transition-colors ${
                                        isLast ? "font-semibold text-zinc-100 cursor-default" : "text-zinc-500 hover:text-zinc-300"
                                    }`}
                                >
                                    {entry.title}
                                </button>
                            </span>
                        );
                    })}
                </div>
                <div className="ml-auto flex items-center gap-3 text-[11px] text-zinc-600 shrink-0">
                    {isLoading
                        ? <span>Loading…</span>
                        : <><span>{defCount} def</span><span>{relCount} rel</span></>
                    }
                </div>
            </div>

            <div className="flex-1 min-h-0">
                <KnowledgeCardView />
            </div>
        </div>
    );
}

// ─── Public export ────────────────────────────────────────────────────────────

export function KnowledgeEditorPanel({ knowledgeId }: KnowledgeEditorPanelProps) {
    return (
        <KnowledgeCardProvider>
            <KnowledgeEditorPanelInner knowledgeId={knowledgeId} />
        </KnowledgeCardProvider>
    );
}
