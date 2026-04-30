import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/shared";
import { Label } from "@/shared";
import { Sun, Moon, RefreshCw, Loader2, CheckCircle2, AlertCircle } from "lucide-react";
import { useTheme } from "@/contexts/ThemeContext";
import { ScrollArea } from "@/shared";
import { keywordService } from "@/shell";
import type { KeywordSyncReport } from "@/shell";
import {useStandardRegistryHelper} from "@/shared";
import {useAuthStore} from "@/shell";
import {useActivityBarStore} from "../store/ActivityBar.store";

const TYPE_ORDER = ["workspace", "folder", "note", "file", "project", "task", "log", "track", "external"];

export function SettingsDialog() {
    const { theme, setTheme } = useTheme();
    const { settingsOpen, setSettingsOpen } = useActivityBarStore();
    const { $user } = useAuthStore();

    const [isSyncing, setIsSyncing] = useState(false);
    const [syncReport, setSyncReport] = useState<KeywordSyncReport | null>(null);
    const [syncError, setSyncError] = useState<string | null>(null);
    const { loadStandardRegistries, loadKeywords } = useStandardRegistryHelper();

    useEffect(() => {
        if (!settingsOpen) {
            setSyncReport(null);
        }
    }, [settingsOpen]);

    const handleSync = async () => {
        setIsSyncing(true);
        setSyncReport(null);
        setSyncError(null);
        try {
            const report = await keywordService._syncKeywords($user.userToken);
            setSyncReport(report);
        } catch {
            setSyncError("Failed to sync keywords. Please try again.");
        } finally {
            await loadKeywords();
            setIsSyncing(false);
        }
    };

    const sortedTypes = syncReport
        ? Object.entries(syncReport.countByType).sort(([a], [b]) => {
              const ai = TYPE_ORDER.indexOf(a);
              const bi = TYPE_ORDER.indexOf(b);
              return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi);
          })
        : [];

    return (
        <Dialog open={settingsOpen} onOpenChange={setSettingsOpen}>
            <DialogContent className="max-w-4xl w-full">
                <DialogHeader>
                    <DialogTitle>Settings</DialogTitle>
                    <DialogDescription>Configure your application preferences</DialogDescription>
                </DialogHeader>

                <div className="flex gap-6 py-2">
                    {/* ── Left column: Theme + Keyword controls ── */}
                    <div className="w-64 shrink-0 space-y-6">
                        {/* Theme */}
                        <div className="space-y-3">
                            <Label className="text-sm font-medium">Theme</Label>
                            <div className="flex gap-2">
                                <button
                                    onClick={() => setTheme("light")}
                                    className={`
                                        flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg border-2 transition-all
                                        ${theme === "light" ? "border-primary bg-primary/10 text-primary" : "border-border hover:border-primary/50 hover:bg-accent"}
                                    `}
                                >
                                    <Sun className="w-4 h-4" />
                                    <span className="font-medium text-sm">Light</span>
                                </button>
                                <button
                                    onClick={() => setTheme("dark")}
                                    className={`
                                        flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg border-2 transition-all
                                        ${theme === "dark" ? "border-primary bg-primary/10 text-primary" : "border-border hover:border-primary/50 hover:bg-accent"}
                                    `}
                                >
                                    <Moon className="w-4 h-4" />
                                    <span className="font-medium text-sm">Dark</span>
                                </button>
                            </div>
                        </div>

                        {/* Keywords */}
                        <div className="space-y-3">
                            <Label className="text-sm font-medium">Keywords</Label>
                            <button
                                onClick={handleSync}
                                disabled={isSyncing}
                                className="flex items-center gap-2 px-4 py-2 rounded-lg border border-border hover:bg-accent transition-all disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                            >
                                {isSyncing
                                    ? <Loader2 className="w-4 h-4 animate-spin" />
                                    : <RefreshCw className="w-4 h-4" />
                                }
                                {isSyncing ? "Syncing..." : "Sync Keywords"}
                            </button>
                            <p className="text-xs text-muted-foreground">
                                Compares keyword names and links against their source data and fixes any mismatches.
                            </p>

                            {/* Error */}
                            {syncError && (
                                <div className="flex items-center gap-2 text-sm text-destructive">
                                    <AlertCircle className="w-4 h-4 flex-shrink-0" />
                                    {syncError}
                                </div>
                            )}

                            {/* Summary */}
                            {syncReport && (
                                <div className="space-y-3">
                                    <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
                                        <span className="text-muted-foreground">Total</span>
                                        <span className="font-medium">{syncReport.totalKeywords}</span>

                                        <span className="text-muted-foreground">Hard deleted</span>
                                        <span className="font-medium">{syncReport.hardDeletedCount}</span>

                                        <span className="text-muted-foreground">Name fix</span>
                                        <span className={`font-medium ${syncReport.nameMismatchCount > 0 ? "text-yellow-500" : ""}`}>
                                            {syncReport.nameMismatchCount}
                                        </span>

                                        <span className="text-muted-foreground">Link fix</span>
                                        <span className={`font-medium ${syncReport.linkMismatchCount > 0 ? "text-yellow-500" : ""}`}>
                                            {syncReport.linkMismatchCount}
                                        </span>

                                        <span className="text-muted-foreground">Updated</span>
                                        <span className={`font-medium ${syncReport.updatedCount > 0 ? "text-green-500" : ""}`}>
                                            {syncReport.updatedCount}
                                        </span>

                                        <span className="text-muted-foreground">Created</span>
                                        <span className={`font-medium ${syncReport.createdCount > 0 ? "text-blue-500" : ""}`}>
                                            {syncReport.createdCount}
                                        </span>
                                    </div>

                                    {/* By type badges */}
                                    {sortedTypes.length > 0 && (
                                        <div>
                                            <p className="text-xs text-muted-foreground mb-1.5">By type</p>
                                            <div className="flex flex-wrap gap-1">
                                                {sortedTypes.map(([type, count]) => (
                                                    <span key={type} className="px-2 py-0.5 rounded-full bg-muted text-xs border border-border">
                                                        {type} <span className="font-semibold">{count}</span>
                                                    </span>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {syncReport.updates.length === 0 && syncReport.created.length === 0 && (
                                        <div className="flex items-center gap-1.5 text-xs text-green-500">
                                            <CheckCircle2 className="w-3.5 h-3.5" />
                                            All keywords are up to date
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* ── Right column: Updated + Created lists ── */}
                    {syncReport && (syncReport.updates.length > 0 || syncReport.created.length > 0) && (
                        <div className="flex-1 flex gap-4 min-w-0">
                            {/* Updated list */}
                            {syncReport.updates.length > 0 && (
                                <div className="flex-1 min-w-0 flex flex-col gap-2">
                                    <p className="text-xs text-muted-foreground font-medium">
                                        Updated ({syncReport.updates.length})
                                    </p>
                                    <ScrollArea className="flex-1 h-80 rounded-md border">
                                        <div className="p-2 space-y-1">
                                            {syncReport.updates.map((u) => (
                                                <div key={u.id} className="rounded-md bg-muted/50 p-2 space-y-1">
                                                    <div className="flex items-center gap-1.5">
                                                        <span className="px-1.5 py-0.5 rounded bg-primary/15 text-primary text-[10px] font-medium shrink-0">
                                                            {u.type}
                                                        </span>
                                                        {u.nameChanged && (
                                                            <span className="text-[10px] text-yellow-500 font-medium">name</span>
                                                        )}
                                                        {u.linkChanged && (
                                                            <span className="text-[10px] text-blue-500 font-medium">link</span>
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
                                <div className="flex-1 min-w-0 flex flex-col gap-2">
                                    <p className="text-xs text-muted-foreground font-medium">
                                        Created ({syncReport.created.length})
                                    </p>
                                    <ScrollArea className="flex-1 h-80 rounded-md border">
                                        <div className="p-2 space-y-1">
                                            {syncReport.created.map((c, i) => (
                                                <div key={`${c.type}-${i}`} className="rounded-md bg-blue-500/5 border border-blue-500/20 p-2 space-y-1">
                                                    <div className="flex items-center gap-1.5 min-w-0">
                                                        <span className="px-1.5 py-0.5 rounded bg-blue-500/15 text-blue-500 text-[10px] font-medium shrink-0">
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
                    )}
                </div>
            </DialogContent>
        </Dialog>
    );
}
