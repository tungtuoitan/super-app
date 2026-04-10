import { useState, useCallback, useRef, useEffect } from "react";
import Editor from "@monaco-editor/react";
import type * as _monaco from "monaco-editor";
import { AlertTriangle } from "lucide-react";

interface KReviewEditorQuestion {
    id: number;
    question: string;
}

interface KReviewEditorProps {
    questions: KReviewEditorQuestion[];
    answers: Record<number, string>;
    onAnswersChange: (answers: Record<number, string>) => void;
}

// ── Markdown <-> AnswerMap conversion ────────────────────────────────────────

function toMarkdown(questions: KReviewEditorQuestion[], answers: Record<number, string>): string {
    return questions
        .map((q, i) => {
            const answer = answers[q.id] ?? "";
            return `# ${i + 1}. ${q.question.replace(/\n/g, " ")}\n${answer}`;
        })
        .join("\n\n");
}

function parseMarkdown(
    md: string,
    questions: KReviewEditorQuestion[],
): { answers: Record<number, string>; headingsChanged: boolean } {
    // Split on lines starting with "# " — first element before first heading is empty
    const sections = md.split(/^(?=# )/m).filter(s => s.trim());
    const answers: Record<number, string> = {};
    let headingsChanged = false;

    sections.forEach((section, i) => {
        if (i >= questions.length) return;
        const firstNewline = section.indexOf("\n");
        const heading = firstNewline === -1 ? section.trim() : section.slice(0, firstNewline).trim();
        const expectedHeading = `# ${i + 1}. ${questions[i].question.replace(/\n/g, " ")}`;
        if (heading !== expectedHeading) headingsChanged = true;
        const answer = firstNewline === -1 ? "" : section.slice(firstNewline + 1);
        answers[questions[i].id] = answer;
    });

    // If fewer sections than questions, mark remaining as empty
    for (let i = sections.length; i < questions.length; i++) {
        answers[questions[i].id] = "";
        headingsChanged = true;
    }

    return { answers, headingsChanged };
}

// ── Component ────────────────────────────────────────────────────────────────

export function KReviewEditor({ questions, answers, onAnswersChange }: KReviewEditorProps) {
    const [headingsChanged, setHeadingsChanged] = useState(false);
    const editorRef = useRef<_monaco.editor.IStandaloneCodeEditor | null>(null);
    const initialMd = useRef(toMarkdown(questions, answers));
    const isInternalChange = useRef(false);

    const handleChange = useCallback(
        (value: string | undefined) => {
            if (value === undefined) return;
            isInternalChange.current = true;
            const result = parseMarkdown(value, questions);
            setHeadingsChanged(result.headingsChanged);
            onAnswersChange(result.answers);
        },
        [questions, onAnswersChange],
    );

    const handleMount = useCallback((editor: _monaco.editor.IStandaloneCodeEditor, monaco: any) => {
        editorRef.current = editor;
        // Register theme if not yet
        try {
            monaco.editor.defineTheme("review-dark", {
                base: "vs-dark",
                inherit: true,
                rules: [],
                colors: {
                    "editor.background": "#09090B",
                    "editor.foreground": "#D4D4D4",
                    "editorLineNumber.foreground": "#858585",
                    "editorCursor.foreground": "#AEAFAD",
                    "editor.selectionBackground": "#264F78",
                },
            });
            monaco.editor.setTheme("review-dark");
        } catch { /* theme may already exist */ }
    }, []);

    // Sync external answer changes (e.g. transcription landing) into editor
    useEffect(() => {
        if (isInternalChange.current) {
            isInternalChange.current = false;
            return;
        }
        const editor = editorRef.current;
        if (!editor || (editor as any)._isDisposed) return;
        const currentMd = editor.getValue();
        const newMd = toMarkdown(questions, answers);
        if (currentMd !== newMd) {
            const pos = editor.getPosition();
            editor.setValue(newMd);
            if (pos) editor.setPosition(pos);
        }
    }, [answers, questions]);

    return (
        <div className="flex flex-col h-full">
            <div className="flex-1 min-h-0">
                <Editor
                    height="100%"
                    defaultLanguage="markdown"
                    defaultValue={initialMd.current}
                    theme="review-dark"
                    onChange={handleChange}
                    onMount={handleMount}
                    options={{
                        minimap: { enabled: false },
                        wordWrap: "on",
                        fontSize: 14,
                        lineNumbers: "off",
                        lineDecorationsWidth: 8,
                        folding: true,
                        glyphMargin: false,
                        scrollBeyondLastLine: false,
                        padding: { top: 12, bottom: 12 },
                        automaticLayout: true,
                        renderLineHighlight: "none",
                        wordBasedSuggestions: "off",
                        quickSuggestions: false,
                        overviewRulerLanes: 0,
                        hideCursorInOverviewRuler: true,
                        scrollbar: { verticalScrollbarSize: 6 },
                    }}
                />
            </div>
            {headingsChanged && (
                <div className="flex items-center gap-2 px-3 py-1.5 bg-yellow-500/10 border-b border-yellow-500/20 text-[11px] text-yellow-500 shrink-0">
                    <AlertTriangle className="w-3 h-3 shrink-0" />
                    Heading was modified — only edit answers below each heading
                </div>
            )}
        </div>
    );
}
