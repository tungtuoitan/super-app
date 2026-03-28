import { useState, useRef, useEffect } from "react";
import { X, HelpCircle } from "lucide-react";
import { useKNodeEditorLoader } from "../../hooks/useKNodeEditor.loader";
import { useKNodeEditorStore } from "../../store/KNodeEditor.store";
import { CARD_HEIGHT } from "../../hooks/kNodeEditor.miniHelper";
import { AutoResizeTextarea } from "./AutoResizeTextarea";
import { IconPicker } from "@/shared/components/ui/IconPicker";
import type { IconType } from "../../shared/icons/icon.types";
import { ICON_MAP } from "../../shared/icons/icon.config";

export function InlineNewNodeCard() {
    const { inlineNewParentId } = useKNodeEditorStore();
    const { handleInlineCreate, handleCancelInline } = useKNodeEditorLoader();

    const [draft, setDraft] = useState({ name: "", description: "", icon: 'LIBRARIES' as IconType | null, color: 'GREY' as string | null });
    const [showIconPicker, setShowIconPicker] = useState(false);
    const inputRef = useRef<HTMLInputElement>(null);
    const pickerRef = useRef<HTMLDivElement>(null);

    const isQuestion = draft.name.trimEnd().endsWith("?");

    useEffect(() => {
        setTimeout(() => inputRef.current?.focus(), 50);
    }, []);

    // Close picker on outside click
    useEffect(() => {
        if (!showIconPicker) return;
        const handler = (e: MouseEvent) => {
            if (!pickerRef.current?.contains(e.target as Node)) setShowIconPicker(false);
        };
        document.addEventListener("mousedown", handler);
        return () => document.removeEventListener("mousedown", handler);
    }, [showIconPicker]);

    const handleIconChange = (iconType: IconType | null, defaultColor: string) => {
        setDraft(prev => ({ ...prev, icon: iconType, color: defaultColor }));
        setShowIconPicker(false);
    };

    const IconComponent = draft.icon && ICON_MAP[draft.icon as IconType] ? ICON_MAP[draft.icon as IconType] : null;

    return (
        <div
            className={`relative rounded-lg border flex flex-col ${CARD_HEIGHT} transition-all duration-150 border-blue-500/60`}
            style={{ backgroundColor: "#0a0a0a" }}
        >
            {/* Icon button — top left */}
            <div className="absolute top-2 left-2 z-10" ref={pickerRef}>
                {isQuestion ? (
                    <div className="w-5 h-5 flex items-center justify-center pointer-events-none">
                        <HelpCircle className="w-3.5 h-3.5" style={{ color: "#6b7280" }} strokeWidth={2} />
                    </div>
                ) : (
                    <button
                        onClick={() => setShowIconPicker(v => !v)}
                        className="w-5 h-5 flex items-center justify-center rounded hover:bg-zinc-800 transition-colors"
                        title="Pick icon"
                    >
                        {IconComponent
                            ? <IconComponent className="w-3.5 h-3.5" style={{ color: draft.color || "#75beff" }} strokeWidth={2} />
                            : <span className="text-[10px] text-zinc-600">+icon</span>
                        }
                    </button>
                )}
                {!isQuestion && showIconPicker && (
                    <div className="absolute top-6 left-0 z-50 bg-zinc-900 border border-zinc-700 rounded-lg shadow-2xl" style={{ width: 280 }}>
                        <IconPicker
                            value={draft.icon as IconType | null}
                            onChange={handleIconChange}
                            columns={4}
                            maxHeight="240px"
                            showGroupLabels={false}
                            showSearch={true}
                        />
                    </div>
                )}
            </div>

            {/* header */}
            <div className="flex items-center gap-1.5 px-4 pt-3.5 pb-2 shrink-0 h-8">
                <span className="text-[10px] font-mono text-zinc-600 border border-zinc-800 rounded px-1.5 py-0.5 leading-none">
                    New
                </span>
                <div className="ml-auto flex items-center gap-1">
                    <button
                        onClick={() => handleInlineCreate(draft, inlineNewParentId ?? null)}
                        disabled={!draft.name.trim()}
                        className="text-[11px] text-zinc-400 hover:text-green-400 disabled:opacity-30 px-1.5 py-0.5 rounded"
                    >
                        Save
                    </button>
                    <button
                        onClick={handleCancelInline}
                        className="text-zinc-600 hover:text-zinc-300 p-0.5 rounded"
                    >
                        <X className="w-3.5 h-3.5" />
                    </button>
                </div>
            </div>

            {/* name input */}
            <div className="px-4 shrink-0">
                <input
                    ref={inputRef}
                    value={draft.name}
                    onChange={(e) => setDraft(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="Name"
                    className="w-full bg-transparent text-sm font-semibold text-left outline-none border-b border-zinc-700 pb-0.5"
                    style={{ color: isQuestion ? "#ffffff" : (draft.color || "#f4f4f5") }}
                    onKeyDown={(e) => {
                        if (e.key === "Escape") handleCancelInline();
                        if (e.key === "Enter") handleInlineCreate(draft, inlineNewParentId ?? null);
                    }}
                />
            </div>

            {/* description */}
            <div className="px-4 pt-2 flex-1 min-h-0 overflow-y-auto">
                <AutoResizeTextarea
                    value={draft.description}
                    onChange={(v) => setDraft(prev => ({ ...prev, description: v }))}
                    placeholder="Description… (Shift+Enter for new line)"
                    className="text-xs text-zinc-400 leading-relaxed w-full text-left"
                    onKeyDown={(e) => {
                        if (e.key === "Escape") handleCancelInline();
                        if (e.key === "Enter" && !e.shiftKey) {
                            e.preventDefault();
                            handleInlineCreate(draft, inlineNewParentId ?? null);
                        }
                    }}
                />
            </div>

            <div className="px-4 pb-3 pt-2 shrink-0 border-t border-zinc-800/60" />
        </div>
    );
}
