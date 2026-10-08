import { useState } from "react";
import { X, Plus, Loader2 } from "lucide-react";
import { WikiIconPicker } from "./WikiIconPicker";
import { useWikiStore } from "../../store/useWiki.store";
import { wikiService } from "../../service/wiki.service";
import type { WikiKeyword } from "../../types/wiki.type";

interface Props {
    keyword: WikiKeyword;
    onClose: () => void;
}

export function WikiKeywordEditModal({ keyword, onClose }: Props) {
    const { setKeywords } = useWikiStore();

    const [icon, setIcon]           = useState<string | undefined>(keyword.icon);
    const [synonyms, setSynonyms]   = useState<string[]>(keyword.synonyms);
    const [newSynonym, setNewSynonym] = useState("");
    const [saving, setSaving]       = useState(false);

    const addSynonym = () => {
        const v = newSynonym.trim();
        if (!v || synonyms.includes(v)) return;
        setSynonyms(prev => [...prev, v]);
        setNewSynonym("");
    };

    const removeSynonym = (s: string) =>
        setSynonyms(prev => prev.filter(x => x !== s));

    const handleSave = async () => {
        setSaving(true);
        try {
            await wikiService.updateKeyword(keyword.id, { icon, synonyms });
            setKeywords(prev => prev.map(k =>
                k.id === keyword.id ? { ...k, icon, synonyms } : k
            ));
            onClose();
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="fixed text-left inset-0 bg-background/70 backdrop-blur-sm z-50 flex items-center justify-center">
            <div className="bg-popover border border-sa-border-strong rounded-xl w-[440px] flex flex-col sa-shadow-pop overflow-hidden">
                {/* Header */}
                <div className="flex items-center gap-2 px-5 py-4 border-b border-sa-border">
                    <div className="flex-1 min-w-0">
                        <h2 className="text-[14px] font-medium text-foreground tracking-tight truncate">
                            {keyword.name}
                        </h2>
                        <p className="text-[11px] text-muted-foreground mt-0.5">Edit keyword icon &amp; synonyms</p>
                    </div>
                    <button
                        onClick={onClose}
                        className="w-7 h-7 flex items-center justify-center rounded-md hover:bg-sa-hover-strong text-muted-foreground hover:text-foreground transition-colors duration-100 flex-shrink-0"
                    >
                        <X className="w-4 h-4" />
                    </button>
                </div>

                {/* Body */}
                <div className="px-5 py-4 flex flex-col gap-5">
                    {/* Icon picker */}
                    <div>
                        <label className="block text-[11px] font-medium text-muted-foreground uppercase tracking-wide mb-2">
                            Icon / Image
                        </label>
                        <WikiIconPicker value={icon} onChange={setIcon} />
                    </div>

                    {/* Synonyms */}
                    <div>
                        <label className="block text-[11px] font-medium text-muted-foreground uppercase tracking-wide mb-2">
                            Synonyms
                        </label>

                        {/* Existing tags */}
                        {synonyms.length > 0 && (
                            <div className="flex flex-wrap gap-1.5 mb-2">
                                {synonyms.map(s => (
                                    <span
                                        key={s}
                                        className="flex items-center gap-1 h-6 pl-2.5 pr-1 border border-sa-border-strong rounded-md text-xs text-foreground"
                                    >
                                        {s}
                                        <button
                                            onClick={() => removeSynonym(s)}
                                            className="w-4 h-4 flex items-center justify-center rounded-full hover:bg-sa-hover-strong text-muted-foreground hover:text-foreground transition-colors"
                                        >
                                            <X className="w-2.5 h-2.5" />
                                        </button>
                                    </span>
                                ))}
                            </div>
                        )}

                        {/* Add synonym */}
                        <div className="flex gap-2">
                            <input
                                className="flex-1 h-8 bg-transparent border border-sa-border-strong rounded-lg px-3 text-xs text-foreground outline-none focus:border-ring placeholder:text-muted-foreground transition-colors"
                                placeholder="Add synonym…"
                                value={newSynonym}
                                onChange={e => setNewSynonym(e.target.value)}
                                onKeyDown={e => e.key === "Enter" && addSynonym()}
                            />
                            <button
                                onClick={addSynonym}
                                disabled={!newSynonym.trim()}
                                className="w-8 h-8 flex items-center justify-center rounded-lg bg-sa-surface-2 border border-sa-border text-muted-foreground hover:text-foreground hover:bg-sa-hover-strong disabled:opacity-30 transition-colors"
                            >
                                <Plus className="w-3.5 h-3.5" />
                            </button>
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="px-5 py-3.5 border-t border-sa-border flex justify-end gap-2">
                    <button
                        onClick={onClose}
                        className="h-8 px-3.5 rounded-lg border border-sa-border-strong text-foreground text-xs font-medium hover:bg-sa-hover-strong hover:text-foreground transition-colors"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleSave}
                        disabled={saving}
                        className="h-8 px-3.5 rounded-lg bg-sa-amber text-sa-on-amber text-xs font-medium hover:bg-sa-amber/90 disabled:opacity-40 transition-colors flex items-center gap-1.5"
                    >
                        {saving && <Loader2 className="w-3 h-3 animate-spin" />}
                        Save
                    </button>
                </div>
            </div>
        </div>
    );
}
