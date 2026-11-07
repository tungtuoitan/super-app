import type { KQuestion } from "../types/kQuiz.type";
import { findValidScopeOpenerIndices, type Metadata } from "./kMarkdownMetadata.utils";
import { parseMarkdown } from "./kMarkdownParse.utils";

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

    // Pre-compute which openers form a valid open/close pair.
    const validOpenerIdx = findValidScopeOpenerIndices(
        sorted,
        q => (q.directives ?? []).includes("open-context"),
        q => (q.directives ?? []).includes("close-context"),
        q => !!q.context && q.context.trim().length > 0,
    );

    let buildScopeContext: string | null = null;
    let inBuildScope = false;

    for (let qi = 0; qi < sorted.length; qi++) {
        const q = sorted[qi];
        const meta: Metadata = { id: q.id, order: q.sortOrder ?? 0 };
        const dirs = q.directives ?? [];
        const attIds = q.attachments?.map(a => a.id) ?? [];
        if (attIds.length > 0) meta.atts = attIds.join(",");
        const metaParts = Object.entries(meta).map(([k, v]) => `${k}:${v}`);
        const dirParts = dirs.filter(d => d.length > 0);
        const tagInner = [...metaParts, ...dirParts].join(" ");
        const tag = tagInner ? `[${tagInner}]` : "";
        // Emit context only for valid openers and standalone questions (not scope children).
        const isValidOpener = validOpenerIdx.has(qi);
        const isInherited = inBuildScope && !!q.context && q.context.trim() === buildScopeContext?.trim();
        const hasOwnedContext = !!q.context && q.context.trim().length > 0
            && (isValidOpener || !isInherited);
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
        // Update scope tracking — only enter scope for valid openers.
        if (isValidOpener && q.context?.trim()) {
            buildScopeContext = q.context.trim();
            inBuildScope = true;
        } else if (inBuildScope && dirs.includes("close-context")) {
            inBuildScope = false;
            buildScopeContext = null;
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

// ── Repo file helpers ─────────────────────────────────────────────────────────

/** Build a repo `.md` file body. Identity comes from the path, not frontmatter. */
export function buildRepoMarkdown(questions: KQuestion[]): string {
    return buildMarkdown(questions);
}
