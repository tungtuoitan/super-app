import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Loader2, AlertTriangle, CheckCircle2 } from "lucide-react";
import Editor, { type OnMount } from "@monaco-editor/react";
import { useEditorTabBarHelper } from "@/shell";
import { KQuizService } from "../service/kQuiz.service";
import { richTextEditorConstants, useConsoleHelper } from "@/shared";
import type { KQuestion } from "../types/kQuiz.type";
import { dispatchKFlowQuestionsChanged } from "../utils/kEvents.utils";
import { kMarkdownActions } from "../utils/kMarkdownActions";
import { buildMarkdown, parseMarkdown, validateMarkdown } from "../utils/kMarkdownEditor.utils";

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
    const draftDecorationsRef = useRef<string[]>([]);
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

            const md = buildMarkdown(qs);
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

        const errors = validateMarkdown(currentMd);
        if (errors.length > 0) {
            errors.forEach(e => _console.error(`[KMarkdown] line ${e.line}: ${e.message}`));
            return;
        }

        setSaving(true);
        try {
            const parsedQuestions = parseMarkdown(currentMd);
            const activeQs = questions.filter(q => !q.deletedAt);
            const parsedIdSet = new Set(
                parsedQuestions.map(p => p.id).filter((id): id is number => id !== null)
            );

            // Questions removed from markdown → delete
            const toDelete = activeQs.filter(q => !parsedIdSet.has(q.id));
            if (toDelete.length > 0) {
                _console.warning(`[KMarkdown] deleted: ${toDelete.map(q => `[${q.id}] ${q.question}`).join(", ")}`);
            }

            const addQuestions: Array<{ name: string; description: string | null; sortOrder: number }> = [];
            const updateQuestions: Array<{ id: number; name: string; description: string | null; sortOrder: number }> = [];
            const toggleDraftQuestionIds: number[] = [];

            parsedQuestions.forEach((p, idx) => {
                const sortOrder = idx + 1;

                if (p.id === null) {
                    // New questions can only be active (draft requires saving first to get an id)
                    if (!p.isDraft) {
                        addQuestions.push({ name: p.question, description: p.answer || null, sortOrder });
                    }
                    return;
                }

                const orig = activeQs.find(q => q.id === p.id);
                if (!orig) return;

                // Toggle draft if status changed
                const origIsDraft = orig.statusCode === "draft";
                if (origIsDraft !== p.isDraft) {
                    toggleDraftQuestionIds.push(p.id);
                }

                // Update content / sortOrder
                const descToSend = p.answer || null;
                const nameChanged = orig.question !== p.question;
                const descChanged = (orig.answer ?? "") !== p.answer;
                const orderChanged = orig.sortOrder !== sortOrder;

                if (nameChanged || descChanged || orderChanged) {
                    updateQuestions.push({ id: p.id, name: p.question, description: descToSend, sortOrder });
                }
            });

            const deleteQuestionIds = toDelete.map(q => q.id);
            const request = { addQuestions, updateQuestions, deleteQuestionIds, restoreQuestionIds: [], toggleDraftQuestionIds };

            if (nodeId === null) {
                await KQuizService._updateOrphanQuestions(request);
            } else {
                await KQuizService._updateQuestions(nodeId, request);
            }

            dispatchKFlowQuestionsChanged({ nodeId });
            await load();
        } catch (err) {
            console.error("[KMarkdown] save failed", err);
        } finally {
            setSaving(false);
        }
    }, [saving, markdown, questions, nodeId, load]);

    // ── Validation ────────────────────────────────────────────────────────────

    const validationErrors = useMemo(() => validateMarkdown(markdown), [markdown]);

    const handleValidationClick = useCallback(() => {
        if (validationErrors.length === 0) {
            _console.info("[KMarkdown] format OK — no errors");
            return;
        }
        validationErrors.forEach(e => _console.error(`[KMarkdown] line ${e.line}: ${e.message}`));
    }, [validationErrors, _console]);

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

    // ── Register with shell EditorToolbar ─────────────────────────────────────

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

    // ── Decorations ───────────────────────────────────────────────────────────

    const applyDecorations = useCallback((editor: Parameters<OnMount>[0]) => {
        const model = editor.getModel();
        if (!model) return;

        // Dim [id:X] metadata tags
        const idMatches = model.findMatches("\\[id:\\d+\\]", false, true, false, null, false);
        idDecorationsRef.current = editor.deltaDecorations(
            idDecorationsRef.current,
            idMatches.map(m => ({ range: m.range, options: { inlineClassName: "k-md-id-badge" } })),
        );

        // Style draft lines: opening <!--# and closing -->
        const draftMatches = model.findMatches("^<!--#|^.*-->\\s*$", false, true, false, null, false);
        draftDecorationsRef.current = editor.deltaDecorations(
            draftDecorationsRef.current,
            draftMatches.map(m => ({ range: m.range, options: { inlineClassName: "k-md-draft-line" } })),
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
            style.textContent = [
                `.k-md-id-badge { color: #3f3f46 !important; font-size: 0.78em; }`,
                `.k-md-draft-line { color: #52525b !important; font-style: italic; }`,
            ].join("\n");
            document.head.appendChild(style);
        }

        applyDecorations(editor);
    }, [applyDecorations]);

    // ── Computed diffs (console logging only) ─────────────────────────────────

    const parsed = useMemo(() => parseMarkdown(markdown), [markdown]);
    const activeQuestions = useMemo(() => questions.filter(q => !q.deletedAt), [questions]);
    const parsedIds = useMemo(
        () => new Set(parsed.map(p => p.id).filter((id): id is number => id !== null)),
        [parsed],
    );
    const lastLogRef = useRef({ deletedKey: "", invalidKey: "" });

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
        <div className="relative flex flex-col h-full bg-[#09090B]">
            {/* Validation indicator */}
            <button
                onClick={handleValidationClick}
                className="absolute bottom-4 right-4 z-10 flex items-center gap-1.5 px-2 py-1 rounded border transition-colors"
                style={validationErrors.length > 0
                    ? { borderColor: "#7f1d1d", backgroundColor: "#450a0a", color: "#f87171" }
                    : { borderColor: "#14532d", backgroundColor: "#052e16", color: "#4ade80" }
                }
                title={validationErrors.length > 0
                    ? `${validationErrors.length} format error(s) — click to log`
                    : "Format OK"
                }
            >
                {validationErrors.length > 0
                    ? <><AlertTriangle className="w-3.5 h-3.5" /><span className="text-xs font-mono">{validationErrors.length}</span></>
                    : <CheckCircle2 className="w-3.5 h-3.5" />
                }
            </button>
            <Editor
                height="100%"
                defaultLanguage="markdown"
                theme={richTextEditorConstants.markdown.theme.name}
                value={markdown}
                onChange={v => {
                    setMarkdown(v ?? "");
                    if (editorRef.current) applyDecorations(editorRef.current);
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
