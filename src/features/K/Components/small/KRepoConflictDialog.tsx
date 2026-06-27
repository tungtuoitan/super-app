import { useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/shared";
import { GitMerge, Database, GitBranch, Loader2, BookOpen, FolderOpen, MessageSquare, Plus, Minus, Code2 } from "lucide-react";
import { cn } from "@/lib/utils";
import type { KRepoCompareEntry, KRepoResolveConflictItem } from "../../types/kRepoSync.type";
import { computeCharDiff, type CharSegment } from "../../utils/charDiff.util";

const ENTITY_ICON = {
    knowledge:  BookOpen,
    node:       FolderOpen,
    question:   MessageSquare,
    attachment: Code2,
} as const;

/** Render one side of a char-level diff. side="old" hides "add" segments; side="new" hides "remove". */
function CharDiffSide({ segments, side }: { segments: CharSegment[]; side: "old" | "new" }) {
    return (
        <span className="whitespace-pre-wrap break-words text-[11px] leading-snug">
            {segments.map((s, i) => {
                if (s.type === "equal") return <span key={i}>{s.text}</span>;
                if (side === "old" && s.type === "remove")
                    return <span key={i} className="bg-red-500/30 text-red-300 rounded-sm">{s.text}</span>;
                if (side === "new" && s.type === "add")
                    return <span key={i} className="bg-green-500/30 text-green-300 rounded-sm">{s.text}</span>;
                return null;
            })}
        </span>
    );
}

/** Read-only row for entries that don't need user choice (repo_only / db_only). */
function InfoRow({ entry, side }: { entry: KRepoCompareEntry; side: "repo" | "db" }) {
    const Icon  = ENTITY_ICON[entry.entityType];
    const isRepo = side === "repo";
    return (
        <div className="rounded-lg border border-border bg-muted/10 p-2.5 space-y-1.5">
            <div className="flex items-center gap-2 text-xs">
                {isRepo
                    ? <Plus  className="w-3.5 h-3.5 text-green-400 shrink-0" />
                    : <Minus className="w-3.5 h-3.5 text-red-400 shrink-0" />}
                <Icon className="w-3 h-3 text-muted-foreground shrink-0" />
                <span className="font-medium truncate flex-1">{entry.name}</span>
                <span className="text-[10px] text-muted-foreground capitalize shrink-0">{entry.entityType}</span>
            </div>
            {(isRepo ? entry.newText : entry.oldText) && (
                <pre className={cn(
                    "text-[11px] whitespace-pre-wrap break-words max-h-24 overflow-y-auto pl-5 rounded-sm",
                    isRepo ? "text-green-300 bg-green-500/10" : "text-red-300 bg-red-500/10",
                )}>
                    {isRepo ? entry.newText : entry.oldText}
                </pre>
            )}
        </div>
    );
}

/**
 * Strip a leading "[active] " / "[draft] " status tag (added by the BE comparer
 * so the diff text carries draft status) and return it separately so the UI can
 * render it as a coloured badge instead of highlighting it character-by-character.
 */
function splitStatusTag(text: string | null): { status: "active" | "draft" | null; body: string } {
    if (!text) return { status: null, body: "" };
    const m = /^\[(active|draft)\]\s*/.exec(text);
    if (!m) return { status: null, body: text };
    return { status: m[1] as "active" | "draft", body: text.slice(m[0].length) };
}

function StatusBadge({ status }: { status: "active" | "draft" }) {
    return (
        <span className={cn(
            "inline-block px-1.5 py-0 rounded text-[10px] font-medium border mr-1",
            status === "active"
                ? "bg-green-500/15 text-green-400 border-green-500/30"
                : "bg-red-500/15 text-red-400 border-red-500/30",
        )}>
            {status}
        </span>
    );
}

/**
 * Read-only row for modified entries — shows char-level diff side by side.
 * Repo (incoming) on the LEFT; DB (current, higher priority) on the RIGHT —
 * mental model: DB is the "remote of remote", the source of truth.
 */
function ConflictRow({ entry }: { entry: KRepoCompareEntry }) {
    const Icon = ENTITY_ICON[entry.entityType];
    const dbSide   = useMemo(() => splitStatusTag(entry.oldText), [entry.oldText]);
    const repoSide = useMemo(() => splitStatusTag(entry.newText), [entry.newText]);
    const segments = useMemo(
        () => computeCharDiff(dbSide.body, repoSide.body),
        [dbSide.body, repoSide.body],
    );

    return (
        <div className="rounded-lg border border-border bg-muted/10 p-3 space-y-2">
            <div className="flex items-center gap-2 text-sm">
                <Icon className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                <span className="font-medium truncate flex-1">{entry.name}</span>
                <span className="text-[10px] text-muted-foreground shrink-0 capitalize">{entry.entityType}</span>
            </div>

            <div className="grid grid-cols-2 gap-2">
                {/* Repo (incoming) — left */}
                <div className="rounded border border-border/50 p-2 space-y-1">
                    <div className="flex items-center gap-1.5">
                        <GitBranch className="w-3 h-3 text-muted-foreground" />
                        <span className="text-[10px] text-muted-foreground font-medium">Repo (incoming)</span>
                    </div>
                    <div className="max-h-32 overflow-y-auto">
                        {repoSide.status && <StatusBadge status={repoSide.status} />}
                        {repoSide.body
                            ? <CharDiffSide segments={segments} side="new" />
                            : !repoSide.status && <span className="text-[11px] italic text-muted-foreground">(empty)</span>}
                    </div>
                </div>

                {/* DB (current, priority) — right */}
                <div className="rounded border border-border/50 p-2 space-y-1">
                    <div className="flex items-center gap-1.5">
                        <Database className="w-3 h-3 text-muted-foreground" />
                        <span className="text-[10px] text-muted-foreground font-medium">DB (current · priority)</span>
                    </div>
                    <div className="max-h-32 overflow-y-auto">
                        {dbSide.status && <StatusBadge status={dbSide.status} />}
                        {dbSide.body
                            ? <CharDiffSide segments={segments} side="old" />
                            : !dbSide.status && <span className="text-[11px] italic text-muted-foreground">(empty)</span>}
                    </div>
                </div>
            </div>
        </div>
    );
}

function Section({
    title, count, children,
}: {
    title: string;
    count: number;
    children: React.ReactNode;
}) {
    if (count === 0) return null;
    return (
        <div className="space-y-1.5">
            <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                {title}
                <span className="px-1.5 py-0 rounded bg-muted border border-border text-[10px] text-foreground">{count}</span>
            </div>
            <div className="space-y-2 pl-1">{children}</div>
        </div>
    );
}

/**
 * Review-changes dialog — read-only.
 *
 * The DB is the source of truth (it's the "remote of remote"); this popup is for
 * looking at what's coming from the remote repo. Apply All accepts every change:
 * modified entries become keep_repo (DB takes the repo value), repo_only entries
 * are created in DB, db_only entries stay (and the daemon will push them back to remote).
 */
export function KRepoConflictDialog({
    open,
    onOpenChange,
    entries,
    onResolve,
    isResolving,
}: {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    entries: KRepoCompareEntry[];
    onResolve: (items: KRepoResolveConflictItem[]) => Promise<void>;
    isResolving: boolean;
}) {
    const modified = useMemo(() => entries.filter(e => e.changeType === "modified"), [entries]);
    const repoOnly = useMemo(() => entries.filter(e => e.changeType === "repo_only"), [entries]);
    const dbOnly   = useMemo(() => entries.filter(e => e.changeType === "db_only"),   [entries]);

    // Items chỉ chứa các entry "modified" (cùng tồn tại 2 bên, nội dung khác nhau) —
    // đây là những xung đột thực sự cần FE chỉ định bên nào thắng. Cụ thể:
    //   • modified → push thành item với action "keep_repo" → DB sẽ nhận giá trị từ repo.
    //   • repo_only → KHÔNG gửi item (chưa có dbId). BE reconcile sẽ tự tạo entity mới trong DB.
    //   • db_only   → KHÔNG gửi item. Entity giữ nguyên trong DB; daemon sẽ push lên remote.
    //
    // Nên nếu diff chỉ toàn repo_only/db_only thì items = [] (rỗng) — vẫn hợp lệ:
    // BE skip phần override per-entity rồi chạy reconcile bình thường để đồng bộ 2 bên.
    const items = useMemo<KRepoResolveConflictItem[]>(
        () => modified
            .filter(e => e.dbId != null && e.entityType !== "attachment")
            .map(e => ({ entityType: e.entityType as "knowledge" | "node" | "question", dbId: e.dbId!, action: "keep_repo" })),
        [modified],
    );

    const handleApply = async () => {
        onOpenChange(false);
        await onResolve(items);
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-3xl w-full max-h-[88vh] flex flex-col">
                <DialogHeader className="shrink-0">
                    <DialogTitle className="flex items-center gap-2">
                        <GitMerge className="w-4 h-4 text-primary" />
                        Review Changes ({entries.length})
                    </DialogTitle>
                    <DialogDescription>
                        Changes coming from remote. DB is the source of truth (shown on the right).
                        Apply All updates DB with everything from remote.
                    </DialogDescription>
                </DialogHeader>

                <div className="flex-1 min-h-0 overflow-y-auto -mx-1 px-1 mt-2 space-y-3 pb-2">
                    <Section title="Modified — DB will take the repo value" count={modified.length}>
                        {modified.map((e, i) => (
                            <ConflictRow key={`m-${i}`} entry={e} />
                        ))}
                    </Section>

                    <Section title="New in repo — will be added to DB" count={repoOnly.length}>
                        {repoOnly.map((e, i) => <InfoRow key={`r-${i}`} entry={e} side="repo" />)}
                    </Section>

                    <Section title="In DB only — will be soft-deleted from DB" count={dbOnly.length}>
                        {dbOnly.map((e, i) => <InfoRow key={`d-${i}`} entry={e} side="db" />)}
                    </Section>
                </div>

                <div className="flex items-center gap-2 shrink-0 pt-2 border-t border-border">
                    <button
                        onClick={() => onOpenChange(false)}
                        disabled={isResolving}
                        className="ml-auto px-4 py-1.5 rounded-lg border border-border text-sm hover:bg-accent transition-all disabled:opacity-50"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleApply}
                        disabled={isResolving}
                        className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-primary text-primary-foreground text-sm hover:bg-primary/90 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {isResolving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                        Push to DB
                    </button>
                </div>
            </DialogContent>
        </Dialog>
    );
}
