import type { KQuestion } from "../types/kQuiz.type";

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

// ── Metadata helpers ───────────────────────────────────────────────────────────

type Metadata = Record<string, string | number>;

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
function extractMetadata(text: string): { clean: string; meta: Metadata; directives: string[] } {
    const match = text.match(/\[([^\]]+)\]/);
    if (!match) return { clean: text.trim(), meta: {}, directives: [] };
    const { meta, directives } = parseMetadata(match[1]);
    const clean = text.replace(/\s*\[[^\]]+\]\s*/g, "").trim();
    return { clean, meta, directives };
}

// ── Validation ────────────────────────────────────────────────────────────────

export interface MarkdownError {
    /** 1-based line number */
    line: number;
    message: string;
}

/**
 * Validate markdown format. Returns a list of errors (empty = valid).
 *
 * Rules:
 *  1. Bare `<!--` without `#` on the same line is not allowed — use `<!--#`
 *  2. Each `<!--# ... -->` block may contain exactly ONE question
 *  3. Every `<!--#` block must be closed with `-->`
 */
export function validateMarkdown(md: string): MarkdownError[] {
    const errors: MarkdownError[] = [];
    const lines = md.split("\n");
    let inDraftBlock = false;
    let draftBlockStart = -1;
    let inCodeBlock = false;

    for (let i = 0; i < lines.length; i++) {
        const lineNum = i + 1;
        const line = lines[i].trimEnd();

        // Track fenced code blocks so `#` inside code is not validated as a heading
        if (line.startsWith("```") || line.startsWith("~~~")) {
            inCodeBlock = !inCodeBlock;
            continue;
        }
        if (inCodeBlock) continue;

        // ── Inside a multi-line draft block ───────────────────────────────────
        if (inDraftBlock) {
            // A `#` line inside a draft block = second question — not allowed
            if (/^#\s/.test(line)) {
                errors.push({ line: lineNum, message: `Each comment block must contain only one question (block started at line ${draftBlockStart})` });
            }
            // Closing -->
            if (/-->\s*$/.test(line)) {
                inDraftBlock = false;
                draftBlockStart = -1;
            }
            continue; // skip all other checks — answer content is free-form
        }

        // ── Outside draft blocks ──────────────────────────────────────────────

        // ## or deeper headings — only single # is allowed
        if (/^#{2,}\s/.test(line)) {
            errors.push({ line: lineNum, message: "Only single # headings are allowed — remove extra #" });
            continue;
        }

        // Opening of a draft block: <!--# Question [id:X]
        if (/^<!--\s*#\s/.test(line)) {
            const isSingleLine = /-->\s*$/.test(line);
            if (!isSingleLine) {
                inDraftBlock = true;
                draftBlockStart = lineNum;
            }
            continue;
        }

        // Bare <!-- (not <!--#) — common mistake when user manually types a comment
        if (/^<!--/.test(line)) {
            errors.push({ line: lineNum, message: "Bare <!-- not allowed — use <!--# to start a draft question" });
        }
    }

    // Unclosed draft block
    if (inDraftBlock) {
        errors.push({ line: draftBlockStart, message: "Unclosed draft block — missing closing -->" });
    }

    return errors;
}

// ── Build markdown from questions ──────────────────────────────────────────────

/**
 * Render questions to markdown.
 *
 * Format:
 *   Active (no answer)    →  # Question [id:5]
 *   Active (with answer)  →  # Question [id:5]
 *                             Answer text here
 *
 *   Draft (no answer)     →  <!--# Question [id:5] -->
 *   Draft (with answer)   →  <!--# Question [id:5]
 *                             Answer text here -->
 */
export function buildMarkdown(questions: KQuestion[]): string {
    const active = questions.filter(q => !q.deletedAt);
    if (active.length === 0) return "";

    const sorted = [...active].sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));
    const lines: string[] = [];

    for (const q of sorted) {
        const meta: Metadata = { id: q.id, order: q.sortOrder ?? 0 };
        const dirs = q.directives ?? [];
        const attIds = q.attachments?.map(a => a.id) ?? [];
        if (attIds.length > 0) meta.atts = attIds.join(",");
        // Build tag: [id:X order:Y open-context atts:1,2]
        const metaParts = Object.entries(meta).map(([k, v]) => `${k}:${v}`);
        const dirParts = dirs.filter(d => d.length > 0);
        const tagInner = [...metaParts, ...dirParts].join(" ");
        const tag = tagInner ? `[${tagInner}]` : "";
        const hasOwnedContext = !!q.context && q.context.trim().length > 0 && dirs.includes("open-context");
        if (q.statusCode === "draft") {
            if (q.answer?.trim()) {
                lines.push(`<!--# ${q.question} ${tag}`);
                lines.push(`${q.answer.trim()} -->`);
            } else {
                lines.push(`<!--# ${q.question} ${tag} -->`);
            }
        } else {
            lines.push(`# ${q.question} ${tag}`);
            if (hasOwnedContext) {
                lines.push(q.context!.trim());
                lines.push("");
            }
            if (q.answer?.trim()) lines.push(q.answer.trim());
        }
        lines.push("");
    }

    return lines.join("\n").trimEnd();
}

// ── Format (normalize) markdown ───────────────────────────────────────────────

/**
 * Round-trip the markdown through parse → emit to produce canonical form.
 * Used by the Format button in the editor to test the parse/build pipeline
 * before wiring it into the save flow.
 *
 * Unlike buildMarkdown (which reads from KQuestion[] in DB state), this works
 * purely from the current editor text — draft answers are preserved as-is.
 */
export function formatMarkdown(md: string): string {
    const parsed = parseMarkdown(md);
    if (parsed.length === 0) return "";

    const lines: string[] = [];
    for (const p of parsed) {
        const metaParts = Object.entries(p.meta).map(([k, v]) => `${k}:${v}`);
        const dirParts = p.directives.filter(d => d.length > 0);
        const tagInner = [...metaParts, ...dirParts].join(" ");
        const tag = tagInner ? `[${tagInner}]` : "";
        const header = tag ? `${p.question} ${tag}` : p.question;

        if (p.isDraft) {
            if (p.answer) {
                lines.push(`<!--# ${header}`);
                lines.push(`${p.answer} -->`);
            } else {
                lines.push(`<!--# ${header} -->`);
            }
        } else {
            lines.push(`# ${header}`);
            if (p.context) {
                lines.push(p.context);
                lines.push("");
            }
            if (p.answer) lines.push(p.answer);
        }
        lines.push("");
    }
    return lines.join("\n").trimEnd();
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

    // Scope resolution: inherit context from open-context question to all questions
    // up to and including the close-context question.
    let scopeContext: string | null = null;
    let inScope = false;
    for (let i = 0; i < result.length; i++) {
        const pq = result[i];
        const hasOpen  = pq.directives.includes("open-context");
        const hasClose = pq.directives.includes("close-context");

        if (hasOpen && pq.context) {
            scopeContext = pq.context;
            inScope = true;
            continue;
        }

        if (inScope) {
            if (!pq.context) result[i] = { ...pq, context: scopeContext };
            if (hasClose) { inScope = false; scopeContext = null; }
        }
    }

    return result;
}

// ── Repo file helpers ─────────────────────────────────────────────────────────

/** Build a repo `.md` file body. Identity comes from the path, not frontmatter. */
export function buildRepoMarkdown(questions: KQuestion[]): string {
    return buildMarkdown(questions);
}

/** Parse a repo `.md` file — no frontmatter, just question list. */
export function parseRepoMarkdown(md: string): { questions: ParsedQuestion[] } {
    return { questions: parseMarkdown(md) };
}
