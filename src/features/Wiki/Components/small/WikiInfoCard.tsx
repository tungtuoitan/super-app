import { useEffect, useRef, useState } from "react";
import { Loader2 } from "lucide-react";
import { useWikiStore } from "../../store/useWiki.store";
import { useWikiLoader } from "../../hooks/useWikiLoader.helper";
import { wikiService } from "../../service/wiki.service";
import type { WikiInfo, WikiKeyword } from "../../types/wiki.type";
import { WIKI_MENTION } from "../../utils/wiki.constants";
import MentionText from "./MentionText";
import { WikiSelectionTooltip, WikiKeywordTooltip } from "./WikiSelectionKeywordButton";
import { useKeyboardShortcut } from "@/shared";

interface CardProps {
    info: WikiInfo;
    keywords: WikiKeyword[];
    onDelete: () => void;
    searchQuery?: string;
}

export function WikiInfoCard({ info, keywords, onDelete, searchQuery = "" }: CardProps) {
    const { loadAll }                               = useWikiLoader();
    const { setSelectedKeywordIds, setFocusKeywordId } = useWikiStore();
    const [editing,      setEditing]     = useState(false);
    const [editTitle,    setEditTitle]   = useState(info.title);
    const [editContent,  setEditContent] = useState(info.content);
    const [saving,       setSaving]      = useState(false);
    const [kwTooltip,    setKwTooltip]   = useState<{ keyword: WikiKeyword; rect: DOMRect } | null>(null);
    const containerRef                   = useRef<HTMLDivElement>(null);
    const textareaRef                    = useRef<HTMLTextAreaElement>(null);

    useEffect(() => {
        const el = textareaRef.current;
        if (!el) return;
        el.style.height = "auto";
        el.style.height = el.scrollHeight + "px";
    }, [editContent, editing]);

    const isDirty = editTitle.trim() !== info.title || editContent.trim() !== info.content;

    const enterEdit = () => { setEditTitle(info.title); setEditContent(info.content); setEditing(true); };

    const handleSave = async () => {
        if (!isDirty) { setEditing(false); return; }
        setSaving(true);
        try {
            await wikiService.upsertInfo({ id: info.id, title: editTitle.trim(), content: editContent.trim() });
            await loadAll();
            setEditing(false);
        } finally { setSaving(false); }
    };

    const handleCancel = () => { setEditing(false); setEditTitle(info.title); setEditContent(info.content); };

    useKeyboardShortcut({ key: "s", ctrl: true, enabled: editing, callback: handleSave });
    useKeyboardShortcut({ key: "Escape",         enabled: editing, callback: handleCancel });

    const plainContent = info.content.replace(/^#{1,6}\s/gm, "").replace(/[*`_~]/g, "").trim();

    const linkedKws = keywords.filter(k => info.keywordIds.includes(k.id) && !k.deletedAt);

    const lineMatchesKws = (line: string, kws: WikiKeyword[]): boolean =>
        kws.some(kw =>
            [kw.name, ...kw.synonyms].filter(Boolean).some(term => {
                const escaped = term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
                return new RegExp(`(?<![A-Za-z0-9])${escaped}(?![A-Za-z0-9])`, "i").test(line);
            })
        );

    const lineDim = (line: string): boolean =>
        linkedKws.length > 0 && !lineMatchesKws(line, linkedKws);

    const handleKeywordClick = (keyword: WikiKeyword, rect: DOMRect) => {
        setKwTooltip(prev => prev?.keyword.id === keyword.id ? null : { keyword, rect });
    };

    const handleKeywordDoubleClick = (id: number) => {
        setKwTooltip(null);
        setSelectedKeywordIds([id]);
        setFocusKeywordId(id);
    };

    const prClass = "pr-[72px]";

    const mentionProps = {
        keywords,
        linkedKeywordIds:     info.keywordIds,
        searchQuery,
        onKeywordClick:       handleKeywordClick,
        onKeywordDoubleClick: handleKeywordDoubleClick,
    };

    return (
        <>
            <div
                ref={containerRef}
                className={`relative text-left group bg-zinc-900 rounded-xl p-4 transition-colors border ${
                    editing ? "_border-violet-500/25" : "_border-white/[0.06] _hover:border-white/[0.12]"
                }`}
                onDoubleClick={e => { if (!editing && !(e.target as HTMLElement).closest("button")) enterEdit(); }}
            >
                {!editing && <WikiSelectionTooltip containerRef={containerRef} />}

                {kwTooltip && !editing && (
                    <WikiKeywordTooltip
                        keyword={kwTooltip.keyword}
                        infoId={info.id}
                        rect={kwTooltip.rect}
                        onClose={() => setKwTooltip(null)}
                    />
                )}

                {/* Top-right buttons */}
                <div className="absolute top-3 right-3 flex gap-1">
                    {editing ? (
                        <>
                            <button onMouseDown={e => e.preventDefault()} onClick={handleCancel}
                                className="h-6 px-2 rounded-md text-[10px] text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800 transition-colors">Esc</button>
                            <button onMouseDown={e => e.preventDefault()} onClick={handleSave} disabled={saving}
                                className="h-6 px-2 rounded-md bg-violet-600 text-white text-[10px] font-semibold hover:bg-violet-500 disabled:opacity-40 transition-colors flex items-center gap-1">
                                {saving && <Loader2 className="w-2.5 h-2.5 animate-spin" />}Save
                            </button>
                        </>
                    ) : (
                        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button onClick={e => { e.stopPropagation(); enterEdit(); }}
                                className="w-6 h-6 flex items-center justify-center rounded-md text-zinc-600 hover:bg-zinc-800 hover:text-zinc-300 transition-colors text-[11px]" title="Edit">✎</button>
                            <button onClick={e => { e.stopPropagation(); onDelete(); }}
                                className="w-6 h-6 flex items-center justify-center rounded-md text-zinc-600 hover:bg-red-950/50 hover:text-red-400 transition-colors text-[11px]">✕</button>
                        </div>
                    )}
                </div>

                {/* Title */}
                {editing ? (
                    <input autoFocus
                        className={`w-full ${prClass} mb-2 bg-transparent outline-none text-[13px] font-semibold text-gray-500 tracking-tight leading-snug placeholder:text-gray-500`}
                        value={editTitle} onChange={e => setEditTitle(e.target.value)} placeholder="Title (optional)…" />
                ) : (
                    info.title && (
                        <h3 className={`text-[13px] font-semibold tracking-tight leading-snug mb-2 ${prClass}`}
                            style={{ userSelect: "text", cursor: "text", opacity: lineDim(info.title) ? WIKI_MENTION.lineDimOpacity : 1 }}>
                            <MentionText text={info.title} {...mentionProps} />
                        </h3>
                    )
                )}

                {/* Content */}
                {editing ? (
                    <textarea ref={textareaRef}
                        className={`w-full ${prClass} bg-transparent outline-none text-[13px] text-zinc-300 leading-relaxed placeholder:text-zinc-600 resize-none overflow-hidden`}
                        value={editContent} onChange={e => setEditContent(e.target.value)} placeholder="Content…" rows={1} />
                ) : (
                    <div className={`text-[13px] leading-relaxed ${!info.title ? prClass : ""}`} style={{ userSelect: "text", cursor: "text" }}>
                        {plainContent.split("\n").map((line, i) => {
                            if (!line.trim()) return <div key={i} className="h-2" />;
                            return (
                                <div key={i} className="rounded transition-opacity"
                                    style={{ opacity: lineDim(line) ? WIKI_MENTION.lineDimOpacity : 1 }}>
                                    <MentionText text={line} {...mentionProps} />
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </>
    );
}
