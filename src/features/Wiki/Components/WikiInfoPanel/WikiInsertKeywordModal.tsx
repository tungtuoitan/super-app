import { useEffect, useRef, useState } from "react";
import { X, Loader2, AlignLeft, List } from "lucide-react";
import { useWikiStore } from "../../store/useWiki.store";
import { useWikiLoader } from "../../hooks/useWikiLoader.helper";
import { wikiService } from "../../service/wiki.service";
import type { InputMode, KeywordRow, ParsedEntry } from "../../types/wiki.type";
import { mkRow, parseMarkdownKeywords } from "../../utils/wikiKeyword.utils";
import WikiKeywordTextMode from "../small/WikiKeywordTextMode";
import WikiKeywordFormMode from "../small/WikiKeywordFormMode";

interface Props {
    onClose: () => void;
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function WikiInsertKeywordModal({ onClose }: Props) {
    const { keywords }          = useWikiStore();
    const { loadAll }           = useWikiLoader();
    const [mode, setMode]       = useState<InputMode>("text");
    const [rows, setRows]       = useState<KeywordRow[]>([mkRow()]);
    const [mdText, setMdText]   = useState("");
    const [isSaving, setIsSaving] = useState(false);
    const listRef               = useRef<HTMLDivElement>(null);
    const textareaRef           = useRef<HTMLTextAreaElement>(null);

    // Focus name input when switching to form mode
    useEffect(() => {
        if (mode === "form") {
            const inputs = listRef.current?.querySelectorAll<HTMLInputElement>("input.kw-name-input");
            inputs?.[inputs.length - 1]?.focus();
        } else {
            textareaRef.current?.focus();
        }
    }, [mode, rows.length]);

    // ── Form mode helpers ──────────────────────────────────────────────────────

    const updateRow   = (id: string, patch: Partial<KeywordRow>) =>
        setRows(prev => prev.map(r => r.id === id ? { ...r, ...patch } : r));
    const removeRow   = (id: string) =>
        setRows(prev => prev.length > 1 ? prev.filter(r => r.id !== id) : prev);
    const addRow      = () => setRows(prev => [...prev, mkRow()]);
    const addSynonym  = (rowId: string) => {
        setRows(prev => prev.map(r => {
            if (r.id !== rowId) return r;
            const v = r.synonymInput.trim();
            if (!v || r.synonyms.includes(v)) return { ...r, synonymInput: "" };
            return { ...r, synonyms: [...r.synonyms, v], synonymInput: "" };
        }));
    };
    const removeSynonym = (rowId: string, syn: string) =>
        updateRow(rowId, { synonyms: rows.find(r => r.id === rowId)!.synonyms.filter(s => s !== syn) });

    // ── Derived data ───────────────────────────────────────────────────────────

    const existingNames = new Set(keywords.map(k => k.name.toLowerCase()));

    // Entries to save depending on mode
    const parsedEntries: ParsedEntry[] = mode === "text"
        ? parseMarkdownKeywords(mdText)
        : rows.map(r => ({ name: r.name.trim(), synonyms: r.synonyms }));

    const validEntries = (() => {
        const seen = new Set<string>();
        return parsedEntries.filter(e => {
            if (!e.name) return false;
            const lo = e.name.toLowerCase();
            if (existingNames.has(lo) || seen.has(lo)) return false;
            seen.add(lo);
            return true;
        });
    })();

    // ── Save ──────────────────────────────────────────────────────────────────

    const handleSave = async () => {
        if (validEntries.length === 0) return;
        setIsSaving(true);
        try {
            for (const entry of validEntries)
                await wikiService.createKeyword(entry.name, entry.synonyms);
            await loadAll();
            onClose();
        } finally {
            setIsSaving(false);
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === "Escape") onClose();
    };

    return (
        <div
            className="fixed inset-0 text-left bg-background/70 backdrop-blur-sm z-[1000000000000] flex items-center justify-center"
            onKeyDown={handleKeyDown}
        >
            <div className="bg-popover border border-sa-border-strong rounded-xl w-[520px] max-h-[82vh] flex flex-col sa-shadow-pop overflow-hidden">

                {/* Header */}
                <div className="px-5 pt-5 pb-3 flex items-start justify-between flex-shrink-0 border-b border-sa-border">
                    <div>
                        <h2 className="text-[15px] font-medium text-foreground tracking-tight">Add Keywords</h2>
                        <p className="text-xs text-muted-foreground mt-0.5">
                            {validEntries.length > 0
                                ? `${validEntries.length} keyword${validEntries.length > 1 ? "s" : ""} will be created`
                                : "Define keywords and their synonyms"}
                        </p>
                    </div>
                    <div className="flex items-center gap-2">
                        {/* Mode toggle */}
                        <div className="flex items-center bg-sa-surface-2 rounded-lg p-0.5 border border-sa-border">
                            <button
                                onClick={() => setMode("text")}
                                className={`flex items-center gap-1.5 h-6 px-2.5 rounded-md text-[11px] font-medium transition-colors ${
                                    mode === "text"
                                        ? "bg-sa-hover-strong text-foreground"
                                        : "text-muted-foreground hover:text-foreground"
                                }`}
                            >
                                <AlignLeft className="w-3 h-3" /> Text
                            </button>
                            <button
                                onClick={() => setMode("form")}
                                className={`flex items-center gap-1.5 h-6 px-2.5 rounded-md text-[11px] font-medium transition-colors ${
                                    mode === "form"
                                        ? "bg-sa-hover-strong text-foreground"
                                        : "text-muted-foreground hover:text-foreground"
                                }`}
                            >
                                <List className="w-3 h-3" /> Form
                            </button>
                        </div>
                        <button
                            onClick={onClose}
                            className="w-7 h-7 flex items-center justify-center rounded-md hover:bg-sa-hover-strong text-muted-foreground hover:text-foreground transition-colors duration-100"
                        >
                            <X className="w-4 h-4" />
                        </button>
                    </div>
                </div>

                {/* Body */}
                <div className="flex-1 overflow-y-auto">
                    {mode === "text" ? (
                        <WikiKeywordTextMode
                            textareaRef={textareaRef}
                            mdText={mdText}
                            setMdText={setMdText}
                            parsedEntries={parsedEntries}
                            existingNames={existingNames}
                        />
                    ) : (
                        <WikiKeywordFormMode
                            listRef={listRef}
                            rows={rows}
                            keywords={keywords}
                            updateRow={updateRow}
                            removeRow={removeRow}
                            addRow={addRow}
                            addSynonym={addSynonym}
                            removeSynonym={removeSynonym}
                        />
                    )}
                </div>

                {/* Footer */}
                <div className="px-5 py-3.5 border-t border-sa-border flex items-center justify-between flex-shrink-0">
                    <span className="text-[10px] text-muted-foreground/70">
                        {mode === "text" ? "# keyword  - synonym" : "Enter → next row"}
                    </span>
                    <div className="flex gap-2">
                        <button
                            onClick={onClose}
                            className="h-8 px-3.5 rounded-lg border border-sa-border-strong text-foreground text-xs font-medium hover:bg-sa-hover-strong hover:text-foreground transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={handleSave}
                            disabled={validEntries.length === 0 || isSaving}
                            className="h-8 px-4 rounded-lg bg-sa-amber text-sa-on-amber text-xs font-medium hover:bg-sa-amber/90 disabled:opacity-40 transition-colors flex items-center gap-1.5"
                        >
                            {isSaving && <Loader2 className="w-3 h-3 animate-spin" />}
                            {validEntries.length > 1 ? `Add ${validEntries.length} keywords` : "Add keyword"}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
