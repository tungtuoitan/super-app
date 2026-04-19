import { useEffect, useRef, useState } from "react";
import { X, Plus, Loader2, ChevronDown, AlignLeft, List } from "lucide-react";
import { useWikiStore } from "../../store/useWiki.store";
import { useWikiLoader } from "../../hooks/useWikiLoader.helper";
import { wikiService } from "../../service/wiki.service";
import type { WikiKeyword } from "../../types/wiki.type";

interface Props {
    onClose: () => void;
}

// ─── Types ────────────────────────────────────────────────────────────────────

type InputMode = "form" | "text";

interface KeywordRow {
    id: string;
    name: string;
    synonyms: string[];
    synonymInput: string;
    showSynonyms: boolean;
}

interface ParsedEntry {
    name: string;
    synonyms: string[];
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function mkRow(): KeywordRow {
    return { id: crypto.randomUUID(), name: "", synonyms: [], synonymInput: "", showSynonyms: false };
}

function parseMarkdownKeywords(text: string): ParsedEntry[] {
    const result: ParsedEntry[] = [];
    let current: ParsedEntry | null = null;

    for (const raw of text.split("\n")) {
        const line = raw.trim();
        if (line.startsWith("# ")) {
            if (current) result.push(current);
            const name = line.slice(2).trim();
            current = name ? { name, synonyms: [] } : null;
        } else if (line.startsWith("- ") && current) {
            const syn = line.slice(2).trim();
            if (syn && !current.synonyms.includes(syn)) current.synonyms.push(syn);
        }
    }
    if (current) result.push(current);
    return result;
}

const PLACEHOLDER = `# React
- ReactJS
- React.js

# TypeScript
- TS

# dependency injection
`;

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
            className="fixed inset-0 text-left bg-black/50 backdrop-blur-sm z-[1000000000000] flex items-center justify-center"
            onKeyDown={handleKeyDown}
        >
            <div className="bg-zinc-900 border border-white/[0.08] rounded-2xl w-[520px] max-h-[82vh] flex flex-col shadow-2xl overflow-hidden">

                {/* Header */}
                <div className="px-5 pt-5 pb-3 flex items-start justify-between flex-shrink-0 border-b border-white/[0.06]">
                    <div>
                        <h2 className="text-[15px] font-semibold text-zinc-100 tracking-tight">Add Keywords</h2>
                        <p className="text-xs text-zinc-500 mt-0.5">
                            {validEntries.length > 0
                                ? `${validEntries.length} keyword${validEntries.length > 1 ? "s" : ""} will be created`
                                : "Define keywords and their synonyms"}
                        </p>
                    </div>
                    <div className="flex items-center gap-2">
                        {/* Mode toggle */}
                        <div className="flex items-center bg-zinc-800 rounded-lg p-0.5 border border-white/[0.06]">
                            <button
                                onClick={() => setMode("text")}
                                className={`flex items-center gap-1.5 h-6 px-2.5 rounded-md text-[11px] font-medium transition-colors ${
                                    mode === "text"
                                        ? "bg-zinc-700 text-zinc-100"
                                        : "text-zinc-500 hover:text-zinc-300"
                                }`}
                            >
                                <AlignLeft className="w-3 h-3" /> Text
                            </button>
                            <button
                                onClick={() => setMode("form")}
                                className={`flex items-center gap-1.5 h-6 px-2.5 rounded-md text-[11px] font-medium transition-colors ${
                                    mode === "form"
                                        ? "bg-zinc-700 text-zinc-100"
                                        : "text-zinc-500 hover:text-zinc-300"
                                }`}
                            >
                                <List className="w-3 h-3" /> Form
                            </button>
                        </div>
                        <button
                            onClick={onClose}
                            className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-zinc-800 text-zinc-500 hover:text-zinc-300 transition-colors"
                        >
                            <X className="w-4 h-4" />
                        </button>
                    </div>
                </div>

                {/* Body */}
                <div className="flex-1 overflow-y-auto">
                    {mode === "text" ? (
                        <TextMode
                            textareaRef={textareaRef}
                            mdText={mdText}
                            setMdText={setMdText}
                            parsedEntries={parsedEntries}
                            existingNames={existingNames}
                        />
                    ) : (
                        <FormMode
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
                <div className="px-5 py-3.5 border-t border-white/[0.06] flex items-center justify-between flex-shrink-0">
                    <span className="text-[10px] text-zinc-600">
                        {mode === "text" ? "# keyword  - synonym" : "Enter → next row"}
                    </span>
                    <div className="flex gap-2">
                        <button
                            onClick={onClose}
                            className="h-8 px-3.5 rounded-lg bg-zinc-800 text-zinc-400 text-xs font-medium hover:bg-zinc-700 hover:text-zinc-200 transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={handleSave}
                            disabled={validEntries.length === 0 || isSaving}
                            className="h-8 px-4 rounded-lg bg-violet-600 text-white text-xs font-semibold hover:bg-violet-500 disabled:opacity-40 transition-colors flex items-center gap-1.5"
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

// ─── Text mode ────────────────────────────────────────────────────────────────

interface TextModeProps {
    textareaRef: React.RefObject<HTMLTextAreaElement>;
    mdText: string;
    setMdText: (v: string) => void;
    parsedEntries: ParsedEntry[];
    existingNames: Set<string>;
}

function TextMode({ textareaRef, mdText, setMdText, parsedEntries, existingNames }: TextModeProps) {
    const seen = new Set<string>();

    return (
        <div className="flex flex-col gap-0">
            {/* Textarea */}
            <div className="px-5 pt-4 pb-3">
                <textarea
                    ref={textareaRef}
                    autoFocus
                    className="w-full h-48 bg-zinc-800 border border-white/[0.08] rounded-xl px-4 py-3 font-mono text-[12px] text-zinc-200 resize-none outline-none focus:border-violet-500/60 leading-relaxed placeholder:text-zinc-600 transition-colors"
                    placeholder={PLACEHOLDER}
                    value={mdText}
                    onChange={e => setMdText(e.target.value)}
                    spellCheck={false}
                />
                <p className="text-[10px] text-zinc-600 mt-1.5">
                    <span className="text-zinc-400 font-mono"># keyword</span> để thêm keyword&ensp;·&ensp;
                    <span className="text-zinc-400 font-mono">- synonym</span> để thêm synonym cho keyword phía trên
                </p>
            </div>

            {/* Parsed preview */}
            {parsedEntries.length > 0 && (
                <div className="px-5 pb-4 flex flex-col gap-1.5">
                    <div className="text-[10px] text-zinc-600 font-medium uppercase tracking-wider mb-0.5">
                        Preview — {parsedEntries.length} parsed
                    </div>
                    {parsedEntries.map((entry, i) => {
                        const lo      = entry.name.toLowerCase();
                        const isDupe  = existingNames.has(lo);
                        const isBatch = seen.has(lo);
                        if (!isDupe && !isBatch) seen.add(lo);
                        const invalid = isDupe || isBatch;

                        return (
                            <div
                                key={i}
                                className={`flex items-start gap-2 px-3 py-2 rounded-lg border ${
                                    invalid
                                        ? "border-red-500/20 bg-red-950/20"
                                        : "border-white/[0.05] bg-zinc-800/50"
                                }`}
                            >
                                <span className={`text-[12px] font-semibold flex-shrink-0 ${invalid ? "text-red-400" : "text-zinc-200"}`}>
                                    {entry.name}
                                </span>
                                {invalid && (
                                    <span className="text-[10px] text-red-400 self-center">
                                        {isDupe ? "already exists" : "duplicate"}
                                    </span>
                                )}
                                {entry.synonyms.length > 0 && !invalid && (
                                    <div className="flex flex-wrap gap-1 mt-px">
                                        {entry.synonyms.map(s => (
                                            <span key={s} className="h-4 px-1.5 bg-zinc-700/60 rounded-full text-[10px] text-zinc-400">
                                                {s}
                                            </span>
                                        ))}
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}

// ─── Form mode ────────────────────────────────────────────────────────────────

interface FormModeProps {
    listRef: React.RefObject<HTMLDivElement>;
    rows: KeywordRow[];
    keywords: WikiKeyword[];
    updateRow: (id: string, patch: Partial<KeywordRow>) => void;
    removeRow: (id: string) => void;
    addRow: () => void;
    addSynonym: (rowId: string) => void;
    removeSynonym: (rowId: string, syn: string) => void;
}

function FormMode({ listRef, rows, keywords, updateRow, removeRow, addRow, addSynonym, removeSynonym }: FormModeProps) {
    return (
        <div ref={listRef} className="px-5 py-3 flex flex-col gap-2">
            {rows.map((row, idx) => {
                const isDupe    = !!row.name.trim() && keywords.some(k => k.name.toLowerCase() === row.name.trim().toLowerCase());
                const batchDupe = !!row.name.trim() && rows.some((r, i) => i !== idx && r.name.trim().toLowerCase() === row.name.trim().toLowerCase());
                const isInvalid = isDupe || batchDupe;

                return (
                    <div key={row.id} className="bg-zinc-800/60 border border-white/[0.06] rounded-xl p-3 flex flex-col gap-2">
                        {/* Name row */}
                        <div className="flex items-center gap-2">
                            <span className="text-[10px] text-zinc-600 font-mono w-4 text-right flex-shrink-0">{idx + 1}</span>
                            <input
                                className={`kw-name-input flex-1 h-8 bg-zinc-800 border rounded-lg px-3 text-[13px] font-medium text-zinc-100 outline-none placeholder:text-zinc-600 transition-colors ${
                                    isInvalid ? "border-red-500/50 focus:border-red-500" : "border-white/[0.08] focus:border-violet-500"
                                }`}
                                placeholder={idx === 0 ? "e.g. Dependency Injection" : "Keyword name…"}
                                value={row.name}
                                onChange={e => updateRow(row.id, { name: e.target.value })}
                                onKeyDown={e => {
                                    if (e.key === "Enter" && !e.shiftKey) {
                                        e.preventDefault();
                                        if (idx === rows.length - 1) addRow();
                                        else listRef.current?.querySelectorAll<HTMLInputElement>("input.kw-name-input")?.[idx + 1]?.focus();
                                    }
                                }}
                            />
                            <button
                                onClick={() => updateRow(row.id, { showSynonyms: !row.showSynonyms })}
                                className={`flex items-center gap-1 h-8 px-2 rounded-lg border text-[10px] font-medium transition-colors flex-shrink-0 ${
                                    row.synonyms.length > 0
                                        ? "border-violet-500/40 bg-violet-500/10 text-violet-400"
                                        : "border-white/[0.06] bg-zinc-800 text-zinc-500 hover:text-zinc-300"
                                }`}
                            >
                                {row.synonyms.length > 0 ? `≈ ${row.synonyms.length}` : "≈"}
                                <ChevronDown className={`w-3 h-3 transition-transform ${row.showSynonyms ? "rotate-180" : ""}`} />
                            </button>
                            {rows.length > 1 && (
                                <button
                                    onClick={() => removeRow(row.id)}
                                    className="w-7 h-7 flex items-center justify-center rounded-lg text-zinc-600 hover:bg-red-950/50 hover:text-red-400 transition-colors flex-shrink-0"
                                >
                                    <X className="w-3.5 h-3.5" />
                                </button>
                            )}
                        </div>

                        {isInvalid && (
                            <p className="text-[10px] text-red-400 pl-6">
                                {isDupe ? "Already exists in your wiki" : "Duplicate in this batch"}
                            </p>
                        )}

                        {row.showSynonyms && (
                            <div className="pl-6 flex flex-col gap-2">
                                {row.synonyms.length > 0 && (
                                    <div className="flex flex-wrap gap-1.5">
                                        {row.synonyms.map(s => (
                                            <span key={s} className="flex items-center gap-1 h-5 pl-2 pr-1 bg-zinc-700/60 border border-white/[0.07] rounded-full text-[11px] text-zinc-300">
                                                {s}
                                                <button
                                                    onClick={() => removeSynonym(row.id, s)}
                                                    className="w-3.5 h-3.5 flex items-center justify-center rounded-full hover:bg-zinc-600 text-zinc-500 hover:text-zinc-200 transition-colors"
                                                >
                                                    <X className="w-2 h-2" />
                                                </button>
                                            </span>
                                        ))}
                                    </div>
                                )}
                                <div className="flex gap-1.5">
                                    <input
                                        className="flex-1 h-7 bg-zinc-800 border border-white/[0.08] rounded-lg px-2.5 text-[11px] text-zinc-200 outline-none focus:border-violet-500/50 placeholder:text-zinc-600 transition-colors"
                                        placeholder="Add synonym…"
                                        value={row.synonymInput}
                                        onChange={e => updateRow(row.id, { synonymInput: e.target.value })}
                                        onKeyDown={e => e.key === "Enter" && addSynonym(row.id)}
                                    />
                                    <button
                                        onClick={() => addSynonym(row.id)}
                                        disabled={!row.synonymInput.trim()}
                                        className="w-7 h-7 flex items-center justify-center rounded-lg bg-zinc-800 border border-white/[0.08] text-zinc-400 hover:text-zinc-100 hover:bg-zinc-700 disabled:opacity-30 transition-colors"
                                    >
                                        <Plus className="w-3 h-3" />
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                );
            })}

            <button
                onClick={addRow}
                className="flex items-center gap-1.5 w-full h-8 px-3 rounded-xl border border-dashed border-white/[0.08] text-zinc-600 text-xs hover:border-violet-500/40 hover:text-violet-400 transition-colors"
            >
                <Plus className="w-3.5 h-3.5" /> Add another keyword
            </button>
        </div>
    );
}
