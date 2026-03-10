import { useRef } from "react";
import { useDrag, useDrop } from "react-dnd";
import { Trash2, Check, GitBranch, Layers } from "lucide-react";
import type { KnowledgeCard } from "@/types/knowledgeTree.types";
import { useKnowledgeCardStore } from "@/store/kt/KnowledgeCard.store";
import { useKnowledgeCardHelper, isAncestor } from "@/hooks/kt/useKnowledgeCard.helper";
import { useKnowledgeCardActions } from "@/hooks/kt/useKnowledgeCardActions.helper";
import { ParentPicker } from "./ParentPicker";
import { AutoResizeTextarea } from "./AutoResizeTextarea";

function renderWithLinks(text: string, onKeywordClick: (kw: string) => void) {
    return text.split(/(\[\[.*?\]\])/g).map((part, i) => {
        const m = part.match(/^\[\[(.*?)\]\]$/);
        if (m)
            return (
                <button key={i} onClick={(e) => { e.stopPropagation(); onKeywordClick(m[1]); }}
                    className="text-zinc-200 hover:text-white underline decoration-dotted underline-offset-2">
                    {m[1]}
                </button>
            );
        return <span key={i}>{part}</span>;
    });
}


const DND_TYPE = "KNOWLEDGE_CARD";
const CARD_HEIGHT = "h-52";

/** Chỉ nhận `card` — toàn bộ state/action lấy từ store và helper. */
export function CardItem({ card }: { card: KnowledgeCard }) {
    const {
        cards,
        selectedId,
        editingCardId, editDraft, setEditDraft,
        parentPickerCardId, setParentPickerCardId,
        setOpenAsKnowledgeCardId,
    } = useKnowledgeCardStore();

    const {
        levelMap, parentIds,
        isHighlighted, isDimmed,
        toggleSelect, selectByKeyword,
    } = useKnowledgeCardHelper();

    const {
        openEdit, cancelEdit, submitEdit,
        deleteCard, reparentCard, saveParent,
    } = useKnowledgeCardActions();

    const level = levelMap.get(card.id) ?? 1;
    const highlighted = isHighlighted(card.id);
    const dimmed = isDimmed(card.id);
    const hasChildren = parentIds.has(card.id);
    const isEditing = editingCardId === card.id;
    const isPickerOpen = parentPickerCardId === card.id;
    const parentCard = card.parentCardId != null ? cards.find((c) => c.id === card.parentCardId) : null;

    // ── DnD ──────────────────────────────────────────────────────────────────

    const [{ isDragging }, dragRef] = useDrag(() => ({
        type: DND_TYPE,
        item: { id: card.id },
        collect: (monitor) => ({ isDragging: monitor.isDragging() }),
    }), [card.id]);

    const [{ isOver, canDrop }, dropRef] = useDrop(() => ({
        accept: DND_TYPE,
        canDrop: (item: { id: number }) =>
            item.id !== card.id && !isAncestor(item.id, card.id, cards),
        drop: (item: { id: number }) => reparentCard(item.id, card.id),
        collect: (monitor) => ({ isOver: monitor.isOver(), canDrop: monitor.canDrop() }),
    }), [card.id, cards, reparentCard]);

    const cardRef = useRef<HTMLDivElement>(null);
    dragRef(cardRef);
    dropRef(cardRef);

    const dropActive = isOver && canDrop;

    // ── edit draft ────────────────────────────────────────────────────────────

    const setDraft = <K extends keyof typeof editDraft>(key: K, value: typeof editDraft[K]) =>
        setEditDraft((prev) => ({ ...prev, [key]: value }));

    const toggleLinked = (id: number) =>
        setDraft("linkedCardIds", editDraft.linkedCardIds.includes(id)
            ? editDraft.linkedCardIds.filter((x) => x !== id)
            : [...editDraft.linkedCardIds, id]
        );

    // ── edit mode ─────────────────────────────────────────────────────────────

    if (isEditing) {
        return (
            <div className="rounded-lg border border-blue-500/50 bg-zinc-800/80 px-4 py-3.5 flex flex-col gap-2.5"
                onMouseDown={(e) => e.stopPropagation()}>
                <div className="flex items-center gap-2">
                    <span className="text-[11px] font-mono text-zinc-600 border border-zinc-700 rounded px-1.5 py-0.5">L{level}</span>
                    <button onClick={() => setDraft("isDefinition", !editDraft.isDefinition)}
                        className={`flex items-center gap-1 text-xs px-2 py-0.5 rounded border transition-colors
                            ${editDraft.isDefinition ? "border-green-600 bg-green-600/10 text-green-400" : "border-zinc-700 text-zinc-500 hover:border-zinc-500"}`}>
                        <Check className="w-3 h-3" /> Definition
                    </button>
                </div>
                <input autoFocus value={editDraft.title} onChange={(e) => setDraft("title", e.target.value)}
                    placeholder="Title"
                    className="w-full bg-transparent text-sm font-semibold text-zinc-100 outline-none"
                    onKeyDown={(e) => { if (e.key === "Escape") cancelEdit(); }}
                />
                {editDraft.isDefinition && (
                    <input value={editDraft.keyword} onChange={(e) => setDraft("keyword", e.target.value)}
                        placeholder="Keyword cho [[link]] – mặc định dùng title"
                        className="w-full bg-transparent text-xs text-zinc-500 outline-none border-b border-zinc-700 pb-1"
                        onKeyDown={(e) => { if (e.key === "Escape") cancelEdit(); }}
                    />
                )}
                <AutoResizeTextarea value={editDraft.description} onChange={(v) => setDraft("description", v)}
                    placeholder="Description… dùng [[Keyword]] để link"
                    className="text-sm text-zinc-400 leading-relaxed"
                    onKeyDown={(e) => { if (e.key === "Escape") cancelEdit(); }}
                />
                {!editDraft.isDefinition && (
                    <div>
                        <div className="text-[11px] text-zinc-600 mb-1.5">Linked definitions</div>
                        <div className="flex flex-wrap gap-1.5">
                            {cards.filter((c) => c.isDefinition).map((c) => (
                                <button key={c.id} onClick={() => toggleLinked(c.id)}
                                    className={`text-xs px-2 py-0.5 rounded border transition-colors
                                        ${editDraft.linkedCardIds.includes(c.id)
                                            ? "border-blue-500 bg-blue-500/20 text-blue-300"
                                            : "border-zinc-600 text-zinc-500 hover:border-zinc-500"}`}>
                                    {c.title}
                                </button>
                            ))}
                        </div>
                    </div>
                )}
                <div className="flex gap-2">
                    <button onClick={() => submitEdit(card, editDraft)}
                        className="flex items-center gap-1 text-xs px-2.5 py-1 rounded bg-zinc-700 text-zinc-200 hover:bg-zinc-600">
                        <Check className="w-3 h-3" /> Save
                    </button>
                    <button onClick={cancelEdit} className="text-xs px-2.5 py-1 rounded text-zinc-500 hover:text-zinc-300">Cancel</button>
                </div>
            </div>
        );
    }

    // ── view mode ─────────────────────────────────────────────────────────────

    const cardBase = `group relative rounded-lg border flex flex-col ${CARD_HEIGHT} transition-all duration-150`;
    const cardState = dropActive
        ? "border-blue-400 bg-blue-500/10 cursor-copy"
        : isDragging
        ? "border-zinc-700 bg-zinc-900 opacity-40 cursor-grabbing"
        : highlighted
        ? "border-zinc-400 bg-zinc-800 cursor-pointer"
        : dimmed
        ? "border-zinc-800 bg-transparent opacity-30 pointer-events-none"
        : "border-zinc-700/50 bg-zinc-900 hover:border-zinc-600 hover:bg-zinc-800/60 cursor-grab";

    return (
        <div ref={cardRef} className={`${cardBase} ${cardState}`} onClick={() => toggleSelect(card.id)}>
            {dropActive && (
                <div className="absolute inset-0 rounded-lg flex items-center justify-center pointer-events-none z-10">
                    <span className="text-xs text-blue-300 bg-blue-900/80 px-2 py-1 rounded">Drop to set parent</span>
                </div>
            )}

            {/* header */}
            <div className="flex items-center gap-1.5 px-4 pt-3.5 pb-2 shrink-0">
                <span className="text-[10px] font-mono text-zinc-600 border border-zinc-800 rounded px-1.5 py-0.5 leading-none">
                    L{level}
                </span>
                {card.isDefinition && (
                    <span className="text-[10px] text-green-500 border border-green-900 rounded px-1.5 py-0.5 leading-none">✓ def</span>
                )}
                <div className="ml-auto hidden group-hover:flex items-center gap-1">
                    <button onClick={(e) => { e.stopPropagation(); openEdit(card); }}
                        className="text-[11px] text-zinc-500 hover:text-zinc-300 px-1.5 py-0.5 rounded">Edit</button>
                    <button onClick={(e) => { e.stopPropagation(); deleteCard(card.id); }}
                        className="text-zinc-600 hover:text-red-400 p-0.5 rounded"><Trash2 className="w-3.5 h-3.5" /></button>
                </div>
            </div>

            {/* title */}
            <div className="px-4 text-sm font-semibold text-zinc-100 leading-snug shrink-0 line-clamp-2">
                {card.title}
            </div>

            {/* description */}
            <div className="px-4 pt-1.5 flex-1 min-h-0 overflow-y-auto">
                <div className="text-xs text-zinc-400 leading-relaxed whitespace-pre-line">
                    {renderWithLinks(card.description, selectByKeyword)}
                </div>
            </div>

            {/* footer */}
            <div className="px-4 pb-3 pt-2 shrink-0 flex items-center gap-2 border-t border-zinc-800/60 mt-auto"
                onClick={(e) => e.stopPropagation()}>
                <div className="relative flex-1 min-w-0">
                    <button onClick={() => setParentPickerCardId(isPickerOpen ? null : card.id)}
                        className={`flex items-center gap-1.5 text-xs rounded px-2 py-0.5 border transition-colors max-w-full
                            ${parentCard
                                ? "border-zinc-700 text-zinc-400 hover:border-zinc-500 hover:text-zinc-200"
                                : "border-zinc-800 text-zinc-600 hover:border-zinc-700 hover:text-zinc-500"}`}>
                        <GitBranch className="w-3 h-3 shrink-0" />
                        <span className="truncate">{parentCard ? parentCard.title : "Set parent"}</span>
                    </button>
                    {isPickerOpen && (
                        <ParentPicker
                            cardId={card.id}
                            currentParentId={card.parentCardId ?? null}
                            onSelect={(id) => saveParent(card, id)}
                        />
                    )}
                </div>
                {hasChildren && (
                    <button onClick={() => setOpenAsKnowledgeCardId(card.id)}
                        className="flex items-center gap-1 text-xs text-zinc-500 hover:text-zinc-200 px-2 py-0.5 rounded border border-zinc-800 hover:border-zinc-600 transition-colors shrink-0">
                        <Layers className="w-3 h-3" />
                        Open
                    </button>
                )}
            </div>
        </div>
    );
}
