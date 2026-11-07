import { X, Plus, ChevronDown } from "lucide-react";
import type { KeywordRow, WikiKeyword } from "../../types/wiki.type";

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

export default function WikiKeywordFormMode({ listRef, rows, keywords, updateRow, removeRow, addRow, addSynonym, removeSynonym }: FormModeProps) {
    return (
        <div ref={listRef} className="px-5 py-3 flex flex-col gap-2">
            {rows.map((row, idx) => {
                const isDupe    = !!row.name.trim() && keywords.some(k => k.name.toLowerCase() === row.name.trim().toLowerCase());
                const batchDupe = !!row.name.trim() && rows.some((r, i) => i !== idx && r.name.trim().toLowerCase() === row.name.trim().toLowerCase());
                const isInvalid = isDupe || batchDupe;

                return (
                    <div key={row.id} className="bg-sa-surface-2 border border-sa-border rounded-xl p-3 flex flex-col gap-2">
                        {/* Name row */}
                        <div className="flex items-center gap-2">
                            <span className="text-[10px] text-muted-foreground/70 font-mono w-4 text-right flex-shrink-0">{idx + 1}</span>
                            <input
                                className={`kw-name-input flex-1 h-8 bg-sa-surface-2 border rounded-lg px-3 text-[13px] font-medium text-foreground outline-none placeholder:text-muted-foreground transition-colors ${
                                    isInvalid ? "border-sa-danger/50 focus:border-sa-danger/35" : "border-sa-border focus:border-ring"
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
                                        ? "border-sa-amber/40 bg-sa-amber/10 text-sa-amber-ink"
                                        : "border-sa-border bg-sa-surface-2 text-muted-foreground hover:text-foreground"
                                }`}
                            >
                                {row.synonyms.length > 0 ? `≈ ${row.synonyms.length}` : "≈"}
                                <ChevronDown className={`w-3 h-3 transition-transform ${row.showSynonyms ? "rotate-180" : ""}`} />
                            </button>
                            {rows.length > 1 && (
                                <button
                                    onClick={() => removeRow(row.id)}
                                    className="w-7 h-7 flex items-center justify-center rounded-lg text-muted-foreground/70 hover:bg-sa-danger/10 hover:text-sa-danger transition-colors flex-shrink-0"
                                >
                                    <X className="w-3.5 h-3.5" />
                                </button>
                            )}
                        </div>

                        {isInvalid && (
                            <p className="text-[10px] text-sa-danger pl-6">
                                {isDupe ? "Already exists in your wiki" : "Duplicate in this batch"}
                            </p>
                        )}

                        {row.showSynonyms && (
                            <div className="pl-6 flex flex-col gap-2">
                                {row.synonyms.length > 0 && (
                                    <div className="flex flex-wrap gap-1.5">
                                        {row.synonyms.map(s => (
                                            <span key={s} className="flex items-center gap-1 h-5 pl-2 pr-1 border border-sa-border-strong rounded-md text-[11px] text-foreground">
                                                {s}
                                                <button
                                                    onClick={() => removeSynonym(row.id, s)}
                                                    className="w-3.5 h-3.5 flex items-center justify-center rounded-full hover:bg-sa-hover-strong text-muted-foreground hover:text-foreground transition-colors"
                                                >
                                                    <X className="w-2 h-2" />
                                                </button>
                                            </span>
                                        ))}
                                    </div>
                                )}
                                <div className="flex gap-1.5">
                                    <input
                                        className="flex-1 h-7 bg-transparent border border-sa-border-strong rounded-lg px-2.5 text-[11px] text-foreground outline-none focus:border-ring placeholder:text-muted-foreground transition-colors"
                                        placeholder="Add synonym…"
                                        value={row.synonymInput}
                                        onChange={e => updateRow(row.id, { synonymInput: e.target.value })}
                                        onKeyDown={e => e.key === "Enter" && addSynonym(row.id)}
                                    />
                                    <button
                                        onClick={() => addSynonym(row.id)}
                                        disabled={!row.synonymInput.trim()}
                                        className="w-7 h-7 flex items-center justify-center rounded-lg bg-sa-surface-2 border border-sa-border text-muted-foreground hover:text-foreground hover:bg-sa-hover-strong disabled:opacity-30 transition-colors"
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
                className="flex items-center gap-1.5 w-full h-8 px-3 rounded-xl border border-dashed border-sa-border text-muted-foreground/70 text-xs hover:border-sa-amber/40 hover:text-sa-amber-ink transition-colors"
            >
                <Plus className="w-3.5 h-3.5" /> Add another keyword
            </button>
        </div>
    );
}
