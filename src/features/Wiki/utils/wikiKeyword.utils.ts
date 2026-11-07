import type { KeywordRow, ParsedEntry } from "../types/wiki.type";

export function mkRow(): KeywordRow {
    return { id: crypto.randomUUID(), name: "", synonyms: [], synonymInput: "", showSynonyms: false };
}

export function parseMarkdownKeywords(text: string): ParsedEntry[] {
    const result: ParsedEntry[] = [];
    let current: ParsedEntry | null = null;

    for (const raw of text.split("\n")) {
        const line = raw.trim();
        if (line.startsWith("# ")) {
            if (current) result.push(current);
            const name = line.slice(2).trim();
            current = name ? { name, synonyms: [] } : null;
        } else if (line.startsWith("- ") && current) {
            const syn = line.slice(2).trim();
            if (syn && !current.synonyms.includes(syn)) current.synonyms.push(syn);
        }
    }
    if (current) result.push(current);
    return result;
}
