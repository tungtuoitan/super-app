import { useEffect } from "react";
import { Plus } from "lucide-react";
import { useKnowledgeCardStore } from "@/store/kt/KnowledgeCard.store";
import { useKnowledgeCardHelper } from "@/hooks/kt/useKnowledgeCard.helper";
import { useKnowledgeCardActions } from "@/hooks/kt/useKnowledgeCardActions.helper";
import { CardItem } from "./CardItem";
import { AddCardForm } from "./AddCardForm";
import { LevelTabs } from "./LevelTabs";

export function KnowledgeCardView() {
    const { scopedCards, setCards, adding, activeLevel } = useKnowledgeCardStore();
    const { maxLevel, visibleCards } = useKnowledgeCardHelper();
    const { openAddForm } = useKnowledgeCardActions();

    // sync scopedCards (breadcrumb-filtered) vào cards của store để helper tính toán
    useEffect(() => { setCards(scopedCards); }, [scopedCards]);

    return (
        <div className="h-full overflow-y-auto px-6 py-6">
            {/* toolbar */}
            <div className="flex items-center justify-between mb-5 gap-4">
                <LevelTabs maxLevel={maxLevel} />
                <div className="flex items-center gap-3">
                    <span className="text-[11px] text-zinc-600">
                        {visibleCards.length} card{visibleCards.length !== 1 ? "s" : ""}
                        {activeLevel !== null ? ` · L${activeLevel}` : ""}
                    </span>
                    <button onClick={openAddForm}
                        className="flex items-center gap-1 text-xs text-zinc-500 hover:text-zinc-300 px-2 py-1 rounded hover:bg-zinc-800 transition-colors">
                        <Plus className="w-3.5 h-3.5" /> Add
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-4 gap-3">
                {adding && (
                    <div onMouseDown={(e) => e.stopPropagation()}>
                        <AddCardForm />
                    </div>
                )}
                {visibleCards.map((card) => (
                    <CardItem key={card.id} card={card} />
                ))}
            </div>

            {visibleCards.length === 0 && !adding && (
                <div className="text-center text-zinc-600 text-sm pt-12">
                    No cards{activeLevel !== null ? ` at level ${activeLevel}` : ""}
                </div>
            )}
        </div>
    );
}
