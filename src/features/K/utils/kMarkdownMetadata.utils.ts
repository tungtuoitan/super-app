// ── Scope validity helper ──────────────────────────────────────────────────────

/**
 * Returns the set of indices that are valid scope openers.
 * Rules: must have a matching close-context below; no inner item may carry its
 * own context or an open/close directive. An unpaired open-context is treated
 * as if it were never written — context stays private to that question.
 */
export function findValidScopeOpenerIndices<T>(
    items: T[],
    hasOpen: (item: T) => boolean,
    hasClose: (item: T) => boolean,
    hasOwnContext: (item: T) => boolean,
): Set<number> {
    const valid = new Set<number>();
    for (let i = 0; i < items.length; i++) {
        if (!hasOpen(items[i])) continue;
        for (let j = i + 1; j < items.length; j++) {
            const inner = items[j];
            if (hasOpen(inner) || hasOwnContext(inner)) break; // invalid scope
            if (hasClose(inner)) { valid.add(i); break; }
        }
    }
    return valid;
}

// ── Metadata helpers ───────────────────────────────────────────────────────────

export type Metadata = Record<string, string | number>;

/** Parse `[id:5 foo:bar open-context]` → `{ id: 5, foo: "bar" }` and directives `["open-context"]` */
function parseMetadata(bracket: string): { meta: Metadata; directives: string[] } {
    const meta: Metadata = {};
    const directives: string[] = [];
    // key:val pairs
    for (const m of bracket.matchAll(/(\w+):([^\s\]]+)/g)) {
        const raw = m[2];
        meta[m[1]] = isNaN(Number(raw)) ? raw : Number(raw);
    }
    // flag-only tokens (no colon) — e.g. open-context, close-context
    for (const m of bracket.matchAll(/(?<!\w)([a-z][a-z-]+[a-z])(?!\s*:)(?=[\s\]])/g)) {
        directives.push(m[1]);
    }
    return { meta, directives };
}

/** Build `{ id: 5, foo: "bar" }` → `[id:5 foo:bar]` */
function buildMetadata(meta: Metadata): string {
    const parts = Object.entries(meta).map(([k, v]) => `${k}:${v}`);
    return parts.length ? `[${parts.join(" ")}]` : "";
}

/** Strip the first `[...]` block from text and return clean text + parsed meta + directives */
export function extractMetadata(text: string): { clean: string; meta: Metadata; directives: string[] } {
    const match = text.match(/\[([^\]]+)\]/);
    if (!match) return { clean: text.trim(), meta: {}, directives: [] };
    const { meta, directives } = parseMetadata(match[1]);
    const clean = text.replace(/\s*\[[^\]]+\]\s*/g, "").trim();
    return { clean, meta, directives };
}
