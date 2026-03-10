import { X, Check } from "lucide-react";
import { useKnowledgeCardStore } from "@/store/kt/KnowledgeCard.store";
import { isAncestor } from "@/hooks/kt/useKnowledgeCard.helper";

/**
 * ParentPicker — dropdown chọn parent cho một card.
 * Nhận cardId (card cần đổi parent) và onSelect callback.
 * Không nhận allCards/levelMap qua props — lấy từ store.
 */
export function ParentPicker({ cardId, currentParentId, onSelect }: {
    cardId: number;
    currentParentId: number | null;
    onSelect: (id: number | null) => void;
}) {
    const { cards, setParentPickerCardId } = useKnowledgeCardStore();

    const eligible = cards.filter(
        (c) => c.id !== cardId && !isAncestor(c.id, cardId, cards)
    );

    const close = () => setParentPickerCardId(null);

    return (
        <div className="absolute left-0 top-full mt-1 z-20 w-full min-w-[200px] bg-zinc-900 border border-zinc-700 rounded-lg shadow-xl overflow-hidden">
            <div className="flex items-center justify-between px-3 py-2 border-b border-zinc-800">
                <span className="text-[11px] text-zinc-500 uppercase tracking-widest">Set parent</span>
                <button onClick={close} className="text-zinc-600 hover:text-zinc-300"><X className="w-3.5 h-3.5" /></button>
            </div>
            <div className="max-h-48 overflow-y-auto py-1">
                <button onClick={() => { onSelect(null); close(); }}
                    className={`w-full text-left px-3 py-1.5 text-xs transition-colors
                        ${currentParentId === null ? "text-zinc-200 bg-zinc-800" : "text-zinc-500 hover:bg-zinc-800 hover:text-zinc-300"}`}>
                    — No parent (Level 1)
                </button>
                {eligible.map((c) => (
                    <button key={c.id} onClick={() => { onSelect(c.id); close(); }}
                        className={`w-full text-left px-3 py-1.5 text-xs flex items-center gap-2 transition-colors
                            ${currentParentId === c.id ? "text-zinc-200 bg-zinc-800" : "text-zinc-500 hover:bg-zinc-800 hover:text-zinc-300"}`}>
                        {c.isDefinition && <span className="text-green-500 shrink-0">✓</span>}
                        <span className="truncate">{c.title}</span>
                        {currentParentId === c.id && <Check className="w-3 h-3 ml-auto shrink-0 text-blue-400" />}
                    </button>
                ))}
            </div>
        </div>
    );
}
