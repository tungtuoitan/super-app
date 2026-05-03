import React, { useEffect, useMemo, useState } from "react";
import { Loader2, CheckCircle2, AlertCircle, FileText, XCircle, TriangleAlert } from "lucide-react";
import { Button } from "@/shared";
import { GenericAutoComplete, type IAutoCompleteOptions } from "@/shared";
import { useKMarkdownImportHelper } from "../../hooks/useKMarkdownImport.helper";
import { useKStore } from "../../store/K.store";
import type { KItemV2 } from "../../types/K-v2.types";
import type { KMdParsed, KMdQuestion } from "../../types/kMarkdownImport.type";

// ── Types ─────────────────────────────────────────────────────────────────────

interface ValidationIssue {
    type: "error" | "warn";
    message: string;
}

// ── Parsers ───────────────────────────────────────────────────────────────────

function parseMarkdown(markdown: string): KMdParsed {
    const result: KMdParsed = { keyword: null, tests: [], orphanQuestions: [] };
    let currentTestIdx = -1;
    let cur: KMdQuestion | null = null;

    const flush = () => {
        if (!cur) return;
        if (currentTestIdx >= 0) result.tests[currentTestIdx].questions.push(cur);
        else result.orphanQuestions.push(cur);
        cur = null;
    };

    for (const raw of markdown.split("\n")) {
        const line = raw.trim();
        if (!line) continue;
        if (line.startsWith("### ")) { flush(); cur = { question: line.slice(4).trim(), answer: "" }; continue; }
        if (line.startsWith("## "))  { flush(); result.tests.push({ name: line.slice(3).trim(), questions: [] }); currentTestIdx = result.tests.length - 1; continue; }
        if (line.startsWith("# "))   { result.keyword = line.slice(2).trim(); continue; }
        if (cur) cur.answer = cur.answer ? cur.answer + "\n" + line : line;
    }
    flush();
    return result;
}

// ── Validation ────────────────────────────────────────────────────────────────

function validate(parsed: KMdParsed, selectedNodeName: string | null): ValidationIssue[] {
    const issues: ValidationIssue[] = [];
    if (!parsed.keyword) {
        issues.push({ type: "error", message: 'Missing # heading. First line must be "# <node name>".' });
        return issues;
    }
    if (selectedNodeName && parsed.keyword !== selectedNodeName)
        issues.push({ type: "error", message: `# "${parsed.keyword}" does not match selected node "${selectedNodeName}".` });
    const totalQuestions = parsed.tests.reduce((n, t) => n + t.questions.length, 0) + parsed.orphanQuestions.length;
    if (totalQuestions === 0)
        issues.push({ type: "error", message: "No questions found. Add questions using ### Question? format." });
    return issues;
}

// ── Component ─────────────────────────────────────────────────────────────────

interface KMarkdownImportPanelProps {
    knowledgeId: number;
    initialParentNode?: KItemV2 | null;
    onSuccess?: () => void;
}

export function KMarkdownImportPanel({ knowledgeId, initialParentNode, onSuccess }: KMarkdownImportPanelProps) {
    const [markdown, setMarkdown] = useState("");
    const [parentNode, setParentNode] = useState<KItemV2 | null>(null);

    const { state, generate, reset } = useKMarkdownImportHelper();
    const { currentK } = useKStore();

    useEffect(() => {
        if (state.insertedCount !== null) onSuccess?.();
    }, [state.insertedCount]);

    useEffect(() => {
        if (initialParentNode !== undefined) {
            setParentNode(initialParentNode);
            setMarkdown("");
            reset();
        }
    }, [initialParentNode]);

    const nodeOptions: IAutoCompleteOptions[] = (() => {
        if (!currentK?.flatData) return [];
        return currentK.flatData
            .filter((n) => n.id > 0)
            .sort((a, b) => a.pathDepth - b.pathDepth || a.name.localeCompare(b.name))
            .map((n) => ({ id: n.id, label: "  ".repeat(n.pathDepth) + n.name, level: n.pathDepth }));
    })();

    const selectedOption = parentNode ? (nodeOptions.find((o) => o.id === parentNode.id) ?? null) : null;

    const handleNodeChange = (_: React.SyntheticEvent, option: IAutoCompleteOptions | null) => {
        const node = option ? (currentK?.flatData.find((n) => n.id === option.id) ?? null) : null;
        setParentNode(node);
    };

    const parsed = useMemo<KMdParsed | null>(
        () => (markdown.trim() ? parseMarkdown(markdown) : null),
        [markdown],
    );

    const issues   = parsed ? validate(parsed, parentNode?.name ?? null) : [];
    const errors   = issues.filter((i) => i.type === "error");
    const warnings = issues.filter((i) => i.type === "warn");

    const canSubmit = !!parentNode && !!markdown.trim() && errors.length === 0 && !state.isLoading;

    const handleImport = () => {
        if (!parentNode || !parsed) return;
        generate(parsed, parentNode.id);
    };

    return (
        <div className="flex flex-col w-full max-w-2xl mx-auto px-6 py-6 gap-5">
            <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-zinc-400" />
                <h2 className="text-sm font-semibold text-zinc-300">Import from Markdown</h2>
            </div>

            <GenericAutoComplete
                size="small" value={selectedOption} allOptions={nodeOptions} onChange={handleNodeChange}
                inputProps={{ name: "import-node", label: "Node (# must match this name)", required: true }}
                style={{ marginBottom: 0 }}
            />

            {/* Markdown input */}
            <div className="flex flex-col gap-1.5">
                <p className="text-xs font-medium text-zinc-400">Questions</p>
                <textarea
                    value={markdown}
                    onChange={(e) => { setMarkdown(e.target.value); if (state.insertedCount !== null || state.error) reset(); }}
                    disabled={state.isLoading}
                    placeholder={"# Node name\n\n## Section (optional)\n### Question?\nAnswer here\n\n### Another question?\nAnswer here"}
                    className="min-h-[180px] w-full resize-none rounded-md border border-zinc-700 bg-zinc-900 px-3 py-2.5 text-sm text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:ring-1 focus:ring-zinc-500 font-mono"
                    spellCheck={false}
                />

                {issues.length > 0 && (
                    <div className="flex flex-col gap-1">
                        {errors.map((issue, idx) => (
                            <div key={idx} className="flex items-start gap-2 rounded-md border border-red-500/30 bg-red-500/10 px-3 py-1.5">
                                <XCircle className="w-3.5 h-3.5 mt-0.5 shrink-0 text-red-400" />
                                <span className="text-xs text-red-300">{issue.message}</span>
                            </div>
                        ))}
                        {warnings.map((issue, idx) => (
                            <div key={idx} className="flex items-start gap-2 rounded-md border border-amber-500/30 bg-amber-500/10 px-3 py-1.5">
                                <TriangleAlert className="w-3.5 h-3.5 mt-0.5 shrink-0 text-amber-400" />
                                <span className="text-xs text-amber-300">{issue.message}</span>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Action row */}
            <div className="flex items-center gap-3">
                <Button onClick={handleImport} disabled={!canSubmit} size="sm" className="gap-1.5">
                    {state.isLoading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                    {state.isLoading ? "Importing…" : "Import"}
                </Button>
                {state.insertedCount !== null && (
                    <span className="flex items-center gap-1.5 text-xs text-emerald-400">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        Done
                    </span>
                )}
                {state.error && (
                    <span className="flex items-center gap-1.5 text-xs text-red-400">
                        <AlertCircle className="w-3.5 h-3.5" />
                        {state.error}
                    </span>
                )}
            </div>

            <p className="text-[11px] text-zinc-600">
                Format: # node name &nbsp;·&nbsp; ## section (optional) &nbsp;·&nbsp; ### question
            </p>
        </div>
    );
}
