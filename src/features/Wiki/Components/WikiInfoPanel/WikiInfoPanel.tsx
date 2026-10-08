import { useRef, useState } from "react";
import { Plus, Search, ChevronRight, X, Loader2 } from "lucide-react";
import { useWikiStore } from "../../store/useWiki.store";
import { useWikiLoader } from "../../hooks/useWikiLoader.helper";
import { wikiService } from "../../service/wiki.service";
import type { WikiInfo, WikiKeyword, WikiTabData } from "../../types/wiki.type";
import type { BaseTab } from "@/shell";
import { WikiInfoCard } from "../small/WikiInfoCard";
import WikiInsertModal from "./WikiInsertModal";
import WikiInsertKeywordModal from "./WikiInsertKeywordModal";
import { useGlobalShortcut } from "@/shared";

interface Props {
    tab: BaseTab;
}

// ── Quick-insert parser ────────────────────────────────────────────────────────
// If the first line is a markdown heading (# / ## / ###), use it as title.
// Otherwise title is empty and the full raw text becomes the content.
function parseQuickInsert(raw: string): { title: string; content: string } {
    const lines = raw.trim().split("\n");
    const headingMatch = lines[0].match(/^#{1,3}\s+(.+)/);
    if (headingMatch) {
        return {
            title:   headingMatch[1].trim(),
            content: lines.slice(1).join("\n").trim(),
        };
    }
    return { title: "", content: raw.trim() };
}

export default function WikiInfoPanel({ tab }: Props) {
    const { keywords, infos, setInfos, selectedKeywordIds, setSelectedKeywordIds } = useWikiStore();
    const { loadAll } = useWikiLoader();
    const tabData = tab.data as unknown as WikiTabData;

    const focusedIds: number[] = selectedKeywordIds;

    // ── Search (Enter-to-apply, like KTree searchQuery) ───────────────────────
    const [searchInput,   setSearchInput]   = useState("");
    const [appliedSearch, setAppliedSearch] = useState("");

    const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === "Enter")  { e.preventDefault(); setAppliedSearch(searchInput); }
        if (e.key === "Escape") { setSearchInput(""); setAppliedSearch(""); }
    };
    const handleSearchClear = () => { setSearchInput(""); setAppliedSearch(""); };

    // ── Quick insert ──────────────────────────────────────────────────────────
    const quickRef                      = useRef<HTMLTextAreaElement>(null);
    const [quickText,   setQuickText]   = useState("");
    const [quickSaving, setQuickSaving] = useState(false);

    // ── Shift+F → focus quick insert (skip when already inside an input) ──────
    useGlobalShortcut("shift+f", { id: "wiki-info-panel-focus-quick", priority: 50 }, () => {
        const active = document.activeElement;
        if (active instanceof HTMLInputElement || active instanceof HTMLTextAreaElement) return;
        quickRef.current?.focus();
    });

    const handleQuickChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        setQuickText(e.target.value);
        const el = e.target;
        el.style.height = "auto";
        el.style.height = Math.min(el.scrollHeight, 120) + "px";
    };

    const handleQuickKeyDown = async (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.key !== "Enter" || e.shiftKey) return;
        e.preventDefault();
        const raw = quickText.trim();
        if (!raw || quickSaving) return;
        setQuickSaving(true);
        try {
            const { title, content } = parseQuickInsert(raw);
            await wikiService.upsertInfo({ title, content });
            await loadAll();
            setQuickText("");
            if (quickRef.current) {
                quickRef.current.style.height = "auto";
                quickRef.current.blur();
            }
        } finally {
            setQuickSaving(false);
        }
    };

    // ── Visible infos ─────────────────────────────────────────────────────────
    const [showInsert,  setShowInsert]  = useState(false);
    const [showKeyword, setShowKeyword] = useState(false);

    const focusedKws = keywords.filter(k => focusedIds.includes(k.id) && !k.deletedAt);

    const textContainsKw = (info: WikiInfo, kw: WikiKeyword ): boolean => {
        const text = `${info.title} ${info.content}`;
        return [kw.name, ...kw.synonyms].filter(Boolean).some(term => {
            const esc = term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
            return new RegExp(`(?<![A-Za-z0-9])${esc}(?![A-Za-z0-9])`, "i").test(text);
        });
    };

    // dim if not ALL selected keywords are explicitly linked
    const isDimmed = (info: WikiInfo) =>
        focusedIds.length > 0 && !focusedIds.every(id => info.keywordIds.includes(id));

    const visibleInfos: WikiInfo[] = (() => {
        let list = infos.filter(i => !i.deletedAt);
        if (focusedKws.length > 0) {
            // keep only infos whose text mentions ALL selected keywords
            list = list.filter(info => focusedKws.every(kw => textContainsKw(info, kw)));
        }
        if (appliedSearch.trim()) {
            const q = appliedSearch.toLowerCase();
            list = list.filter(i =>
                i.title.toLowerCase().includes(q) || i.content.toLowerCase().includes(q)
            );
        }
        // sort: fully-linked infos first
        if (focusedIds.length > 0) {
            list = [...list].sort((a, b) => {
                const aFull = !isDimmed(a), bFull = !isDimmed(b);
                if (aFull && !bFull) return -1;
                if (!aFull && bFull) return 1;
                return 0;
            });
        }
        return list;
    })();

    const handleDelete = async (id: number) => {
        await wikiService.deleteInfo(id);
        setInfos(prev => prev.map(i => i.id === id ? { ...i, deletedAt: new Date().toISOString() } : i));
    };

    const handleRestore = async (id: number) => {
        await wikiService.restoreInfo(id);
        setInfos(prev => prev.map(i => i.id === id ? { ...i, deletedAt: undefined } : i));
    };

    const deletedCount = infos.filter(i => {
        if (!i.deletedAt) return false;
        if (focusedIds.length === 0) return true;
        return focusedIds.every(id => i.keywordIds.includes(id));
    }).length;

    return (
        <div className="flex flex-col h-full bg-background">
            {/* Header / toolbar */}
            <div className="flex items-center gap-2 px-5 h-12 bg-background border-b border-sa-border flex-shrink-0">
                {/* Breadcrumb / selection chips */}
                <div className="flex items-center gap-1.5 flex-1 min-w-0 overflow-hidden">
                    <button
                        onClick={() => setSelectedKeywordIds([])}
                        className={`text-[13px] font-medium flex-shrink-0 transition-colors duration-100 ${
                            focusedKws.length > 0 ? "text-muted-foreground hover:text-foreground" : "text-foreground"
                        }`}
                    >
                        All Infos
                    </button>

                    {focusedKws.length === 1 && (
                        <>
                            <ChevronRight className="w-3.5 h-3.5 text-muted-foreground/70 flex-shrink-0" />
                            <span className="text-[13px] font-medium truncate text-foreground">
                                {focusedKws[0].name}
                            </span>
                            {focusedKws[0].synonyms.length > 0 && (
                                <span className="text-[11px] text-muted-foreground flex-shrink-0 truncate">
                                    ≈ {focusedKws[0].synonyms.join(", ")}
                                </span>
                            )}
                        </>
                    )}

                    {focusedKws.length > 1 && (
                        <>
                            <ChevronRight className="w-3.5 h-3.5 text-muted-foreground/70 flex-shrink-0" />
                            <div className="flex items-center gap-1 overflow-hidden">
                                {focusedKws.map(kw => (
                                    <button
                                        key={kw.id}
                                        onClick={() => setSelectedKeywordIds(selectedKeywordIds.filter(id => id !== kw.id))}
                                        className="flex items-center gap-1 px-1.5 py-0.5 rounded-md border border-sa-amber/40 bg-sa-amber/10 text-[11px] font-medium text-sa-amber-ink flex-shrink-0 transition-colors duration-100 hover:bg-sa-amber/20"
                                        title="Click to remove from selection"
                                    >
                                        {kw.name}
                                        <span className="text-[10px] opacity-60">×</span>
                                    </button>
                                ))}
                            </div>
                        </>
                    )}
                </div>

                {/* Search — Enter to apply */}
                <div className="relative flex-shrink-0">
                    <Search className="absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground w-3.5 h-3.5 pointer-events-none" />
                    <input
                        className="w-44 h-7 bg-transparent border border-sa-border-strong rounded-md pl-7 pr-6 text-[13px] text-foreground outline-none focus-visible:ring-1 focus-visible:ring-ring placeholder:text-muted-foreground transition-colors duration-100"
                        placeholder="Search… (Enter)"
                        value={searchInput}
                        onChange={e => setSearchInput(e.target.value)}
                        onKeyDown={handleSearchKeyDown}
                    />
                    {searchInput && (
                        <button
                            onClick={handleSearchClear}
                            className="absolute right-1.5 top-1/2 -translate-y-1/2 text-muted-foreground/70 hover:text-foreground transition-colors"
                        >
                            <X className="w-3 h-3" />
                        </button>
                    )}
                </div>

                <button
                    onClick={() => setShowKeyword(true)}
                    className="flex items-center gap-1.5 h-7 px-2.5 border border-sa-border-strong text-foreground text-[13px] font-medium rounded-md hover:bg-sa-hover-strong transition-colors duration-100 flex-shrink-0"
                >
                    <Plus className="w-3.5 h-3.5" /> Keyword
                </button>
                <button
                    onClick={() => setShowInsert(true)}
                    className="flex items-center gap-1.5 h-7 px-2.5 bg-sa-amber text-sa-on-amber text-[13px] font-medium rounded-md hover:bg-sa-amber/90 transition-colors duration-100 flex-shrink-0"
                >
                    <Plus className="w-3.5 h-3.5" /> Insert
                </button>
            </div>

            {/* Quick insert bar */}
            <div className="px-5 pt-3 pb-1 flex-shrink-0">
                <div className="relative">
                    <textarea
                        ref={quickRef}
                        rows={1}
                        className="w-full bg-card border border-sa-border rounded-lg px-3 py-2 pr-8 text-[13px] text-foreground placeholder:text-muted-foreground outline-none focus:border-sa-border-strong resize-none overflow-hidden leading-relaxed transition-colors duration-100"
                        placeholder="Quick insert — paste text and press Enter to save (Shift+Enter for new line, # Heading for title)"
                        value={quickText}
                        onChange={handleQuickChange}
                        onKeyDown={handleQuickKeyDown}
                        style={{ minHeight: "36px" }}
                    />
                    {quickSaving && (
                        <Loader2 className="absolute right-2.5 top-2.5 w-3.5 h-3.5 text-muted-foreground animate-spin pointer-events-none" />
                    )}
                </div>
            </div>

            {/* Info list */}
            <div className="flex-1 overflow-y-auto px-5 py-3">
                {visibleInfos.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-40 text-muted-foreground">
                        <div className="text-[13px] mb-1">No infos yet</div>
                        <button
                            onClick={() => setShowInsert(true)}
                            className="text-xs text-sa-amber-ink hover:underline underline-offset-2"
                        >
                            Insert the first one
                        </button>
                    </div>
                ) : (
                    <div className="flex flex-col gap-2.5">
                        {visibleInfos.map(info => (
                            <div key={info.id} style={{ opacity: isDimmed(info) ? 0.35 : 1, transition: "opacity 0.2s" }}>
                                <WikiInfoCard
                                    info={info}
                                    keywords={keywords}
                                    onDelete={() => handleDelete(info.id)}
                                    searchQuery={appliedSearch}
                                />
                            </div>
                        ))}
                    </div>
                )}

                {deletedCount > 0 && (
                    <div className="mt-5 pt-4 border-t border-sa-border">
                        <div className="text-[11px] text-muted-foreground font-medium uppercase tracking-wide mb-2">
                            Deleted ({deletedCount})
                        </div>
                        {infos
                            .filter(i => i.deletedAt && (focusedIds.length === 0 || focusedIds.every(id => i.keywordIds.includes(id))))
                            .map(info => (
                                <div key={info.id} className="flex items-center gap-2 py-1.5">
                                    <span className="text-[13px] text-muted-foreground line-through flex-1 truncate">
                                        {info.title || "(untitled)"}
                                    </span>
                                    <button
                                        onClick={() => handleRestore(info.id)}
                                        className="text-[11px] text-muted-foreground hover:text-sa-amber-ink transition-colors duration-100"
                                    >
                                        Restore
                                    </button>
                                </div>
                            ))
                        }
                    </div>
                )}
            </div>

            {showInsert  && <WikiInsertModal        onClose={() => setShowInsert(false)} />}
            {showKeyword && <WikiInsertKeywordModal onClose={() => setShowKeyword(false)} />}
        </div>
    );
}
