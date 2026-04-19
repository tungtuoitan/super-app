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
        <div className="fixed inset-0 text-left bg-black/50 backdrop-blur-sm z-[1000000000000] flex items-center justify-center">
            <div className="bg-zinc-900 border border-white/[0.08] rounded-2xl w-[600px] max-h-[82vh] flex flex-col shadow-2xl overflow-hidden">

                {/* Header */}
                <div className="px-5 pt-5 pb-0 flex-shrink-0">
                    <div className="flex items-start justify-between mb-4">
                        <div>
                            <h2 className="text-[15px] font-semibold text-zinc-100 tracking-tight">Insert Info</h2>
                            <p className="text-xs text-zinc-500 mt-0.5">
                                <code className="text-violet-400 text-[11px]"># Title</code> = info
                                {parsedItems.length > 0 && (
                                    <span className="ml-2 text-zinc-400">
                                        · {parsedItems.length} info{parsedItems.length !== 1 ? "s" : ""}
                                    </span>
                                )}
                            </p>
                        </div>
                        <button onClick={onClose} className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-zinc-800 text-zinc-500 hover:text-zinc-300 transition-colors">
                            <X className="w-4 h-4" />
                        </button>
                    </div>
                </div>

                {/* Body */}
                <div className="flex-1 overflow-y-auto px-5 pb-4 flex flex-col gap-4">
                    <div>
                        <label className="block text-[10px] font-semibold text-zinc-500 uppercase tracking-wider mb-1.5">Content</label>
                        <textarea
                            autoFocus
                            className="w-full h-52 bg-zinc-800 border border-white/[0.08] rounded-lg px-3 py-2.5 font-mono text-[12px] text-zinc-200 resize-none outline-none focus:border-violet-500 leading-relaxed placeholder:text-zinc-600 transition-colors"
                            placeholder={"# Dependency Injection\nA pattern that decouples object creation from usage.\n\n# SOLID Principles\nFive principles for writing maintainable OO code."}
                            value={rawText}
                            onChange={e => setRawText(e.target.value)}
                        />
                    </div>

                    {parsedItems.length > 1 && (
                        <div className="flex flex-wrap gap-1.5">
                            {parsedItems.map((item, i) => (
                                <span key={i} className="h-6 px-2.5 rounded-full bg-zinc-800 border border-white/[0.06] text-[11px] text-zinc-400 flex items-center">
                                    {item.title}
                                </span>
                            ))}
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="px-5 py-3.5 border-t border-white/[0.06] flex justify-end gap-2 flex-shrink-0">
                    <button onClick={onClose} className="h-8 px-3.5 rounded-lg bg-zinc-800 text-zinc-400 text-xs font-medium hover:bg-zinc-700 hover:text-zinc-200 transition-colors">
                        Cancel
                    </button>
                    <button
                        onClick={handleSave}
                        disabled={parsedItems.length === 0 || isSaving}
                        className="h-8 px-3.5 rounded-lg bg-violet-600 text-white text-xs font-semibold hover:bg-violet-500 disabled:opacity-40 transition-colors flex items-center gap-1.5"
                    >
                        {isSaving && <Loader2 className="w-3 h-3 animate-spin" />}
                        Save{parsedItems.length > 1 ? ` ${parsedItems.length} items` : ""}
                    </button>
                </div>
            </div>
        </div>
    );
}
