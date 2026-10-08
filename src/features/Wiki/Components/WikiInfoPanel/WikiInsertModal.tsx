import { useState } from "react";
import { X, Loader2 } from "lucide-react";
import { useWikiLoader } from "../../hooks/useWikiLoader.helper";
import { wikiService } from "../../service/wiki.service";

interface Props {
    onClose: () => void;
}

function parseItems(raw: string): { title: string; content: string }[] {
    const items: { title: string; content: string }[] = [];
    let current: { title: string; content: string } | null = null;

    for (const line of raw.split("\n")) {
        if (line.match(/^#\s/)) {
            if (current) items.push(current);
            current = { title: line.replace(/^#\s*/, "").trim(), content: "" };
        } else if (current) {
            current.content += (current.content ? "\n" : "") + line;
        }
    }
    if (current) items.push(current);
    return items.filter(i => i.title);
}

export default function WikiInsertModal({ onClose }: Props) {
    const { loadAll }  = useWikiLoader();
    const [rawText,  setRawText]  = useState("");
    const [isSaving, setIsSaving] = useState(false);

    const parsedItems = parseItems(rawText);

    const handleSave = async () => {
        if (parsedItems.length === 0) return;
        setIsSaving(true);
        try {
            for (const item of parsedItems) {
                await wikiService.upsertInfo({ title: item.title, content: item.content.trim() });
            }
            await loadAll();
            onClose();
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="fixed inset-0 text-left bg-background/70 backdrop-blur-sm z-[1000000000000] flex items-center justify-center">
            <div className="bg-popover border border-sa-border-strong rounded-xl w-[600px] max-h-[82vh] flex flex-col sa-shadow-pop overflow-hidden">

                {/* Header */}
                <div className="px-5 pt-5 pb-0 flex-shrink-0">
                    <div className="flex items-start justify-between mb-4">
                        <div>
                            <h2 className="text-[15px] font-medium text-foreground tracking-tight">Insert Info</h2>
                            <p className="text-xs text-muted-foreground mt-0.5">
                                <code className="text-sa-amber-ink text-[11px]"># Title</code> = info
                                {parsedItems.length > 0 && (
                                    <span className="ml-2 text-muted-foreground">
                                        · {parsedItems.length} info{parsedItems.length !== 1 ? "s" : ""}
                                    </span>
                                )}
                            </p>
                        </div>
                        <button onClick={onClose} className="w-7 h-7 flex items-center justify-center rounded-md hover:bg-sa-hover-strong text-muted-foreground hover:text-foreground transition-colors duration-100">
                            <X className="w-4 h-4" />
                        </button>
                    </div>
                </div>

                {/* Body */}
                <div className="flex-1 overflow-y-auto px-5 pb-4 flex flex-col gap-4">
                    <div>
                        <label className="block text-[11px] font-medium text-muted-foreground uppercase tracking-wide mb-1.5">Content</label>
                        <textarea
                            autoFocus
                            className="w-full h-52 bg-transparent border border-sa-border-strong rounded-lg px-3 py-2.5 font-mono text-[12px] text-foreground resize-none outline-none focus:border-ring leading-relaxed placeholder:text-muted-foreground transition-colors"
                            placeholder={"# Dependency Injection\nA pattern that decouples object creation from usage.\n\n# SOLID Principles\nFive principles for writing maintainable OO code."}
                            value={rawText}
                            onChange={e => setRawText(e.target.value)}
                        />
                    </div>

                    {parsedItems.length > 1 && (
                        <div className="flex flex-wrap gap-1.5">
                            {parsedItems.map((item, i) => (
                                <span key={i} className="h-6 px-2.5 rounded-md border border-sa-border-strong text-[11px] text-muted-foreground flex items-center">
                                    {item.title}
                                </span>
                            ))}
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="px-5 py-3.5 border-t border-sa-border flex justify-end gap-2 flex-shrink-0">
                    <button onClick={onClose} className="h-8 px-3.5 rounded-lg border border-sa-border-strong text-foreground text-xs font-medium hover:bg-sa-hover-strong hover:text-foreground transition-colors">
                        Cancel
                    </button>
                    <button
                        onClick={handleSave}
                        disabled={parsedItems.length === 0 || isSaving}
                        className="h-8 px-3.5 rounded-lg bg-sa-amber text-sa-on-amber text-xs font-medium hover:bg-sa-amber/90 disabled:opacity-40 transition-colors flex items-center gap-1.5"
                    >
                        {isSaving && <Loader2 className="w-3 h-3 animate-spin" />}
                        Save{parsedItems.length > 1 ? ` ${parsedItems.length} items` : ""}
                    </button>
                </div>
            </div>
        </div>
    );
}
