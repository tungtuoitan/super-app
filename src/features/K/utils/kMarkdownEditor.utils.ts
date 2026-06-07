import type { KQuestion } from "../types/kQuiz.type";

// ── Types ──────────────────────────────────────────────────────────────────────

export interface ParsedQuestion {
    id: number | null;
    question: string;
    answer: string;
    isDraft: boolean;
    /** Raw metadata from the bracket tag — for future extensibility */
    meta: Record<string, string | number>;
}

// ── Metadata helpers ───────────────────────────────────────────────────────────

type Metadata = Record<string, string | number>;

/** Parse `[id:5 foo:bar]` → `{ id: 5, foo: "bar" }` */
function parseMetadata(bracket: string): Metadata {
    const meta: Metadata = {};
    for (const m of bracket.matchAll(/(\w+):(\S+)/g)) {
        const raw = m[2];
        meta[m[1]] = isNaN(Number(raw)) ? raw : Number(raw);
    }
    return meta;
}

/** Build `{ id: 5, foo: "bar" }` → `[id:5 foo:bar]` */
function buildMetadata(meta: Metadata): string {
    const parts = Object.entries(meta).map(([k, v]) => `${k}:${v}`);
    return parts.length ? `[${parts.join(" ")}]` : "";
}

/** Strip the first `[...]` block from text and return clean text + parsed meta */
function extractMetadata(text: string): { clean: string; meta: Metadata } {
    const match = text.match(/\[([^\]]+)\]/);
    if (!match) return { clean: text.trim(), meta: {} };
    const meta = parseMetadata(match[1]);
    const clean = text.replace(/\s*\[[^\]]+\]\s*/g, "").trim();
    return { clean, meta };
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

    for (let i = 0; i < lines.length; i++) {
        const lineNum = i + 1;
        const line = lines[i].trimEnd();

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
        const tag = buildMetadata({ id: q.id });
        if (q.statusCode === "draft") {
            if (q.answer?.trim()) {
                lines.push(`<!--# ${q.question} ${tag}`);
                lines.push(`${q.answer.trim()} -->`);
            } else {
                lines.push(`<!--# ${q.question} ${tag} -->`);
            }
        } else {
            lines.push(`# ${q.question} ${tag}`);
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
        // p.meta already contains id (and any extra keys) as parsed from the bracket
        const tag = buildMetadata(p.meta);
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

    const flush = () => {
        if (!cur) return;
        cur.answer = cur.answer.trim();
        if (cur.question.trim()) result.push(cur);
        cur = null;
    };

    for (const raw of md.split("\n")) {
        const line = raw.trimEnd();

        // ── Start of draft block: <!--# Question [id:X] [-->] ────────────────
        if (/^<!--\s*#\s/.test(line)) {
            flush();
            inDraftBlock = false;

            const isSingleLine = /-->\s*$/.test(line);
            // Strip opening <!--# and optionally closing -->
            const inner = line
                .replace(/^<!--\s*#\s+/, "")
                .replace(/\s*-->\s*$/, "")
                .trim();

            const { clean: question, meta } = extractMetadata(inner);

            // Require an id — can't create a draft question without saving first
            if (question && typeof meta.id === "number") {
                cur = { id: meta.id, question, answer: "", isDraft: true, meta };
                if (isSingleLine) {
                    flush();
                } else {
                    inDraftBlock = true;
                }
            }
            continue;
        }

        // ── Inside multi-line draft block ─────────────────────────────────────
        if (inDraftBlock) {
            const isClosing = /-->\s*$/.test(line);
            const content = line.replace(/\s*-->\s*$/, "");
            if (cur && content) {
                cur.answer = cur.answer ? cur.answer + "\n" + content : content;
            }
            if (isClosing) {
                flush();
                inDraftBlock = false;
            }
            continue;
        }

        // ── Active question: # Question [id:X]  or  # New question ───────────
        if (/^#\s/.test(line)) {
            flush();
            const { clean: question, meta } = extractMetadata(line.slice(2).trim());
            if (question) {
                cur = {
                    id: typeof meta.id === "number" ? meta.id : null,
                    question,
                    answer: "",
                    isDraft: false,
                    meta,
                };
            }
            continue;
        }

        // ── Answer lines (active questions only) ──────────────────────────────
        if (cur && !cur.isDraft) {
            cur.answer = cur.answer ? cur.answer + "\n" + line : line;
        }
    }
    flush();
    return result;
}
