import React, { useEffect, useState } from "react";
import { Loader2, CheckCircle2, AlertCircle, FileText, TriangleAlert, XCircle, Copy, CopyCheck } from "lucide-react";
import { Button } from "@/Components/ui/button";
import { GenericAutoComplete, type IAutoCompleteOptions } from "@/shared/components/ui/GenericAutoComplete";
import { useKMarkdownImportHelper } from "../../hooks/useKMarkdownImport.helper";
import { useKStore } from "../../store/K.store";
import type { KItemV2 } from "../../types/K-v2.types";

export const K_MARKDOWN_IMPORT_EVENT = "k-open-markdown-import";

export interface KMarkdownImportEventDetail {
    parentNode: KItemV2 | null;
}

interface KMarkdownImportPanelProps {
    knowledgeId: number;
    initialParentNode?: KItemV2 | null;
}

// ── Validation ───────────────────────────────────────────────────────────────

interface ValidationIssue {
    type: "error" | "warn";
    line: number; // 1-based; 0 = global
    message: string;
}

/** Markdown patterns that are forbidden in heading text and content lines. */
const DECORATION_CHECKS: { re: RegExp; label: string }[] = [
    { re: /\*\*[^*\n]+\*\*/, label: 'bold (**text**)' },
    { re: /__[^_\n]+__/,     label: 'bold (__text__)' },
    { re: /~~[^~\n]+~~/,     label: 'strikethrough (~~text~~)' },
    { re: /`[^`\n]+`/,       label: 'inline code (`text`)' },
    { re: /!\[.*?\]\(.*?\)/, label: 'image (![alt](url))' },
    { re: /\[.+?\]\(.+?\)/,  label: 'link ([text](url))' },
    { re: /(?<![_\w])_[^_\n]+_(?![_\w])/, label: 'italic (_text_)' },
    { re: /(?<!\*)\*(?!\*)[^*\n]+(?<!\*)\*(?!\*)/, label: 'italic (*text*)' },
];

/** Patterns only valid at the start of a line (list / blockquote). */
const LINE_START_CHECKS: { re: RegExp; label: string }[] = [
    { re: /^>\s/,       label: 'blockquote (> text)' },
    { re: /^[-+]\s/,    label: 'list item (- text)' },
    { re: /^\d+\.\s/,   label: 'ordered list (1. text)' },
];

function isHR(line: string): boolean {
    const t = line.trim();
    return t.length >= 3 && (
        t.replace(/-/g, "").length === 0 ||
        t.replace(/\*/g, "").length === 0 ||
        t.replace(/_/g, "").length === 0
    );
}

function validateMarkdown(markdown: string): ValidationIssue[] {
    const issues: ValidationIssue[] = [];
    const lines = markdown.split("\n");

    const hasHeading = lines.some(l => /^#{1,6}\s+\S/.test(l.trim()));
    if (!hasHeading) {
        issues.push({ type: "error", line: 0, message: "No heading found. Start with # for entity nodes and ## for question nodes." });
        return issues;
    }

    let allEntities = true;
    let currentIsQuestion = false;
    let currentQuestionLine = 0;
    let currentQuestionHasContent = false;

    for (let i = 0; i < lines.length; i++) {
        const raw  = lines[i];
        const line = raw.trim();
        const num  = i + 1;

        if (!line) continue;

        if (isHR(line)) {
            issues.push({ type: "error", line: num, message: 'Remove horizontal rule (---) — only headings and plain text are allowed.' });
            continue;
        }

        const headingMatch = line.match(/^(#{1,6})\s+(.+)$/);

        if (headingMatch) {
            // Flush previous question check
            if (currentIsQuestion && !currentQuestionHasContent) {
                issues.push({ type: "warn", line: currentQuestionLine, message: "Question heading has no answer below it." });
            }

            const headingText = headingMatch[2];
            currentIsQuestion      = headingText.trimEnd().endsWith("?");
            currentQuestionLine    = num;
            currentQuestionHasContent = false;

            if (currentIsQuestion) allEntities = false;

            // Check heading text for decoration
            for (const { re, label } of DECORATION_CHECKS) {
                if (re.test(headingText)) {
                    issues.push({ type: "error", line: num, message: `Heading uses ${label} — write plain text only.` });
                    break;
                }
            }
        } else {
            currentQuestionHasContent = true;

            // Check line-start structure
            for (const { re, label } of LINE_START_CHECKS) {
                if (re.test(line)) {
                    issues.push({ type: "error", line: num, message: `Use a plain paragraph, not ${label}.` });
                    // Still check decoration on same line
                    break;
                }
            }

            // Check inline decoration
            for (const { re, label } of DECORATION_CHECKS) {
                if (re.test(line)) {
                    issues.push({ type: "error", line: num, message: `Remove ${label} — write plain text only.` });
                    break;
                }
            }
        }
    }

    // Flush last question
    if (currentIsQuestion && !currentQuestionHasContent) {
        issues.push({ type: "warn", line: currentQuestionLine, message: "Question heading has no answer below it." });
    }

    if (allEntities) {
        issues.push({ type: "warn", line: 0, message: "No question headings found (ending with '?'). All nodes will be entity type." });
    }

    return issues;
}

// ── Rule text (for copy to AI) ───────────────────────────────────────────────

const RULE_TEXT = `Hãy chuyển đổi nội dung sau thành markdown hợp lệ theo đúng các quy tắc sau:

QUY TẮC BẮT BUỘC:
1. Chỉ được dùng heading và đoạn văn thuần (plain paragraph). Không dùng bất kỳ thứ gì khác.
2. Heading dùng # (entity) hoặc ## (question). Heading lồng nhau theo cấp độ thụt đầu dòng.
3. Heading kết thúc bằng "?" → node type question. Heading không có "?" → node type entity.
4. Phần trả lời/mô tả bên dưới heading phải là plain text thuần — không in đậm, không in nghiêng, không inline code, không link, không gạch ngang.
5. Không dùng: **bold**, __bold__, *italic*, _italic_, \`code\`, [link](url), ~~strikethrough~~
6. Không dùng: danh sách (- item, * item, 1. item), blockquote (> text), horizontal rule (---)
7. Question heading phải có ít nhất một đoạn văn trả lời bên dưới.
8. Không dùng số thứ tự.

VÍ DỤ HỢP LỆ:
# Vincent van Gogh

## Van Gogh sinh năm nào và ở đâu?
Van Gogh sinh ngày 30 tháng 3 năm 1853 tại Zundert, Hà Lan.

## Tác phẩm nổi tiếng nhất là gì?
The Starry Night, vẽ năm 1889 khi ông đang điều trị tại bệnh viện Saint-Paul-de-Mausole.`;

// ── Component ────────────────────────────────────────────────────────────────

export function KMarkdownImportPanel({ knowledgeId, initialParentNode }: KMarkdownImportPanelProps) {
    const [markdown, setMarkdown]   = useState("");
    const [parentNode, setParentNode] = useState<KItemV2 | null>(null);
    const { state, generate, reset } = useKMarkdownImportHelper();
    const { currentK } = useKStore();

    useEffect(() => {
        if (initialParentNode !== undefined) {
            setParentNode(initialParentNode);
            setMarkdown("");
            reset();
        }
    }, [initialParentNode]);

    const nodeOptions: IAutoCompleteOptions[] = React.useMemo(() => {
        if (!currentK?.flatData) return [];
        return currentK.flatData
            .filter(n => n.id > 0)
            .sort((a, b) => a.pathDepth - b.pathDepth || a.name.localeCompare(b.name))
            .map(n => ({
                id: n.id,
                label: "\u00a0\u00a0".repeat(n.pathDepth) + n.name,
                desc: n.pathDepth === 0 ? "Root level" : undefined,
                level: n.pathDepth,
            }));
    }, [currentK?.flatData]);

    const selectedOption: IAutoCompleteOptions | null = parentNode
        ? (nodeOptions.find(o => o.id === parentNode.id) ?? null)
        : null;

    const handleParentChange = (_: React.SyntheticEvent, option: IAutoCompleteOptions | null) => {
        setParentNode(option ? (currentK?.flatData.find(n => n.id === option.id) ?? null) : null);
    };

    const handleGenerate = () => {
        generate(markdown, parentNode?.id ?? null);
    };

    const issues = React.useMemo(
        () => (markdown.trim() ? validateMarkdown(markdown) : []),
        [markdown]
    );

    const errors   = issues.filter(i => i.type === "error");
    const warnings = issues.filter(i => i.type === "warn");
    const hasErrors = errors.length > 0;
    const canSubmit = !!markdown.trim() && !hasErrors && !state.isLoading;

    const [copied, setCopied] = useState(false);
    const handleCopyRules = () => {
        navigator.clipboard.writeText(RULE_TEXT).then(() => {
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        });
    };

    return (
        <div className="flex flex-col h-full w-full max-w-2xl mx-auto px-6 py-6 gap-5">
            {/* Header */}
            <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-zinc-400" />
                <h2 className="text-sm font-semibold text-zinc-300">Import from Markdown</h2>
            </div>

            {/* Parent folder selector */}
            <GenericAutoComplete
                size="small"
                value={selectedOption}
                allOptions={nodeOptions}
                onChange={handleParentChange}
                inputProps={{
                    name: "import-parent-node",
                    label: "Parent node",
                    required: false,
                }}
                style={{ marginBottom: 0 }}
            />

            {/* Markdown textarea */}
            <div className="flex-1 flex flex-col gap-1.5">
                <textarea
                    value={markdown}
                    onChange={(e) => {
                        setMarkdown(e.target.value);
                        if (state.insertedCount !== null || state.error) reset();
                    }}
                    disabled={state.isLoading}
                    placeholder={
`# Vincent van Gogh

## Van Gogh sinh năm nào và ở đâu?
Van Gogh sinh ngày 30 tháng 3 năm 1853 tại Zundert, Hà Lan.

## Tác phẩm nổi tiếng nhất là gì?
The Starry Night, vẽ năm 1889.`}
                    className="flex-1 min-h-[280px] w-full resize-none rounded-md border border-zinc-700 bg-zinc-900 px-3 py-2.5 text-sm text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:ring-1 focus:ring-zinc-500 font-mono"
                    spellCheck={false}
                />

                {/* Validation issues */}
                {issues.length > 0 && (
                    <div className="flex flex-col gap-1">
                        {errors.map((issue, idx) => (
                            <div key={idx} className="flex items-start gap-2 rounded-md border border-red-500/30 bg-red-500/10 px-3 py-1.5">
                                <XCircle className="w-3.5 h-3.5 mt-0.5 shrink-0 text-red-400" />
                                <span className="text-xs text-red-300 leading-relaxed">
                                    {issue.line > 0 && <span className="text-red-500 mr-1">Line {issue.line}:</span>}
                                    {issue.message}
                                </span>
                            </div>
                        ))}
                        {warnings.map((issue, idx) => (
                            <div key={idx} className="flex items-start gap-2 rounded-md border border-amber-500/30 bg-amber-500/10 px-3 py-1.5">
                                <TriangleAlert className="w-3.5 h-3.5 mt-0.5 shrink-0 text-amber-400" />
                                <span className="text-xs text-amber-300 leading-relaxed">
                                    {issue.line > 0 && <span className="text-amber-500 mr-1">Line {issue.line}:</span>}
                                    {issue.message}
                                </span>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Action row */}
            <div className="flex items-center gap-3">
                <Button
                    onClick={handleGenerate}
                    disabled={!canSubmit}
                    size="sm"
                    className="gap-1.5"
                >
                    {state.isLoading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                    {state.isLoading ? "Importing…" : "Import"}
                </Button>

                {state.insertedCount !== null && (
                    <span className="flex items-center gap-1.5 text-xs text-emerald-400">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        Inserted {state.insertedCount} nodes as draft
                    </span>
                )}

                {state.error && (
                    <span className="flex items-center gap-1.5 text-xs text-red-400">
                        <AlertCircle className="w-3.5 h-3.5" />
                        {state.error}
                    </span>
                )}
            </div>

            {/* Format rules hint + copy button */}
            <div className="flex items-center justify-between gap-3">
                <p className="text-[11px] text-zinc-600 leading-relaxed">
                    # entity &nbsp;·&nbsp; ## question? &nbsp;·&nbsp; plain paragraph only &nbsp;·&nbsp; nodes created as <span className="text-amber-500">draft</span>
                </p>
                <button
                    onClick={handleCopyRules}
                    className="flex items-center gap-1.5 shrink-0 text-[11px] text-zinc-500 hover:text-zinc-300 transition-colors"
                    title="Copy rules to paste into an AI chat"
                >
                    {copied
                        ? <><CopyCheck className="w-3 h-3 text-emerald-400" /><span className="text-emerald-400">Copied</span></>
                        : <><Copy className="w-3 h-3" />Copy rules</>
                    }
                </button>
            </div>
        </div>
    );
}
