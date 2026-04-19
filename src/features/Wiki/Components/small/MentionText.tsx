import type { WikiKeyword } from "../../types/wiki.type";

interface Segment {
    text: string;
    keyword?: WikiKeyword;
}

function buildSegments(text: string, keywords: WikiKeyword[]): Segment[] {
    if (!text || keywords.length === 0) return [{ text }];

    const hits: { start: number; end: number; kw: WikiKeyword }[] = [];
    for (const kw of keywords) {
        if (kw.deletedAt) continue;
        const terms = [kw.name, ...kw.synonyms].filter(Boolean);
        for (const term of terms) {
            const escaped = term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
            const regex = new RegExp(`(?<![A-Za-z0-9])${escaped}(?![A-Za-z0-9])`, "gi");
            let match: RegExpExecArray | null;
            while ((match = regex.exec(text)) !== null) {
                hits.push({ start: match.index, end: match.index + match[0].length, kw });
            }
        }
    }

    if (hits.length === 0) return [{ text }];
    hits.sort((a, b) => a.start - b.start || (b.end - b.start) - (a.end - a.start));

    const kept: typeof hits = [];
    let lastEnd = 0;
    for (const h of hits) {
        if (h.start >= lastEnd) { kept.push(h); lastEnd = h.end; }
    }

    const segments: Segment[] = [];
    let pos = 0;
    for (const h of kept) {
        if (h.start > pos) segments.push({ text: text.slice(pos, h.start) });
        segments.push({ text: text.slice(h.start, h.end), keyword: h.kw });
        pos = h.end;
    }
    if (pos < text.length) segments.push({ text: text.slice(pos) });
    return segments;
}

function SearchHighlight({ text, query }: { text: string; query: string }) {
    if (!query) return <>{text}</>;
    const idx = text.toLowerCase().indexOf(query.toLowerCase());
    if (idx === -1) return <>{text}</>;
    return (
        <>
            {text.slice(0, idx)}
            <mark style={{ background: "rgba(250,204,21,0.35)", color: "inherit", borderRadius: "2px", padding: 0 }}>
                {text.slice(idx, idx + query.length)}
            </mark>
            {text.slice(idx + query.length)}
        </>
    );
}

interface Props {
    text: string;
    keywords: WikiKeyword[];
    linkedKeywordIds?: number[];
    searchQuery?: string;
    onKeywordClick?: (keyword: WikiKeyword, rect: DOMRect) => void;
    onKeywordDoubleClick?: (id: number) => void;
    className?: string;
}

export default function MentionText({ text, keywords, linkedKeywordIds, searchQuery = "", onKeywordClick, onKeywordDoubleClick, className }: Props) {
    const segments = buildSegments(text, keywords);

    return (
        <span className={className} style={{ userSelect: "text" }}>
            {segments.map((seg, i) => {
                if (!seg.keyword) {
                    return (
                        <span key={i} style={{ userSelect: "text" }}>
                            <SearchHighlight text={seg.text} query={searchQuery} />
                        </span>
                    );
                }
                const isLinked = linkedKeywordIds?.includes(seg.keyword.id) ?? false;
                return (
                    <span
                        key={i}
                        onClick={e => { e.stopPropagation(); onKeywordClick?.(seg.keyword!, e.currentTarget.getBoundingClientRect()); }}
                        onDoubleClick={e => { e.stopPropagation(); onKeywordDoubleClick?.(seg.keyword!.id); }}
                        style={{
                            userSelect: "text",
                            textDecoration: "underline",
                            textDecorationStyle: isLinked ? "solid" : "dotted",
                            textDecorationColor: isLinked ? "rgba(139,92,246,0.5)" : "rgba(204, 204, 204, 0.56)",
                            textUnderlineOffset: "2px",
                            color: isLinked ? "rgba(196,181,253,0.85)" : "inherit",
                            cursor: onKeywordClick ? "pointer" : "text",
                        }}
                    >
                        <SearchHighlight text={seg.text} query={searchQuery} />
                    </span>
                );
            })}
        </span>
    );
}
