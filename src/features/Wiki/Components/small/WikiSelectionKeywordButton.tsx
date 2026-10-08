import { useEffect, useState } from "react";
import { Plus, Link2, LinkIcon, Tags, X, Search, Check, Loader2 } from "lucide-react";
import { useWikiStore } from "../../store/useWiki.store";
import { useWikiLoader } from "../../hooks/useWikiLoader.helper";
import { wikiService } from "../../service/wiki.service";
import type { WikiKeyword } from "../../types/wiki.type";
import { fuzzyMatchWithDiacritics } from "@/shared";

function findMatchedKeyword(text: string, keywords: WikiKeyword[]): WikiKeyword | null {
    const normalized = text.trim().toLowerCase();
    for (const kw of keywords) {
        if (kw.deletedAt) continue;
        const terms = [kw.name, ...kw.synonyms].filter(Boolean);
        if (terms.some(t => t.toLowerCase() === normalized)) return kw;
    }
    return null;
}

// ─── Selection Tooltip (text bôi đen, không phải keyword) ─────────────────────

interface SelectionTooltipProps {
    containerRef: React.RefObject<HTMLDivElement | null>;
}

type SelectionModal = { type: "create"; text: string } | { type: "synonym"; text: string };

export function WikiSelectionTooltip({ containerRef }: SelectionTooltipProps) {
    const { keywords } = useWikiStore();
    const [anchor, setAnchor]             = useState<{ x: number; y: number } | null>(null);
    const [selectedText, setSelectedText] = useState("");
    const [activeModal, setActiveModal]   = useState<SelectionModal | null>(null);

    useEffect(() => {
        const handleMouseUp = () => {
            const sel = window.getSelection();
            if (!sel || sel.isCollapsed) { setAnchor(null); setSelectedText(""); return; }
            const text = sel.toString().trim();
            if (!text || text.length > 100) { setAnchor(null); setSelectedText(""); return; }
            if (!containerRef.current) return;
            const range = sel.getRangeAt(0);
            if (!containerRef.current.contains(range.commonAncestorContainer)) { setAnchor(null); setSelectedText(""); return; }
            // Don't show if exact match is already a keyword (use click tooltip instead)
            if (findMatchedKeyword(text, keywords)) { setAnchor(null); setSelectedText(""); return; }
            const rect = range.getBoundingClientRect();
            setAnchor({ x: rect.left + rect.width / 2, y: rect.top - 6 });
            setSelectedText(text);
        };

        const handleMouseDown = (e: MouseEvent) => {
            const el = document.getElementById("wiki-sel-tooltip");
            if (el && el.contains(e.target as Node)) return;
            setAnchor(null); setSelectedText("");
        };

        document.addEventListener("mouseup",   handleMouseUp);
        document.addEventListener("mousedown", handleMouseDown);
        return () => {
            document.removeEventListener("mouseup",   handleMouseUp);
            document.removeEventListener("mousedown", handleMouseDown);
        };
    }, [containerRef, keywords]);

    const dismiss = () => { setAnchor(null); setSelectedText(""); };

    return (
        <>
            {anchor && selectedText && (
                <div
                    id="wiki-sel-tooltip"
                    className="fixed z-[99999] flex items-center gap-px rounded-lg sa-shadow-pop bg-popover border border-sa-border-strong overflow-hidden"
                    style={{ left: anchor.x, top: anchor.y, transform: "translate(-50%, -100%)", whiteSpace: "nowrap" }}
                    onMouseDown={e => e.preventDefault()}
                >
                    <TooltipBtn label="Create keyword" icon={<Plus className="w-3 h-3" />}
                        onClick={() => { setActiveModal({ type: "create", text: selectedText }); dismiss(); }} />
                    <TooltipBtn label="Create synonym" icon={<Tags className="w-3 h-3" />}
                        onClick={() => { setActiveModal({ type: "synonym", text: selectedText }); dismiss(); }} />
                </div>
            )}
            {activeModal?.type === "create"  && <WikiCreateKeywordModal initialName={activeModal.text} onClose={() => setActiveModal(null)} />}
            {activeModal?.type === "synonym" && <WikiAddSynonymModal    synonymText={activeModal.text} onClose={() => setActiveModal(null)} />}
        </>
    );
}

// ─── Keyword Click Tooltip (click vào keyword span) ───────────────────────────

interface KeywordTooltipProps {
    keyword: WikiKeyword;
    infoId: number;
    rect: DOMRect;
    onClose: () => void;
}

export function WikiKeywordTooltip({ keyword, infoId, rect, onClose }: KeywordTooltipProps) {
    const { infos }   = useWikiStore();
    const { loadAll } = useWikiLoader();
    const [loading, setLoading] = useState(false);

    const isLinked = (infos.find(i => i.id === infoId)?.keywordIds ?? []).includes(keyword.id);

    useEffect(() => {
        const handleMouseDown = (e: MouseEvent) => {
            const el = document.getElementById("wiki-kw-tooltip");
            if (el && el.contains(e.target as Node)) return;
            onClose();
        };
        document.addEventListener("mousedown", handleMouseDown);
        return () => document.removeEventListener("mousedown", handleMouseDown);
    }, []);

    const handleLink = async () => {
        if (loading) return;
        setLoading(true);
        try {
            await wikiService.updateKeyword(keyword.id, { addInfoIds: [infoId] });
            await loadAll();
            onClose();
        } finally { setLoading(false); }
    };

    const handleUnlink = async () => {
        if (loading) return;
        setLoading(true);
        try {
            await wikiService.updateKeyword(keyword.id, { removeInfoIds: [infoId] });
            await loadAll();
            onClose();
        } finally { setLoading(false); }
    };

    return (
        <div
            id="wiki-kw-tooltip"
            className="fixed z-[99999] flex items-center gap-px rounded-lg sa-shadow-pop bg-popover border border-sa-border-strong overflow-hidden"
            style={{ left: rect.left + rect.width / 2, top: rect.top - 6, transform: "translate(-50%, -100%)", whiteSpace: "nowrap" }}
            onMouseDown={e => e.preventDefault()}
        >
            {loading
                ? <div className="flex items-center gap-1.5 h-7 px-2.5 text-[11px] text-muted-foreground"><Loader2 className="w-3 h-3 animate-spin" />Loading…</div>
                : isLinked
                    ? <TooltipBtn label="Unlink" icon={<LinkIcon className="w-3 h-3" />} onClick={handleUnlink} className="text-sa-danger hover:bg-sa-danger/10" />
                    : <TooltipBtn label="Create link" icon={<Link2 className="w-3 h-3" />} onClick={handleLink} />
            }
        </div>
    );
}

// ─── Shared button ────────────────────────────────────────────────────────────

function TooltipBtn({ label, icon, disabled, onClick, className }: { label: string; icon: React.ReactNode; disabled?: boolean; onClick: () => void; className?: string }) {
    return (
        <button
            onClick={disabled ? undefined : onClick}
            className={`flex items-center gap-1.5 h-7 px-2.5 text-[11px] font-medium transition-colors ${
                disabled ? "text-muted-foreground/70 cursor-default" : `text-foreground hover:bg-sa-hover-strong cursor-pointer ${className ?? ""}`
            }`}
        >
            {icon}{label}
        </button>
    );
}

// ─── Create Keyword Modal ─────────────────────────────────────────────────────

interface CreateKeywordModalProps { initialName: string; onClose: () => void; }

export function WikiCreateKeywordModal({ initialName, onClose }: CreateKeywordModalProps) {
    const { loadAll }         = useWikiLoader();
    const [name, setName]     = useState(initialName);
    const [saving, setSaving] = useState(false);

    const handleSave = async () => {
        if (!name.trim()) return;
        setSaving(true);
        try { await wikiService.createKeyword(name.trim(), []); await loadAll(); onClose(); }
        finally { setSaving(false); }
    };

    return (
        <div className="fixed inset-0 bg-background/70 backdrop-blur-sm z-[100000] flex items-center justify-center"
            onKeyDown={e => { if (e.key === "Escape") onClose(); if (e.key === "Enter") { e.preventDefault(); handleSave(); } }}>
            <div className="bg-popover border border-sa-border-strong rounded-xl w-[360px] sa-shadow-pop overflow-hidden">
                <div className="px-5 pt-5 pb-4 border-b border-sa-border flex items-start justify-between">
                    <div>
                        <h2 className="text-[14px] font-medium text-foreground">Create Keyword</h2>
                        <p className="text-xs text-muted-foreground mt-0.5">Enter to save · Esc to cancel</p>
                    </div>
                    <button onClick={onClose} className="w-7 h-7 flex items-center justify-center rounded-md hover:bg-sa-hover-strong text-muted-foreground hover:text-foreground transition-colors duration-100"><X className="w-4 h-4" /></button>
                </div>
                <div className="px-5 py-4">
                    <label className="block text-[11px] font-medium text-muted-foreground uppercase tracking-wide mb-1.5">Keyword name</label>
                    <input autoFocus
                        className="w-full h-9 bg-transparent border border-sa-border-strong rounded-lg px-3 text-[13px] font-medium text-foreground outline-none focus:border-ring placeholder:text-muted-foreground transition-colors"
                        value={name} onChange={e => setName(e.target.value)} placeholder="Keyword name…" />
                </div>
                <div className="px-5 pb-4 flex justify-end gap-2">
                    <button onClick={onClose} className="h-8 px-3.5 rounded-lg border border-sa-border-strong text-foreground text-xs font-medium hover:bg-sa-hover-strong transition-colors">Cancel</button>
                    <button onClick={handleSave} disabled={!name.trim() || saving}
                        className="h-8 px-3.5 rounded-lg bg-sa-amber text-sa-on-amber text-xs font-medium hover:bg-sa-amber/90 disabled:opacity-40 transition-colors flex items-center gap-1.5">
                        {saving && <Loader2 className="w-3 h-3 animate-spin" />}<Check className="w-3 h-3" /> Create
                    </button>
                </div>
            </div>
        </div>
    );
}

// ─── Add Synonym Modal ────────────────────────────────────────────────────────

function FuzzyHighlight({ text, indices }: { text: string; indices: number[] }) {
    if (indices.length === 0) return <>{text}</>;
    const set = new Set(indices);
    return (
        <>
            {text.split("").map((ch, i) =>
                set.has(i)
                    ? <span key={i} className="font-semibold text-sa-amber-ink">{ch}</span>
                    : <span key={i}>{ch}</span>
            )}
        </>
    );
}

interface AddSynonymModalProps { synonymText: string; onClose: () => void; }

function WikiAddSynonymModal({ synonymText, onClose }: AddSynonymModalProps) {
    const { keywords }          = useWikiStore();
    const { loadAll }           = useWikiLoader();
    const [search, setSearch]   = useState(synonymText);
    const [picked, setPicked]   = useState<WikiKeyword | null>(null);
    const [saving, setSaving]   = useState(false);

    const searchWords = search.trim().split(/\s+/).filter(Boolean);
    const filtered = keywords
        .filter(k => !k.deletedAt)
        .flatMap(k => {
            if (!search.trim()) return [{ kw: k, score: 0, indices: [] as number[] }];
            const result = fuzzyMatchWithDiacritics(k.name, searchWords);
            return result.match ? [{ kw: k, score: result.score, indices: result.matchedIndices }] : [];
        })
        .sort((a, b) => b.score - a.score);

    const handleSave = async () => {
        if (!picked) return;
        setSaving(true);
        try { await wikiService.updateKeyword(picked.id, { synonyms: [...picked.synonyms, synonymText.trim()] }); await loadAll(); onClose(); }
        finally { setSaving(false); }
    };

    return (
        <div className="fixed inset-0 bg-background/70 backdrop-blur-sm z-[100000] flex items-center justify-center"
            onKeyDown={e => { if (e.key === "Escape") onClose(); }}>
            <div className="bg-popover border border-sa-border-strong rounded-xl w-[400px] sa-shadow-pop overflow-hidden">
                <div className="px-5 pt-5 pb-4 border-b border-sa-border flex items-start justify-between">
                    <div>
                        <h2 className="text-[14px] font-medium text-foreground">Add synonym: <span className="text-sa-amber-ink">"{synonymText}"</span></h2>
                        <p className="text-xs text-muted-foreground mt-0.5">Pick the keyword this is a synonym of</p>
                    </div>
                    <button onClick={onClose} className="w-7 h-7 flex items-center justify-center rounded-md hover:bg-sa-hover-strong text-muted-foreground hover:text-foreground transition-colors duration-100"><X className="w-4 h-4" /></button>
                </div>
                <div className="px-5 pt-4 pb-2">
                    <div className="relative">
                        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground/70 pointer-events-none" />
                        <input autoFocus
                            className="w-full h-8 bg-transparent border border-sa-border-strong rounded-lg pl-8 pr-3 text-[12px] text-foreground outline-none focus:border-ring placeholder:text-muted-foreground transition-colors"
                            placeholder="Search keywords…" value={search} onChange={e => setSearch(e.target.value)} />
                    </div>
                </div>
                <div className="px-5 pb-2 max-h-48 overflow-y-auto">
                    {filtered.length === 0
                        ? <p className="text-xs text-muted-foreground/70 py-3 text-center">No keywords found</p>
                        : filtered.map(({ kw, indices }) => (
                            <button key={kw.id} onClick={() => setPicked(kw)}
                                className={`w-full text-left px-3 py-2 rounded-lg text-[13px] transition-colors mb-0.5 ${picked?.id === kw.id ? "bg-sa-amber/20 text-sa-amber-ink" : "text-foreground hover:bg-sa-hover-strong"}`}>
                                <FuzzyHighlight text={kw.name} indices={indices} />
                                {kw.synonyms.length > 0 && <span className="text-[11px] text-muted-foreground ml-2">≈ {kw.synonyms.join(", ")}</span>}
                            </button>
                        ))}
                </div>
                <div className="px-5 py-4 border-t border-sa-border flex justify-end gap-2">
                    <button onClick={onClose} className="h-8 px-3.5 rounded-lg border border-sa-border-strong text-foreground text-xs font-medium hover:bg-sa-hover-strong transition-colors">Cancel</button>
                    <button onClick={handleSave} disabled={!picked || saving}
                        className="h-8 px-3.5 rounded-lg bg-sa-amber text-sa-on-amber text-xs font-medium hover:bg-sa-amber/90 disabled:opacity-40 transition-colors flex items-center gap-1.5">
                        {saving && <Loader2 className="w-3 h-3 animate-spin" />}<Check className="w-3 h-3" /> Add synonym
                    </button>
                </div>
            </div>
        </div>
    );
}
