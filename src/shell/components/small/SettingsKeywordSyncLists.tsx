import { ScrollArea } from "@/shared";
import type { KeywordSyncReport } from "@/shared";

interface SettingsKeywordSyncListsProps {
    syncReport: KeywordSyncReport;
}

export function SettingsKeywordSyncLists({ syncReport }: SettingsKeywordSyncListsProps) {
    return (
        <div className="grid grid-cols-2 gap-4 pt-4 border-t border-border">
            {/* Updated list */}
            {syncReport.updates.length > 0 && (
                <div className="flex flex-col gap-2 min-w-0">
                    <p className="text-xs text-muted-foreground font-medium">
                        Updated ({syncReport.updates.length})
                    </p>
                    <ScrollArea className="h-72 rounded-md border">
                        <div className="p-2 space-y-1">
                            {syncReport.updates.map((u) => (
                                <div key={u.id} className="rounded-md bg-muted/50 p-2 space-y-1">
                                    <div className="flex items-center gap-1.5">
                                        <span className="px-1.5 py-0.5 rounded bg-primary/15 text-primary text-[10px] font-medium shrink-0">
                                            {u.type}
                                        </span>
                                        {u.nameChanged && (
                                            <span className="text-[10px] text-sa-amber-ink font-medium">name</span>
                                        )}
                                        {u.linkChanged && (
                                            <span className="text-[10px] text-muted-foreground font-medium">link</span>
                                        )}
                                    </div>
                                    {u.nameChanged && (
                                        <div className="text-xs text-muted-foreground">
                                            <span className="line-through opacity-60">{u.oldName}</span>
                                            <span className="mx-1">→</span>
                                            <span className="text-foreground font-medium">{u.newName}</span>
                                        </div>
                                    )}
                                    {u.linkChanged && (
                                        <div className="text-[10px] font-mono text-muted-foreground break-all">
                                            <span className="line-through opacity-60">{u.oldLink}</span>
                                            <span className="mx-1">→</span>
                                            <span className="text-foreground">{u.newLink}</span>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    </ScrollArea>
                </div>
            )}

            {/* Created list */}
            {syncReport.created.length > 0 && (
                <div className="flex flex-col gap-2 min-w-0">
                    <p className="text-xs text-muted-foreground font-medium">
                        Created ({syncReport.created.length})
                    </p>
                    <ScrollArea className="h-72 rounded-md border">
                        <div className="p-2 space-y-1">
                            {syncReport.created.map((c, i) => (
                                <div key={`${c.type}-${i}`} className="rounded-lg bg-sa-surface border border-sa-border p-2 space-y-1">
                                    <div className="flex items-center gap-1.5 min-w-0">
                                        <span className="px-1.5 py-0.5 rounded-md border border-sa-border-strong text-muted-foreground text-[10px] font-medium shrink-0">
                                            {c.type}
                                        </span>
                                        <span className="text-xs font-medium truncate">{c.newName}</span>
                                        {c.description && (
                                            <span className="text-xs text-muted-foreground truncate" title={c.description}>
                                                — {c.description}
                                            </span>
                                        )}
                                    </div>
                                    <div className="text-[10px] font-mono text-muted-foreground">{c.newLink}</div>
                                </div>
                            ))}
                        </div>
                    </ScrollArea>
                </div>
            )}
        </div>
    );
}
