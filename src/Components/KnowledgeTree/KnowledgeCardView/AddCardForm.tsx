import { Check, GitBranch } from "lucide-react";
import { useKnowledgeCardStore } from "@/store/kt/KnowledgeCard.store";
import { useKnowledgeCardHelper } from "@/hooks/kt/useKnowledgeCard.helper";
import { useKnowledgeCardActions } from "@/hooks/kt/useKnowledgeCardActions.helper";
import { ParentPicker } from "./ParentPicker";
import { AutoResizeTextarea } from "./AutoResizeTextarea";

export function AddCardForm() {
    const { addDraft, setAddDraft, cards, parentPickerCardId, setParentPickerCardId } = useKnowledgeCardStore();
    const { levelMap } = useKnowledgeCardHelper();
    const { cancelAddForm, submitAddForm } = useKnowledgeCardActions();

    const { title, keyword, description, isDefinition, linkedCardIds, parentCardId } = addDraft;

    const set = <K extends keyof typeof addDraft>(key: K, value: typeof addDraft[K]) =>
        setAddDraft((prev) => ({ ...prev, [key]: value }));

    const parentCard = parentCardId != null ? cards.find((c) => c.id === parentCardId) : null;
    const previewLevel = parentCardId != null ? (levelMap.get(parentCardId) ?? 0) + 1 : 1;
    const isPickerOpen = parentPickerCardId === -1;

    const toggleLinked = (id: number) =>
        set("linkedCardIds", linkedCardIds.includes(id)
            ? linkedCardIds.filter((x) => x !== id)
            : [...linkedCardIds, id]
        );

    return (
        <div className="rounded-lg border border-blue-500/50 bg-zinc-800/80 flex flex-col h-52 overflow-hidden">
            {/* scrollable content */}
            <div className="flex-1 min-h-0 overflow-y-auto px-4 pt-3.5 flex flex-col gap-2.5">
                <div className="flex items-center gap-2">
                    <span className="text-[11px] font-mono text-zinc-500 border border-zinc-700 rounded px-1.5 py-0.5">L{previewLevel}</span>
                    <button onClick={() => set("isDefinition", !isDefinition)}
                        className={`flex items-center gap-1 text-xs px-2 py-0.5 rounded border transition-colors
                            ${isDefinition ? "border-green-600 bg-green-600/10 text-green-400" : "border-zinc-700 text-zinc-500 hover:border-zinc-500"}`}>
                        <Check className="w-3 h-3" /> Definition
                    </button>
                </div>
                <input autoFocus value={title} onChange={(e) => set("title", e.target.value)}
                    placeholder="Title"
                    className="w-full bg-transparent text-sm font-semibold text-zinc-100 outline-none shrink-0"
                    onKeyDown={(e) => { if (e.key === "Escape") cancelAddForm(); }}
                />
                {isDefinition && (
                    <input value={keyword} onChange={(e) => set("keyword", e.target.value)}
                        placeholder="Keyword cho [[link]] – mặc định dùng title"
                        className="w-full bg-transparent text-xs placeholder:opacity-20 text-zinc-500 outline-none border-b border-zinc-700 pb-1 shrink-0"
                        onKeyDown={(e) => { if (e.key === "Escape") cancelAddForm(); }}
                    />
                )}
                <AutoResizeTextarea value={description} onChange={(v) => set("description", v)}
                    placeholder="Description… dùng [[Keyword]] để link"
                    className="text-sm text-zinc-400 leading-relaxed"
                    onKeyDown={(e) => { if (e.key === "Escape") cancelAddForm(); }}
                />
                {!isDefinition && cards.filter((c) => c.isDefinition).length > 0 && (
                    <div>
                        <div className="text-[11px] text-zinc-600 mb-1.5">Linked definitions</div>
                        <div className="flex flex-wrap gap-1.5">
                            {cards.filter((c) => c.isDefinition).map((c) => (
                                <button key={c.id} onClick={() => toggleLinked(c.id)}
                                    className={`text-xs px-2 py-0.5 rounded border transition-colors
                                        ${linkedCardIds.includes(c.id) ? "border-blue-500 bg-blue-500/20 text-blue-300" : "border-zinc-600 text-zinc-500 hover:border-zinc-500"}`}>
                                    {c.title}
                                </button>
                            ))}
                        </div>
                    </div>
                )}
                <div className="relative">
                    <button onClick={() => setParentPickerCardId(isPickerOpen ? null : -1)}
                        className={`flex items-center gap-1.5 text-xs rounded px-2 py-0.5 border transition-colors
                            ${parentCard ? "border-zinc-700 text-zinc-400" : "border-zinc-800 text-zinc-600 hover:border-zinc-700 hover:text-zinc-500"}`}>
                        <GitBranch className="w-3 h-3" />
                        {parentCard ? <span className="truncate max-w-[160px]">{parentCard.title}</span> : "Set parent"}
                    </button>
                    {isPickerOpen && (
                        <ParentPicker
                            cardId={-1}
                            currentParentId={parentCardId ?? null}
                            onSelect={(id) => set("parentCardId", id ?? undefined)}
                        />
                    )}
                </div>
            </div>

            {/* footer actions — cố định ở dưới */}
            <div className="shrink-0 flex gap-2 px-4 py-2.5 border-t border-zinc-800/60">
                <button onClick={(e) => { e.stopPropagation(); submitAddForm(); }}
                    className="flex items-center gap-1 text-xs px-2.5 py-1 rounded bg-zinc-700 text-zinc-200 hover:bg-zinc-600">
                    <Check className="w-3 h-3" /> Add
                </button>
                <button onClick={cancelAddForm} className="text-xs px-2.5 py-1 rounded text-zinc-500 hover:text-zinc-300">Cancel</button>
            </div>
        </div>
    );
}
