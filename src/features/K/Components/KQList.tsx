import { useCallback, useEffect, useState } from "react";
import { Loader2, ChevronDown, ChevronRight, Code2, Link2, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { KQuizService } from "../service/kQuiz.service";
import { KAttachmentService } from "../service/kAttachment.service";
import type { KQuestion } from "../types/kQuiz.type";
import type { KAttachment } from "../types/kAttachment.type";
import { KAttachmentViewerDialog } from "./small/KAttachmentViewerDialog";

interface Props {
    nodeId: number | null;
}

const LANGUAGE_LABELS: Record<string, string> = {
    python: "py", javascript: "js", typescript: "ts", csharp: "cs",
    go: "go", java: "java", rust: "rs", cpp: "cpp", c: "c",
    sql: "sql", shell: "sh", ruby: "rb", php: "php",
    markdown: "md", json: "json", yaml: "yml", plaintext: "txt",
};

function AttachmentCard({ att, onUnlink, onView }: {
    att: KAttachment;
    onUnlink: () => void;
    onView: (att: KAttachment) => void;
}) {
    const langLabel = att.language ? (LANGUAGE_LABELS[att.language] ?? att.language) : "txt";
    return (
        <div className="flex items-center gap-2 px-2 py-1.5 rounded border border-zinc-700 bg-zinc-800/50 hover:bg-zinc-800 group">
            <Code2 className="w-3.5 h-3.5 text-zinc-500 shrink-0" />
            <button
                type="button"
                onClick={() => onView(att)}
                className="flex-1 text-left text-xs font-mono text-zinc-300 hover:text-zinc-100 truncate transition-colors"
                title="Click to view"
            >
                {att.title}
            </button>
            {att.language && (
                <span className="text-xs px-1 py-0.5 rounded bg-zinc-700 text-zinc-400 font-mono shrink-0">
                    {langLabel}
                </span>
            )}
            <button
                type="button"
                onClick={onUnlink}
                title="Unlink attachment"
                className="text-zinc-600 hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100"
            >
                <X className="w-3.5 h-3.5" />
            </button>
        </div>
    );
}

function LinkPicker({ questionId, linkedIds, onLinked }: {
    questionId: number;
    linkedIds: Set<number>;
    onLinked: (att: KAttachment) => void;
}) {
    const [pool, setPool] = useState<KAttachment[]>([]);
    const [loading, setLoading] = useState(false);
    const [open, setOpen] = useState(false);
    const [linking, setLinking] = useState<number | null>(null);

    const loadPool = useCallback(async () => {
        if (pool.length > 0) return;
        setLoading(true);
        try {
            const res = await KAttachmentService._listAll();
            if (res.success && res.object) setPool(res.object);
        } catch { /* silent */ }
        finally { setLoading(false); }
    }, [pool.length]);

    const handleOpen = () => { setOpen(o => !o); loadPool(); };

    const handleLink = async (att: KAttachment) => {
        if (linking !== null) return;
        setLinking(att.id);
        try {
            await KAttachmentService._linkToQuestion(questionId, att.id);
            onLinked(att);
            setOpen(false);
        } catch { /* silent */ }
        finally { setLinking(null); }
    };

    const available = pool.filter(a => !linkedIds.has(a.id));

    return (
        <div className="relative">
            <button
                onClick={handleOpen}
                className="flex items-center gap-1.5 px-2 py-1 text-xs rounded border border-zinc-700 text-zinc-400 hover:text-zinc-200 hover:border-zinc-500 transition-colors"
            >
                <Link2 className="w-3 h-3" />
                Link attachment
            </button>
            {open && (
                <div className="absolute left-0 top-full mt-1 z-20 w-64 rounded border border-zinc-700 bg-zinc-900 shadow-lg">
                    {loading ? (
                        <div className="p-3 flex justify-center">
                            <Loader2 className="w-4 h-4 animate-spin text-zinc-500" />
                        </div>
                    ) : available.length === 0 ? (
                        <div className="p-3 text-xs text-zinc-500">No attachments available</div>
                    ) : (
                        <ul className="max-h-48 overflow-y-auto py-1">
                            {available.map(att => (
                                <li key={att.id}>
                                    <button
                                        onClick={() => handleLink(att)}
                                        disabled={linking === att.id}
                                        className="w-full flex items-center gap-2 px-3 py-1.5 text-left text-xs text-zinc-300 hover:bg-zinc-800 transition-colors"
                                    >
                                        {linking === att.id
                                            ? <Loader2 className="w-3 h-3 animate-spin" />
                                            : <Code2 className="w-3 h-3 text-zinc-500" />
                                        }
                                        <span className="truncate font-mono">{att.title}</span>
                                        {att.language && (
                                            <span className="ml-auto text-zinc-600">{LANGUAGE_LABELS[att.language] ?? att.language}</span>
                                        )}
                                    </button>
                                </li>
                            ))}
                        </ul>
                    )}
                </div>
            )}
        </div>
    );
}

function QuestionRow({ question, onAttachmentsChanged, onView }: {
    question: KQuestion;
    onAttachmentsChanged: (questionId: number, attachments: KAttachment[]) => void;
    onView: (att: KAttachment) => void;
}) {
    const [expanded, setExpanded] = useState(false);
    const atts = question.attachments ?? [];
    const linkedIds = new Set(atts.map(a => a.id));
    const isDraft = question.statusCode === "draft";
    const isDeleted = !!question.deletedAt;

    const handleUnlink = async (att: KAttachment) => {
        try {
            await KAttachmentService._unlinkFromQuestion(question.id, att.id);
            onAttachmentsChanged(question.id, atts.filter(a => a.id !== att.id));
        } catch { /* silent */ }
    };

    const handleLinked = (att: KAttachment) => {
        onAttachmentsChanged(question.id, [...atts, att]);
    };

    return (
        <div className={cn("border-b border-zinc-800 last:border-b-0", isDeleted && "opacity-40")}>
            <div
                className="flex items-start gap-2 px-4 py-2.5 hover:bg-zinc-800/40 cursor-pointer"
                onClick={() => setExpanded(e => !e)}
            >
                <span className="mt-0.5 text-zinc-600 shrink-0">
                    {expanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
                </span>
                <span className="flex-1 text-sm text-zinc-200 leading-snug">{question.question}</span>
                <div className="flex items-center gap-1.5 shrink-0 ml-2">
                    {atts.length > 0 && (
                        <span className="text-xs px-1.5 py-0.5 rounded bg-blue-900/40 text-blue-400 font-mono border border-blue-800/50">
                            {atts.length} att
                        </span>
                    )}
                    <span className={cn(
                        "text-xs px-1.5 py-0.5 rounded border font-mono",
                        isDraft
                            ? "bg-zinc-800 text-zinc-500 border-zinc-700"
                            : "bg-indigo-900/30 text-indigo-400 border-indigo-800/50"
                    )}>
                        {isDraft ? "draft" : "learning"}
                    </span>
                </div>
            </div>

            {expanded && (
                <div className="px-4 pb-3 space-y-1.5">
                    {atts.map(att => (
                        <AttachmentCard
                            key={att.id}
                            att={att}
                            onUnlink={() => handleUnlink(att)}
                            onView={onView}
                        />
                    ))}
                    {!isDeleted && (
                        <LinkPicker
                            questionId={question.id}
                            linkedIds={linkedIds}
                            onLinked={handleLinked}
                        />
                    )}
                </div>
            )}
        </div>
    );
}

export function KQList({ nodeId }: Props) {
    const [questions, setQuestions] = useState<KQuestion[]>([]);
    const [loading, setLoading] = useState(true);
    const [viewingAtt, setViewingAtt] = useState<KAttachment | null>(null);

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const res = nodeId === null
                ? await KQuizService._getOrphanQuestions()
                : await KQuizService._getNodeQuestions(nodeId);
            if (res.success && res.object) setQuestions(res.object.questions);
        } catch { /* silent */ }
        finally { setLoading(false); }
    }, [nodeId]);

    useEffect(() => { load(); }, [load]);

    const handleAttachmentsChanged = useCallback((questionId: number, attachments: KAttachment[]) => {
        setQuestions(qs => qs.map(q => q.id === questionId ? { ...q, attachments } : q));
    }, []);

    if (loading) {
        return (
            <div className="flex items-center justify-center h-full bg-zinc-950">
                <Loader2 className="w-5 h-5 animate-spin text-zinc-500" />
            </div>
        );
    }

    if (questions.length === 0) {
        return (
            <div className="flex items-center justify-center h-full bg-zinc-950 text-zinc-500 text-sm">
                No questions
            </div>
        );
    }

    return (
        <>
            <div className="flex flex-col h-full bg-zinc-950 overflow-y-auto">
                {questions.map(q => (
                    <QuestionRow
                        key={q.id}
                        question={q}
                        onAttachmentsChanged={handleAttachmentsChanged}
                        onView={setViewingAtt}
                    />
                ))}
            </div>
            <KAttachmentViewerDialog att={viewingAtt} onClose={() => setViewingAtt(null)} />
        </>
    );
}
