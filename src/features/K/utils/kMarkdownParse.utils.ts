import { extractMetadata, findValidScopeOpenerIndices } from "./kMarkdownMetadata.utils";

// ── Types ──────────────────────────────────────────────────────────────────────

export interface ParsedQuestion {
    id: number | null;
    question: string;
    answer: string;
    context: string | null;
    directives: string[];
    isDraft: boolean;
    /** Raw metadata from the bracket tag — for future extensibility */
    meta: Record<string, string | number>;
}

// ── Parse markdown into question list ─────────────────────────────────────────

/**
 * Parse markdown back into a flat list of questions preserving order.
 *
 * Draft format:
 *   Single-line:  <!--# Question [id:X] -->
 *   Multi-line:   <!--# Question [id:X]
 *                 Answer text here -->
 *
 * Rules:
 *   - Draft blocks must have an id to be tracked (new drafts without id are ignored)
 *   - Active `# New question` (no id) creates a new question on save
 */
export function parseMarkdown(md: string): ParsedQuestion[] {
    const result: ParsedQuestion[] = [];
    let cur: ParsedQuestion | null = null;
    let inDraftBlock = false;
    let inContext = false;
    let inCodeBlock = false;

    const flush = () => {
        if (!cur) return;
        cur.answer = cur.answer.trim();
        if (cur.context !== null) cur.context = cur.context.trim();
        if (cur.question.trim()) result.push(cur);
        cur = null;
        inContext = false;
        inCodeBlock = false;
    };

    for (const raw of md.split("\n")) {
        const line = raw.trimEnd();
        const isFence = line.startsWith("```") || line.startsWith("~~~");

        if (inContext) {
            cur!.context = cur!.context === null ? line : cur!.context + "\n" + line;
            if (isFence) inContext = false;
            continue;
        }

        if (cur && !cur.isDraft && !inCodeBlock && isFence && !cur.answer.trim() && cur.context === null) {
            inContext = true;
            cur.context = line;
            continue;
        }

        if (isFence) inCodeBlock = !inCodeBlock;
        if (inCodeBlock) {
            if (cur && !cur.isDraft) {
                cur.answer = cur.answer ? cur.answer + "\n" + line : line;
            }
            continue;
        }

        if (/^<!--\s*#\s/.test(line)) {
            flush();
            inDraftBlock = false;

            const isSingleLine = /-->\s*$/.test(line);
            const inner = line
                .replace(/^<!--\s*#\s+/, "")
                .replace(/\s*-->\s*$/, "")
                .trim();

            const { clean: question, meta, directives } = extractMetadata(inner);

            if (question && typeof meta.id === "number") {
                cur = { id: meta.id, question, answer: "", context: null, directives, isDraft: true, meta };
                if (isSingleLine) { flush(); } else { inDraftBlock = true; }
            }
            continue;
        }

        if (inDraftBlock) {
            const isClosing = /-->\s*$/.test(line);
            const content = line.replace(/\s*-->\s*$/, "");
            if (cur && content) {
                cur.answer = cur.answer ? cur.answer + "\n" + content : content;
            }
            if (isClosing) { flush(); inDraftBlock = false; }
            continue;
        }

        if (/^#\s/.test(line)) {
            flush();
            const { clean: question, meta, directives } = extractMetadata(line.slice(2).trim());
            if (question) {
                cur = {
                    id: typeof meta.id === "number" ? meta.id : null,
                    question,
                    answer: "",
                    context: null,
                    directives,
                    isDraft: false,
                    meta,
                };
            }
            continue;
        }

        if (cur && !cur.isDraft) {
            cur.answer = cur.answer ? cur.answer + "\n" + line : line;
        }
    }
    flush();

    // Scope resolution: open-context + close-context MUST pair up.
    // An unpaired open-context is ignored — context stays private to that question.
    const validOpenerIdx = findValidScopeOpenerIndices(
        result,
        pq => pq.directives.includes("open-context"),
        pq => pq.directives.includes("close-context"),
        pq => !!pq.context && pq.context.trim().length > 0,
    );
    let scopeContext: string | null = null;
    let inScope = false;
    for (let i = 0; i < result.length; i++) {
        const pq = result[i];
        const hasOpen  = pq.directives.includes("open-context");
        const hasClose = pq.directives.includes("close-context");

        if (hasOpen) {
            if (validOpenerIdx.has(i) && pq.context) {
                scopeContext = pq.context;
                inScope = true;
            }
            continue;
        }

        if (inScope) {
            if (!pq.context) result[i] = { ...pq, context: scopeContext };
            if (hasClose) { inScope = false; scopeContext = null; }
        }
    }

    return result;
}

/** Parse a repo `.md` file — no frontmatter, just question list. */
export function parseRepoMarkdown(md: string): { questions: ParsedQuestion[] } {
    return { questions: parseMarkdown(md) };
}
