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
