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
        <div className="flex items-center gap-2 px-2 h-8 rounded-lg border border-sa-border bg-sa-surface hover:bg-sa-hover group transition-colors duration-100">
            <Code2 className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
            <button
                type="button"
                onClick={() => onView(att)}
                className="flex-1 text-left text-xs font-mono text-foreground/90 hover:text-foreground truncate transition-colors duration-100"
                title="Click to view"
            >
                {att.title}
            </button>
            {att.language && (
                <span className="text-[11px] px-1.5 rounded-md border border-sa-border-strong text-muted-foreground font-mono shrink-0">
                    {langLabel}
                </span>
            )}
            <button
                type="button"
                onClick={onUnlink}
                title="Unlink attachment"
                className="text-muted-foreground hover:text-sa-danger transition-colors duration-100 opacity-0 group-hover:opacity-100"
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
                className="flex items-center gap-1.5 px-2 h-7 text-xs rounded-md border border-sa-border-strong text-muted-foreground hover:bg-sa-hover hover:text-foreground transition-colors duration-100"
            >
                <Link2 className="w-3 h-3" />
                Link attachment
            </button>
            {open && (
                <div className="absolute left-0 top-full mt-1 z-20 w-64 rounded-lg border border-sa-border-strong bg-popover sa-shadow-pop p-1">
                    {loading ? (
                        <div className="p-3 flex justify-center">
                            <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                        </div>
                    ) : available.length === 0 ? (
                        <div className="p-3 text-xs text-muted-foreground">No attachments available</div>
                    ) : (
                        <ul className="max-h-48 overflow-y-auto">
                            {available.map(att => (
                                <li key={att.id}>
                                    <button
                                        onClick={() => handleLink(att)}
                                        disabled={linking === att.id}
                                        className="w-full flex items-center gap-2 px-2 h-7 rounded-md text-left text-xs text-foreground hover:bg-sa-hover-strong transition-colors duration-100"
                                    >
                                        {linking === att.id
                                            ? <Loader2 className="w-3 h-3 animate-spin" />
                                            : <Code2 className="w-3 h-3 text-muted-foreground" />
                                        }
                                        <span className="truncate font-mono">{att.title}</span>
                                        {att.language && (
                                            <span className="ml-auto text-muted-foreground">{LANGUAGE_LABELS[att.language] ?? att.language}</span>
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
    onView: (att: KAttachment, atts: KAttachment[]) => void;
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
        <div className={cn("border-b border-sa-border last:border-b-0", isDeleted && "opacity-40")}>
            <div
                className="flex items-start gap-2 px-4 py-2 min-h-9 hover:bg-sa-hover cursor-pointer transition-colors duration-100"
                onClick={() => setExpanded(e => !e)}
            >
                <span className="mt-0.5 text-muted-foreground shrink-0">
                    {expanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
                </span>
                <span className="flex-1 text-[13px] text-foreground leading-snug">{question.question}</span>
                <div className="flex items-center gap-1.5 shrink-0 ml-2">
                    {atts.length > 0 && (
                        <span className="text-[11px] px-1.5 rounded-md border border-sa-border-strong text-muted-foreground font-mono">
                            {atts.length} att
                        </span>
                    )}
                    <span className="inline-flex items-center gap-1.5 text-[11px] text-muted-foreground">
                        <span className={cn("w-1.5 h-1.5 rounded-full", isDraft ? "border border-muted-foreground" : "bg-sa-good")} />
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
                            onView={a => onView(a, atts)}
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
    const [viewingAtts, setViewingAtts] = useState<KAttachment[]>([]);

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
            <div className="flex items-center justify-center h-full bg-background">
                <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
            </div>
        );
    }

    if (questions.length === 0) {
        return (
            <div className="flex items-center justify-center h-full bg-background text-muted-foreground text-[13px]">
                No questions
            </div>
        );
    }

    return (
        <>
            <div className="flex flex-col h-full bg-background overflow-y-auto">
                {questions.map(q => (
                    <QuestionRow
                        key={q.id}
                        question={q}
                        onAttachmentsChanged={handleAttachmentsChanged}
                        onView={(a, as) => { setViewingAtt(a); setViewingAtts(as); }}
                    />
                ))}
            </div>
            <KAttachmentViewerDialog atts={viewingAtts} att={viewingAtt} onClose={() => setViewingAtt(null)} />
        </>
    );
}
