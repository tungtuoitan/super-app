/**
 * Keyword Indexer Service
 * Simple in-memory keyword index for highlighting and autocomplete
 */

export interface KeywordMeta {
    id: string;
    text: string;
    type: "hashtag" | "status" | "entity"; // hashtag, status, note, workspace, etc.
    description?: string;
    active?: boolean;
}

export class KeywordIndexer {
    private keywords: Map<string, KeywordMeta> = new Map();
    private index: Map<string, string[]> = new Map(); // prefix → ids

    /**
     * Initialize with keywords
     */
    load(keywords: KeywordMeta[]) {
        this.keywords.clear();
        this.index.clear();

        keywords.forEach((kw) => {
            if (!kw.active) return;
            this.keywords.set(kw.text.toLowerCase(), kw);
            this.indexKeyword(kw.text);
        });
    }

    /**
     * Build prefix index for fast autocomplete
     */
    private indexKeyword(text: string) {
        const lower = text.toLowerCase();
        for (let i = 1; i <= lower.length; i++) {
            const prefix = lower.substring(0, i);
            if (!this.index.has(prefix)) {
                this.index.set(prefix, []);
            }
            this.index.get(prefix)!.push(lower);
        }
    }

    /**
     * Get all keywords
     */
    getAll(): KeywordMeta[] {
        return Array.from(this.keywords.values());
    }

    /**
     * Search by prefix (autocomplete)
     */
    searchByPrefix(prefix: string, limit: number = 10): KeywordMeta[] {
        if (!prefix) return this.getAll().slice(0, limit);

        const lower = prefix.toLowerCase();
        const matches = this.index.get(lower) || [];

        return matches
            .slice(0, limit)
            .map((kw) => this.keywords.get(kw)!)
            .filter(Boolean);
    }

    /**
     * Get metadata by keyword text
     */
    getMetadata(text: string): KeywordMeta | undefined {
        return this.keywords.get(text.toLowerCase());
    }

    /**
     * Find all keywords in text
     */
    findMatches(text: string): Array<{ start: number; end: number; keyword: KeywordMeta }> {
        const matches: Array<{ start: number; end: number; keyword: KeywordMeta }> = [];
        const lower = text.toLowerCase();

        this.keywords.forEach((kw) => {
            const kwLower = kw.text.toLowerCase();
            let startIndex = 0;

            while (true) {
                const index = lower.indexOf(kwLower, startIndex);
                if (index === -1) break;

                // Check word boundary (simple: space or start)
                const beforeOk = index === 0 || /\s/.test(lower[index - 1]);
                const afterOk = index + kwLower.length === lower.length || /\s/.test(lower[index + kwLower.length]);

                if (beforeOk && afterOk) {
                    matches.push({
                        start: index,
                        end: index + kwLower.length,
                        keyword: kw,
                    });
                }

                startIndex = index + 1;
            }
        });

        return matches.sort((a, b) => a.start - b.start);
    }
}

export const keywordIndexer = new KeywordIndexer();
