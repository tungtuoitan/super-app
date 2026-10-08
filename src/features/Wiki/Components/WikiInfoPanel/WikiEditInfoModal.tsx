import { useState } from "react";
import { X, Loader2 } from "lucide-react";
import { useWikiLoader } from "../../hooks/useWikiLoader.helper";
import { wikiService } from "../../service/wiki.service";
import type { WikiInfo } from "../../types/wiki.type";

interface Props {
    info: WikiInfo;
    onClose: () => void;
}

export default function WikiEditInfoModal({ info, onClose }: Props) {
    const { loadAll } = useWikiLoader();

    const [title,    setTitle]    = useState(info.title);
    const [content,  setContent]  = useState(info.content);
    const [isSaving, setIsSaving] = useState(false);

    const isDirty = title.trim() !== info.title || content.trim() !== info.content;

    const handleSave = async () => {
        if (!title.trim() || !isDirty) return;
        setIsSaving(true);
        try {
            await wikiService.upsertInfo({
                id:      info.id,
                title:   title.trim(),
                content: content.trim(),
            });
            await loadAll();
            onClose();
        } finally {
            setIsSaving(false);
        }
    };

    const handleKey = (e: React.KeyboardEvent) => {
        if (e.key === "Escape") onClose();
        if (e.key === "s" && (e.ctrlKey || e.metaKey)) { e.preventDefault(); handleSave(); }
    };

    return (
        <div
            className="fixed inset-0 text-left bg-background/70 backdrop-blur-sm z-[1000000000000] flex items-center justify-center"
            onKeyDown={handleKey}
        >
            <div className="bg-popover border border-sa-border-strong rounded-xl w-[600px] max-h-[82vh] flex flex-col sa-shadow-pop overflow-hidden">

                {/* Header */}
                <div className="px-5 pt-5 pb-4 flex items-start justify-between flex-shrink-0 border-b border-sa-border">
                    <div>
                        <h2 className="text-[15px] font-medium text-foreground tracking-tight">Edit Info</h2>
                        <p className="text-xs text-muted-foreground mt-0.5">Ctrl+S to save · Esc to close</p>
                    </div>
                    <button
                        onClick={onClose}
                        className="w-7 h-7 flex items-center justify-center rounded-md hover:bg-sa-hover-strong text-muted-foreground hover:text-foreground transition-colors duration-100"
                    >
                        <X className="w-4 h-4" />
                    </button>
                </div>

                {/* Body */}
                <div className="flex-1 overflow-y-auto px-5 py-4 flex flex-col gap-4">
                    {/* Title */}
                    <div>
                        <label className="block text-[11px] font-medium text-muted-foreground uppercase tracking-wide mb-1.5">Title</label>
                        <input
                            autoFocus
                            className="w-full h-9 bg-transparent border border-sa-border-strong rounded-lg px-3 text-[13px] font-medium text-foreground outline-none focus:border-ring placeholder:text-muted-foreground transition-colors"
                            value={title}
                            onChange={e => setTitle(e.target.value)}
                            placeholder="Info title…"
                        />
                    </div>

                    {/* Content */}
                    <div className="flex-1 flex flex-col">
                        <label className="block text-[11px] font-medium text-muted-foreground uppercase tracking-wide mb-1.5">Content</label>
                        <textarea
                            className="flex-1 min-h-[220px] bg-transparent border border-sa-border-strong rounded-lg px-3 py-2.5 font-mono text-[12px] text-foreground resize-none outline-none focus:border-ring leading-relaxed placeholder:text-muted-foreground transition-colors"
                            value={content}
                            onChange={e => setContent(e.target.value)}
                            placeholder="Content…"
                        />
                    </div>
                </div>

                {/* Footer */}
                <div className="px-5 py-3.5 border-t border-sa-border flex justify-end gap-2 flex-shrink-0">
                    <button
                        onClick={onClose}
                        className="h-8 px-3.5 rounded-lg border border-sa-border-strong text-foreground text-xs font-medium hover:bg-sa-hover-strong hover:text-foreground transition-colors"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleSave}
                        disabled={!title.trim() || !isDirty || isSaving}
                        className="h-8 px-3.5 rounded-lg bg-sa-amber text-sa-on-amber text-xs font-medium hover:bg-sa-amber/90 disabled:opacity-40 transition-colors flex items-center gap-1.5"
                    >
                        {isSaving && <Loader2 className="w-3 h-3 animate-spin" />}
                        Save
                    </button>
                </div>
            </div>
        </div>
    );
}
