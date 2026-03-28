import React, { useEffect, useState } from "react";
import { Loader2, CheckCircle2, AlertCircle, FileText, TriangleAlert } from "lucide-react";
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

export function KMarkdownImportPanel({ knowledgeId, initialParentNode }: KMarkdownImportPanelProps) {
    const [markdown, setMarkdown] = useState("");
    const [parentNode, setParentNode] = useState<KItemV2 | null>(null);
    const { state, generate, reset } = useKMarkdownImportHelper();
    const { currentK } = useKStore();

    // Sync when parent passes a new initialParentNode (from right-click menu)
    useEffect(() => {
        if (initialParentNode !== undefined) {
            setParentNode(initialParentNode);
            setMarkdown("");
            reset();
        }
    }, [initialParentNode]);

    // Build autocomplete options from all nodes in the current knowledge
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
        if (!option) {
            setParentNode(null);
            return;
        }
        const found = currentK?.flatData.find(n => n.id === option.id) ?? null;
        setParentNode(found);
    };

    const handleGenerate = () => {
        generate(markdown, parentNode?.id ?? null);
    };

    // Validate markdown format: must have at least one heading
    const formatWarning = React.useMemo((): string | null => {
        if (!markdown.trim()) return null;
        const lines = markdown.split("\n");
        const hasHeading = lines.some(l => /^#{1,6}\s+\S/.test(l.trim()));
        if (!hasHeading)
            return "No heading found (#, ##, ###…). Each node must be named with a heading — AI won't be able to parse the structure.";
        const headingLines = lines.filter(l => /^#{1,6}\s+\S/.test(l.trim()));
        const allEntity = headingLines.every(l => !l.trim().endsWith("?"));
        if (allEntity)
            return "No questions found (headings ending with '?'). All nodes will be created as entity type.";
        return null;
    }, [markdown]);

    const isFormatBlocking = !!markdown.trim() && !markdown.split("\n").some(l => /^#{1,6}\s+\S/.test(l.trim()));

    return (
        <div className="flex flex-col h-full w-full max-w-2xl mx-auto px-6 py-6 gap-5">
            {/* Header */}
            <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-zinc-400" />
                <h2 className="text-sm font-semibold text-zinc-300">Import from Markdown</h2>
            </div>

            {/* Parent folder selector */}
            <div className="space-y-1">
                {/* <label className="text-xs text-zinc-500">Parent node <span className="text-zinc-600">(optional — defaults to root)</span></label> */}
                <GenericAutoComplete
                    size="small"
                    value={selectedOption}
                    allOptions={nodeOptions}
                    onChange={handleParentChange}
                    inputProps={{
                        name: "import-parent-node",
                        label: "Parent node",
                        required: false,
                        // placeholder: "Knowledge root",
                    }}
                    style={{ marginBottom: 0 }}
                />
            </div>

            {/* Markdown textarea */}
            <div className="flex-1 flex flex-col gap-1.5">
                <label className="text-xs text-zinc-500">
                    Markdown content <span className="text-zinc-600">(headings → hierarchy, "?" → question, else → entity)</span>
                </label>
                <textarea
                    value={markdown}
                    onChange={(e) => {
                        setMarkdown(e.target.value);
                        if (state.insertedCount !== null || state.error) reset();
                    }}
                    disabled={state.isLoading}
                    placeholder={`# Chapter 1\nWhat is photosynthesis?\n## Chlorophyll\nThe green pigment...\n### How does light affect it?`}
                    className="flex-1 min-h-[280px] w-full resize-none rounded-md border border-zinc-700 bg-zinc-900 px-3 py-2.5 text-sm text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:ring-1 focus:ring-zinc-500 font-mono"
                    spellCheck={false}
                />
                {/* Format warning */}
                {formatWarning && (
                    <div className="flex items-start gap-2 rounded-md border border-amber-500/30 bg-amber-500/10 px-3 py-2">
                        <TriangleAlert className="w-3.5 h-3.5 mt-0.5 shrink-0 text-amber-400" />
                        <span className="text-xs text-amber-300 leading-relaxed">{formatWarning}</span>
                    </div>
                )}
            </div>

            {/* Action row */}
            <div className="flex items-center gap-3">
                <Button
                    onClick={handleGenerate}
                    disabled={state.isLoading || !markdown.trim() || isFormatBlocking}
                    size="sm"
                    className="gap-1.5"
                >
                    {state.isLoading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                    {state.isLoading ? "Generating…" : "Generate & Insert"}
                </Button>

                {/* Success */}
                {state.insertedCount !== null && (
                    <span className="flex items-center gap-1.5 text-xs text-emerald-400">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        Inserted {state.insertedCount} nodes as draft
                    </span>
                )}

                {/* Error */}
                {state.error && (
                    <span className="flex items-center gap-1.5 text-xs text-red-400">
                        <AlertCircle className="w-3.5 h-3.5" />
                        {state.error}
                    </span>
                )}
            </div>

            {/* Hint */}
            <p className="text-[11px] text-zinc-600 leading-relaxed">
                AI will parse the markdown and build a matching node tree. All nodes are created as <span className="text-amber-500 font-medium">draft</span> — you can edit them afterwards.
            </p>
        </div>
    );
}
