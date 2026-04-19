/**
 * WikiHighlightText — highlights search query matches inside plain text.
 * Renders a <span> with <mark> segments wrapping each match (case-insensitive).
 */

interface Props {
    text: string;
    highlight: string;
    className?: string;
}

export function WikiHighlightText({ text, highlight, className = "" }: Props) {
    if (!highlight || !highlight.trim()) {
        return <span className={className}>{text}</span>;
    }

    const query      = highlight.trim().toLowerCase();
    const lowerText  = text.toLowerCase();
    const parts: React.ReactNode[] = [];
    let i = 0;

    while (i < text.length) {
        const idx = lowerText.indexOf(query, i);
        if (idx === -1) {
            parts.push(text.slice(i));
            break;
        }
        if (idx > i) parts.push(text.slice(i, idx));
        parts.push(
            <mark
                key={idx}
                className="bg-yellow-400/80 text-black rounded-sm px-0.5"
            >
                {text.slice(idx, idx + query.length)}
            </mark>
        );
        i = idx + query.length;
    }

    return <span className={className}>{parts.length ? parts : text}</span>;
}
