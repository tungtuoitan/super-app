import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Loader2 } from "lucide-react";
import Editor, { type OnMount } from "@monaco-editor/react";
import { useEditorTabBarHelper } from "@/shell";
import { KQuizService } from "../service/kQuiz.service";
import { flowService, richTextEditorConstants, useConsoleHelper } from "@/shared";
import type { FlowEdgeDTO, FlowNodePositionDTO } from "@/shared";
import type { KQuestion } from "../types/kQuiz.type";
import { dispatchKFlowQuestionsChanged } from "../utils/kEvents.utils";
import { kMarkdownActions } from "../utils/kMarkdownActions";
import { buildMarkdown, parseMarkdown, parseMarkdownGroups, reorganizeGroups } from "../utils/kMarkdownEditor.utils";

// ── Types ──────────────────────────────────────────────────────────────────────

interface Props {
    nodeId: number | null;
}

// ── Editor options ─────────────────────────────────────────────────────────────

const EDITOR_OPTIONS = {
    language: "markdown",
    minimap: { enabled: false },
    wordWrap: "on" as const,
    fontSize: 14,
    fontFamily: richTextEditorConstants.markdown.editor.fontFamily,
    lineNumbers: "on" as const,
    lineNumbersMinChars: 3,
    lineDecorationsWidth: 8,
    folding: true,
    foldingStrategy: "auto" as const,
    showFoldingControls: "always" as const,
    glyphMargin: true,
    scrollBeyondLastLine: false,
    padding: { top: 12, bottom: 40 },
    automaticLayout: true,
    renderLineHighlight: "none" as const,
    quickSuggestions: false,
    wordBasedSuggestions: "off" as const,
};

// ── Component ──────────────────────────────────────────────────────────────────

export function KMarkdownEditorTab({ nodeId }: Props) {
    const { getActiveTab, patchTab } = useEditorTabBarHelper();
    const _console = useConsoleHelper();
    const tab = getActiveTab();
    const tabId = tab?.id;

    const [questions, setQuestions] = useState<KQuestion[]>([]);
    const [markdown, setMarkdown] = useState("");
    const [originalMarkdown, setOriginalMarkdown] = useState("");
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    const editorRef = useRef<Parameters<OnMount>[0] | null>(null);
    const handleSaveRef = useRef<() => Promise<void>>(async () => {});
    const handleCancelRef = useRef<() => void>(() => {});
    const idDecorationsRef = useRef<string[]>([]);
    // Track previous hasUnsavedChanges to detect external cancel
    const isDirtyRef = useRef(false);

    // ── Data loading ──────────────────────────────────────────────────────────

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const qRes = nodeId === null
                ? await KQuizService._getOrphanQuestions()
                : await KQuizService._getNodeQuestions(nodeId);

            const qs: KQuestion[] = qRes.success && qRes.object ? qRes.object.questions : [];
            setQuestions(qs);

            const activeIds = qs.filter(q => !q.deletedAt).map(q => q.id);
            const [posRes, edgeRes] = await Promise.all([
                activeIds.length > 0
                    ? flowService._getPositions("", { nodeType: "kQuestion", nodeIds: activeIds.join(",") })
                    : Promise.resolve({ data: [] as FlowNodePositionDTO[] }),
                flowService._getEdges(""),
            ]);

            const positions: Record<number, { x: number; y: number }> = {};
            for (const p of ((posRes.data as FlowNodePositionDTO[]) ?? [])) {
                positions[p.nodeId] = { x: p.x, y: p.y };
            }

            const qIdSet = new Set(activeIds.map(String));
            const edges = ((edgeRes.data as FlowEdgeDTO[]) ?? [])
                .filter(e =>
                    e.sourceType === "kQuestion" &&
                    e.targetType === "kQuestion" &&
                    qIdSet.has(String(e.sourceId)) &&
                    qIdSet.has(String(e.targetId))
                )
                .map(e => ({ sourceId: Number(e.sourceId), targetId: Number(e.targetId) }));

            const md = buildMarkdown(qs, positions, edges);
            setMarkdown(md);
            setOriginalMarkdown(md);
        } catch (err) {
            console.error("[KMarkdownEditorTab] load failed", err);
        } finally {
            setLoading(false);
        }
    }, [nodeId]);

    useEffect(() => { load(); }, [load]);

    // ── Save ──────────────────────────────────────────────────────────────────

    const handleSave = useCallback(async () => {
        if (saving) return;
        const currentMd = editorRef.current?.getValue() ?? markdown;
        setSaving(true);
        try {
            const parsedQuestions = parseMarkdown(currentMd);
            const activeQs = questions.filter(q => !q.deletedAt);
            const parsedIdSet = new Set(
                parsedQuestions.map(p => p.id).filter((id): id is number => id !== null)
            );

            const toDelete = activeQs.filter(q => !parsedIdSet.has(q.id));
            if (toDelete.length > 0) {
                _console.warning(`[KMarkdown] deleted: ${toDelete.map(q => `[${q.id}] ${q.question}`).join(", ")}`);
            }

            const addQuestions = parsedQuestions
                .filter(p => p.id === null)
                .map(p => ({ name: p.question, description: p.answer || null }));

            const updateQuestions = parsedQuestions
                .filter(p => p.id !== null)
                .flatMap(p => {
                    const orig = activeQs.find(q => q.id === p.id);
                    if (!orig) return [];
                    if (orig.question === p.question && (orig.answer ?? "") === p.answer) return [];
                    return [{ id: p.id!, name: p.question, description: p.answer || null }];
                });

            const deleteQuestionIds = toDelete.map(q => q.id);

            const request = { addQuestions, updateQuestions, deleteQuestionIds, restoreQuestionIds: [] };

            if (nodeId === null) {
                await KQuizService._updateOrphanQuestions(request);
            } else {
                await KQuizService._updateQuestions(nodeId, request);
            }

            try {
                await reorganizeGroups(activeQs, parseMarkdownGroups(currentMd), async () => {
                    const res = nodeId === null
                        ? await KQuizService._getOrphanQuestions()
                        : await KQuizService._getNodeQuestions(nodeId);
                    return (res.success && res.object ? res.object.questions : [])
                        .filter((q: KQuestion) => !q.deletedAt);
                });
            } catch (e) {
                console.error("[KMarkdown] reorganize failed", e);
            }

            dispatchKFlowQuestionsChanged({ nodeId });
            await load(); // resets markdown = originalMarkdown → isDirty = false
        } catch (err) {
            console.error("[KMarkdown] save failed", err);
        } finally {
            setSaving(false);
        }
    }, [saving, markdown, questions, nodeId, load]);

    // ── Cancel (discard) ──────────────────────────────────────────────────────

    const handleCancel = useCallback(() => {
        const orig = originalMarkdown;
        setMarkdown(orig);
        editorRef.current?.setValue(orig);
    }, [originalMarkdown]);

    // Keep refs fresh
    useEffect(() => { handleSaveRef.current = handleSave; }, [handleSave]);
    useEffect(() => { handleCancelRef.current = handleCancel; }, [handleCancel]);
    useEffect(() => { isDirtyRef.current = markdown !== originalMarkdown; }, [markdown, originalMarkdown]);

    // ── Register with shell EditorToolbar (mount/unmount) ─────────────────────

    useEffect(() => {
        kMarkdownActions.register(
            () => handleSaveRef.current(),
            () => handleCancelRef.current(),
        );
        return () => kMarkdownActions.unregister();
    }, []);

    // ── Drive shell hasUnsavedChanges ─────────────────────────────────────────

    const isDirty = markdown !== originalMarkdown;

    useEffect(() => {
        if (!tabId) return;
        patchTab(tabId, { hasUnsavedChanges: isDirty });
    }, [isDirty, tabId]);


    // ── ID comment decorations ────────────────────────────────────────────────

    const applyIdDecorations = useCallback((editor: Parameters<OnMount>[0]) => {
        const model = editor.getModel();
        if (!model) return;
        const matches = model.findMatches("<!--\\s*id:\\d+\\s*-->", false, true, false, null, false);
        idDecorationsRef.current = editor.deltaDecorations(
            idDecorationsRef.current,
            matches.map(m => ({ range: m.range, options: { inlineClassName: "k-md-id-badge" } })),
        );
    }, []);

    // ── Monaco mount ──────────────────────────────────────────────────────────

    const handleEditorMount = useCallback<OnMount>((editor, monaco) => {
        editorRef.current = editor;
        monaco.editor.defineTheme(
            richTextEditorConstants.markdown.theme.name,
            richTextEditorConstants.markdown.theme.config as Parameters<typeof monaco.editor.defineTheme>[1],
        );
        monaco.editor.setTheme(richTextEditorConstants.markdown.theme.name);
        editor.addCommand(
            monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS,
            () => handleSaveRef.current(),
        );
        if (!document.getElementById("k-md-id-badge-style")) {
            const style = document.createElement("style");
            style.id = "k-md-id-badge-style";
            style.textContent = `.k-md-id-badge { color: #3f3f46 !important; font-size: 0.78em; }`;
            document.head.appendChild(style);
        }
        applyIdDecorations(editor);
    }, [applyIdDecorations]);

    // ── Computed diffs (for console logging only) ─────────────────────────────

    const parsed = useMemo(() => parseMarkdown(markdown), [markdown]);
    const activeQuestions = useMemo(() => questions.filter(q => !q.deletedAt), [questions]);
    const parsedIds = useMemo(
        () => new Set(parsed.map(p => p.id).filter((id): id is number => id !== null)),
        [parsed],
    );
    const lastLogRef = useRef({ deletedKey: "", invalidKey: "" });

    // Log syntax errors and pending deletions live as user edits
    useEffect(() => {
        if (markdown === originalMarkdown) return;

        const deleted = activeQuestions.filter(q => !parsedIds.has(q.id));
        const invalid = parsed.filter(
            p => p.id !== null && !activeQuestions.find(q => q.id === p.id),
        );

        const deletedKey = deleted.map(q => q.id).join(",");
        const invalidKey = invalid.map(p => p.id).join(",");

        if (deletedKey !== lastLogRef.current.deletedKey) {
            lastLogRef.current.deletedKey = deletedKey;
            if (deleted.length > 0)
                _console.warning(`[KMarkdown] pending deletion: ${deleted.map(q => `[${q.id}] ${q.question}`).join(", ")}`);
        }

        if (invalidKey !== lastLogRef.current.invalidKey) {
            lastLogRef.current.invalidKey = invalidKey;
            if (invalid.length > 0)
                _console.error(`[KMarkdown] unknown IDs: ${invalid.map(p => `id:${p.id} "${p.question}"`).join(", ")}`);
        }
    }, [parsed, parsedIds, activeQuestions, markdown, originalMarkdown]);

    // ── Render ────────────────────────────────────────────────────────────────

    if (loading) {
        return (
            <div className="flex items-center justify-center h-full bg-[#09090B]">
                <Loader2 className="w-5 h-5 animate-spin text-zinc-500" />
            </div>
        );
    }

    return (
        <div className="flex flex-col h-full bg-[#09090B]">
            <Editor
                height="100%"
                defaultLanguage="markdown"
                theme={richTextEditorConstants.markdown.theme.name}
                value={markdown}
                onChange={v => {
                    setMarkdown(v ?? "");
                    if (editorRef.current) applyIdDecorations(editorRef.current);
                }}
                onMount={handleEditorMount}
                options={EDITOR_OPTIONS}
                loading={
                    <div className="flex items-center justify-center h-full bg-[#09090B]">
                        <Loader2 className="w-5 h-5 animate-spin text-zinc-500" />
                    </div>
                }
            />
        </div>
    );
}
