import { useRef } from "react";
import { useDrag, useDrop } from "react-dnd";
import { Trash2, GitBranch } from "lucide-react";
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


// Background tối dần theo level, L3+ thêm opacity 50
// DÙNG OPACITY
// function getLevelStyle(level: number): { className: string; style?: React.CSSProperties } {
//     if (level === 1) return { className: "",            style: { backgroundColor: "#111318" } };
//     if (level === 2) return { className: "opacity-80",            style: { backgroundColor: "#13151a" } };
//     if (level === 3) return { className: "opacity-50",            style: { backgroundColor: "#16181D" } };
//     return             { className: "opacity-50",       style: { backgroundColor: "#1B1D23" } };
// }
// DÙNG MÀU
function getLevelStyle(level: number): { className: string; style?: React.CSSProperties } {
    if (level === 1) return { className: "",            style: { backgroundColor: "#111318" } };
    if (level === 2) return { className: "",            style: { backgroundColor: "#14171C" } };
    if (level === 3) return { className: "",            style: { backgroundColor: "#181A20" } };
    return             { className: "",       style: { backgroundColor: "#1B1D23" } };
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
        selectByKeyword,
    } = useKnowledgeCardHelper();

    const {
        openEdit, cancelEdit, submitEdit,
        deleteCard, reparentCard, saveParent,
    } = useKnowledgeCardActions();

    const level = levelMap.get(card.id) ?? 1;
    const highlighted = isHighlighted(card.id);
    const dimmed = isDimmed(card.id);
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

    // ── edit mode — cùng cấu trúc layout với view mode ───────────────────────

    if (isEditing) {
        const ls = getLevelStyle(level);
        return (
            <div className={`rounded-lg border border-zinc-600 flex flex-col ${CARD_HEIGHT} ${ls.className}`}
                style={ls.style}
                onMouseDown={(e) => {
                    const tag = (e.target as HTMLElement).tagName;
                    if (tag !== "INPUT" && tag !== "TEXTAREA" && tag !== "BUTTON") e.stopPropagation();
                }}>

                {/* header — giống view mode, thêm toggle def */}
                <div className="flex items-center gap-1.5 px-4 pt-3.5 pb-2 shrink-0">
                    <span className="text-[10px] font-mono text-zinc-600 border border-zinc-800 rounded px-1.5 py-0.5 leading-none">
                        L{level}
                    </span>
                    <button onClick={() => setDraft("isDefinition", !editDraft.isDefinition)}
                        className={`text-[10px] px-1.5 py-0.5 rounded border leading-none transition-colors
                            ${editDraft.isDefinition
                                ? "border-green-800 text-green-500 bg-green-900/20"
                                : "border-zinc-700 text-zinc-600 hover:border-zinc-600 hover:text-zinc-400"}`}>
                        {editDraft.isDefinition ? "✓ def" : "rel"}
                    </button>
                    <div className="ml-auto flex items-center gap-1">
                        <button onMouseDown={(e) => e.stopPropagation()} onClick={() => submitEdit(card, editDraft)}
                            className="text-[11px] text-zinc-400 hover:text-zinc-100 px-1.5 py-0.5 rounded hover:bg-zinc-700 transition-colors">
                            Save
                        </button>
                        <button onMouseDown={(e) => e.stopPropagation()} onClick={cancelEdit}
                            className="text-[11px] text-zinc-600 hover:text-zinc-400 px-1.5 py-0.5 rounded transition-colors">
                            ✕
                        </button>
                    </div>
                </div>

                {/* title input — cùng vị trí với title view */}
                <div className="px-4 shrink-0">
                    <input
                        autoFocus
                        value={editDraft.title}
                        onChange={(e) => setDraft("title", e.target.value)}
                        placeholder="Title"
                        className="w-full bg-transparent text-sm font-semibold text-zinc-100 text-left outline-none border-b border-zinc-700 pb-0.5"
                        onKeyDown={(e) => { if (e.key === "Escape") cancelEdit(); if (e.key === "Enter") submitEdit(card, editDraft); }}
                    />
                </div>

                {/* description textarea — cùng vùng scroll với view */}
                <div className="px-4 pt-2 flex-1 min-h-0 overflow-y-auto">
                    <AutoResizeTextarea
                        value={editDraft.description}
                        onChange={(v) => setDraft("description", v)}
                        placeholder="Description…"
                        className="text-xs text-zinc-400 leading-relaxed w-full text-left"
                        onKeyDown={(e) => { if (e.key === "Escape") cancelEdit(); }}
                    />
                    {!editDraft.isDefinition && cards.filter((c) => c.isDefinition).length > 0 && (
                        <div className="mt-2">
                            <div className="text-[10px] text-zinc-600 mb-1">Linked</div>
                            <div className="flex flex-wrap gap-1">
                                {cards.filter((c) => c.isDefinition).map((c) => (
                                    <button key={c.id} onClick={() => toggleLinked(c.id)}
                                        className={`text-[10px] px-1.5 py-0.5 rounded border transition-colors
                                            ${editDraft.linkedCardIds.includes(c.id)
                                                ? "border-blue-600 bg-blue-600/20 text-blue-300"
                                                : "border-zinc-700 text-zinc-500 hover:border-zinc-500"}`}>
                                        {c.title}
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                {/* footer — cùng vị trí với footer view */}
                <div className="px-4 pb-3 pt-2 shrink-0 border-t border-zinc-800/60" />
            </div>
        );
    }

    // ── view mode ─────────────────────────────────────────────────────────────

    const ls = getLevelStyle(level);
    const cardBase = `group relative rounded-lg border flex flex-col ${CARD_HEIGHT} transition-all duration-150 ${ls.className}`;
    const cardState = dropActive
        ? "border-blue-400 cursor-copy"
        : isDragging
        ? "border-zinc-700 opacity-40 cursor-grabbing"
        : highlighted
        ? "border-zinc-400 cursor-pointer"
        : dimmed
        ? "border-zinc-800 opacity-30 pointer-events-none"
        : "border-zinc-700/50 hover:border-zinc-600 cursor-grab";

    return (
        <div ref={cardRef} className={`${cardBase} ${cardState}`}
            style={ls.style}
            onClick={() => setOpenAsKnowledgeCardId(card.id)}>
            {dropActive && (
                <div className="absolute inset-0 rounded-lg flex items-center justify-center pointer-events-none z-10">
                    <span className="text-xs text-blue-300 bg-blue-900/80 px-2 py-1 rounded">Drop to set parent</span>
                </div>
            )}

            {/* header */}
            <div className="flex items-center gap-1.5 px-4 pt-3.5 pb-2 shrink-0 h-8">
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
            </div>
        </div>
    );
}
