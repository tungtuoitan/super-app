import type { ParsedEntry } from "../../types/wiki.type";
import { WIKI_KEYWORD_PLACEHOLDER } from "../../utils/wiki.constants";

interface TextModeProps {
    textareaRef: React.RefObject<HTMLTextAreaElement>;
    mdText: string;
    setMdText: (v: string) => void;
    parsedEntries: ParsedEntry[];
    existingNames: Set<string>;
}

export default function WikiKeywordTextMode({ textareaRef, mdText, setMdText, parsedEntries, existingNames }: TextModeProps) {
    const seen = new Set<string>();

    return (
        <div className="flex flex-col gap-0">
            {/* Textarea */}
            <div className="px-5 pt-4 pb-3">
                <textarea
                    ref={textareaRef}
                    autoFocus
                    className="w-full h-48 bg-sa-surface-2 border border-sa-border rounded-xl px-4 py-3 font-mono text-[12px] text-foreground resize-none outline-none focus:border-ring leading-relaxed placeholder:text-muted-foreground transition-colors"
                    placeholder={WIKI_KEYWORD_PLACEHOLDER}
                    value={mdText}
                    onChange={e => setMdText(e.target.value)}
                    spellCheck={false}
                />
                <p className="text-[10px] text-muted-foreground/70 mt-1.5">
                    <span className="text-muted-foreground font-mono"># keyword</span> để thêm keyword&ensp;·&ensp;
                    <span className="text-muted-foreground font-mono">- synonym</span> để thêm synonym cho keyword phía trên
                </p>
            </div>

            {/* Parsed preview */}
            {parsedEntries.length > 0 && (
                <div className="px-5 pb-4 flex flex-col gap-1.5">
                    <div className="text-[11px] text-muted-foreground font-medium uppercase tracking-wide mb-0.5">
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
                                        ? "border-sa-danger/20 bg-sa-danger/10"
                                        : "border-sa-border bg-sa-surface-2"
                                }`}
                            >
                                <span className={`text-[12px] font-semibold flex-shrink-0 ${invalid ? "text-sa-danger" : "text-foreground"}`}>
                                    {entry.name}
                                </span>
                                {invalid && (
                                    <span className="text-[10px] text-sa-danger self-center">
                                        {isDupe ? "already exists" : "duplicate"}
                                    </span>
                                )}
                                {entry.synonyms.length > 0 && !invalid && (
                                    <div className="flex flex-wrap gap-1 mt-px">
                                        {entry.synonyms.map(s => (
                                            <span key={s} className="h-4 px-1.5 border border-sa-border-strong rounded-md text-[10px] text-muted-foreground">
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
