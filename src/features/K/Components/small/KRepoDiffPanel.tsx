import { useState } from "react";
import { GitCompare, ChevronDown, ChevronRight, BookOpen, FolderOpen, MessageSquare } from "lucide-react";
import { cn } from "@/lib/utils";
import { ScrollArea } from "@/shared";
import type { KRepoCompareDiff, KRepoCompareEntry } from "../../types/kRepoSync.type";

// ── helpers ──────────────────────────────────────────────────────────────────

const ENTITY_ICON = {
    knowledge: BookOpen,
    node:      FolderOpen,
    question:  MessageSquare,
} as const;

const ENTITY_LABEL = {
    knowledge: "Knowledge",
    node:      "Node",
    question:  "Question",
} as const;

const CHANGE_STYLE = {
    repo_only: { dot: "bg-green-400",  badge: "bg-green-500/15 text-green-400 border-green-500/30",  label: "repo only"  },
    db_only:   { dot: "bg-amber-400",  badge: "bg-amber-500/15 text-amber-400 border-amber-500/30",  label: "db only"    },
    modified:  { dot: "bg-blue-400",   badge: "bg-blue-500/15  text-blue-400  border-blue-500/30",   label: "modified"   },
} as const;

// ── sub-components ────────────────────────────────────────────────────────────

function DiffEntryRow({ entry }: { entry: KRepoCompareEntry }) {
    const [expanded, setExpanded] = useState(false);
    const Icon   = ENTITY_ICON[entry.entityType];
    const style  = CHANGE_STYLE[entry.changeType];
    const hasDetail = entry.oldText || entry.newText;
    const sub    = entry.entityType === "question"
        ? entry.nodeName
        : entry.entityType === "node"
            ? entry.knowledgeName
            : null;

    return (
        <div className="rounded border border-border/40 bg-muted/10">
            <div
                className={cn("flex items-center gap-2 px-2.5 py-1.5 text-xs", hasDetail && "cursor-pointer hover:bg-muted/20")}
                onClick={() => hasDetail && setExpanded(v => !v)}
            >
                <span className={cn("w-1.5 h-1.5 rounded-full shrink-0", style.dot)} />
                <Icon className="w-3 h-3 text-muted-foreground shrink-0" />
                <span className="font-medium truncate flex-1">{entry.name}</span>
                {sub && <span className="text-muted-foreground truncate max-w-[120px]">{sub}</span>}
                <span className={cn("px-1.5 py-0.5 rounded border text-[10px] shrink-0", style.badge)}>
                    {style.label}
                </span>
                {hasDetail && (
                    expanded
                        ? <ChevronDown className="w-3 h-3 text-muted-foreground shrink-0" />
                        : <ChevronRight className="w-3 h-3 text-muted-foreground shrink-0" />
                )}
            </div>

            {expanded && hasDetail && (
                <div className="border-t border-border/30 px-2.5 py-2 space-y-1.5">
                    {entry.oldText && (
                        <div className="space-y-0.5">
                            <span className="text-[10px] text-red-400 font-medium">DB (before)</span>
                            <pre className="text-[11px] text-muted-foreground whitespace-pre-wrap break-words bg-red-500/5 border border-red-500/20 rounded p-2 max-h-32 overflow-y-auto">
                                {entry.oldText}
                            </pre>
                        </div>
                    )}
                    {entry.newText && (
                        <div className="space-y-0.5">
                            <span className="text-[10px] text-green-400 font-medium">Repo (after)</span>
                            <pre className="text-[11px] text-muted-foreground whitespace-pre-wrap break-words bg-green-500/5 border border-green-500/20 rounded p-2 max-h-32 overflow-y-auto">
                                {entry.newText}
                            </pre>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

function SectionGroup({
    title,
    entries,
    defaultOpen = false,
}: {
    title: string;
    entries: KRepoCompareEntry[];
    defaultOpen?: boolean;
}) {
    const [open, setOpen] = useState(defaultOpen);
    if (entries.length === 0) return null;

    return (
        <div className="space-y-1">
            <button
                onClick={() => setOpen(v => !v)}
                className="flex items-center gap-1.5 w-full text-left text-xs font-medium text-muted-foreground hover:text-foreground transition-colors py-0.5"
            >
                {open ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
                {title}
                <span className="ml-auto px-1.5 py-0.5 rounded-full bg-muted border border-border text-[10px]">
                    {entries.length}
                </span>
            </button>
            {open && (
                <ScrollArea className={entries.length > 6 ? "max-h-60" : undefined}>
                    <div className="space-y-1 pl-1 pr-1">
                        {entries.map((e, i) => <DiffEntryRow key={i} entry={e} />)}
                    </div>
                </ScrollArea>
            )}
        </div>
    );
}

// ── main component ────────────────────────────────────────────────────────────

export function KRepoDiffPanel({ diff }: { diff: KRepoCompareDiff }) {
    if (diff.error) {
        return (
            <div className="text-xs text-destructive px-1">{diff.error}</div>
        );
    }

    const total = diff.repoOnlyCount + diff.dbOnlyCount + diff.modifiedCount;
    if (total === 0) {
        return (
            <div className="flex items-center gap-1.5 text-xs text-green-500 py-1">
                <GitCompare className="w-3.5 h-3.5" />
                Repo and DB are in sync — no differences found.
            </div>
        );
    }

    const repoOnly  = diff.entries.filter(e => e.changeType === "repo_only");
    const dbOnly    = diff.entries.filter(e => e.changeType === "db_only");
    const modified  = diff.entries.filter(e => e.changeType === "modified");

    return (
        <div className="space-y-3">
            {/* Summary chips */}
            <div className="flex items-center gap-2 flex-wrap">
                {diff.repoOnlyCount > 0 && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-[11px] bg-green-500/15 text-green-400 border-green-500/30">
                        <span className="w-1.5 h-1.5 rounded-full bg-green-400 shrink-0" />
                        {diff.repoOnlyCount} only in repo
                    </span>
                )}
                {diff.dbOnlyCount > 0 && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-[11px] bg-amber-500/15 text-amber-400 border-amber-500/30">
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0" />
                        {diff.dbOnlyCount} only in DB
                    </span>
                )}
                {diff.modifiedCount > 0 && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-[11px] bg-blue-500/15 text-blue-400 border-blue-500/30">
                        <span className="w-1.5 h-1.5 rounded-full bg-blue-400 shrink-0" />
                        {diff.modifiedCount} modified
                    </span>
                )}
            </div>

            {/* Groups */}
            <SectionGroup
                title="Only in repo → will be created in DB on Push to DB"
                entries={repoOnly}
                defaultOpen={repoOnly.length <= 5}
            />
            <SectionGroup
                title="Only in DB → will be pushed to repo on Push to R"
                entries={dbOnly}
                defaultOpen={dbOnly.length <= 5}
            />
            <SectionGroup
                title="Modified (content differs)"
                entries={modified}
                defaultOpen={modified.length <= 10}
            />
        </div>
    );
}
