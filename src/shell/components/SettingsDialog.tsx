import { useEffect, useRef, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/shared";
import { Label } from "@/shared";
import { Sun, Moon, RefreshCw, Loader2, CheckCircle2, AlertCircle, GitBranch, Download } from "lucide-react";
import { useTheme } from "@/contexts/ThemeContext";
import { ScrollArea } from "@/shared";
import { keywordService, useKeywordHelper } from "@/shared";
import type { KeywordSyncReport } from "@/shared";
import { useAuthStore } from "@/shared";
import { useActivityBarStore } from "../store/ActivityBar.store";
import { useKRepoSyncStore, KRepoSyncService, KRepoDiffPanel, KRepoConflictDialog } from "@/features/K";
import type { KSyncStatus, KRepoCompareDiff, KRepoResolveConflictItem } from "@/features/K/types/kRepoSync.type";

const TYPE_ORDER = ["workspace", "folder", "note", "file", "project", "task", "log", "track", "external"];
/** Fallback sort index for types not in TYPE_ORDER — sorts them after all known types. */
const UNKNOWN_TYPE_SORT_ORDER = TYPE_ORDER.length + 1;

/** Seconds between auto-refreshes of the repo-vs-DB diff while the dialog is open. */
const REFRESH_INTERVAL_SEC = 10;

function SyncStatusChip({ status, direction }: { status: KSyncStatus; direction: "push" | "pull" | null }) {
    const label = (() => {
        if (status === "pushing") return direction === "push" ? "Pushing DB → repo" : "Pushing...";
        if (status === "pulling") return direction === "pull" ? "Pulling repo → DB" : "Pulling...";
        if (status === "behind")    return "Behind remote";
        if (status === "conflict")  return "Conflict";
        if (status === "error")     return "Error";
        if (status === "synced")    return "Synced";
        if (status === "checking")  return "Checking...";
        return "Idle";
    })();

    const cls = (() => {
        if (status === "pushing" || status === "pulling") return "bg-blue-500/15 text-blue-400 border-blue-500/30";
        if (status === "behind")   return "bg-amber-500/15 text-amber-400 border-amber-500/30";
        if (status === "conflict" || status === "error") return "bg-red-500/15 text-red-400 border-red-500/30";
        if (status === "synced")   return "bg-green-500/15 text-green-400 border-green-500/30";
        return "bg-muted text-muted-foreground border-border";
    })();

    const isSpinning = status === "pushing" || status === "pulling" || status === "checking";

    return (
        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-[11px] font-medium ${cls}`}>
            {isSpinning && <Loader2 className="w-2.5 h-2.5 animate-spin" />}
            {label}
        </span>
    );
}

export function SettingsDialog() {
    const { theme, setTheme } = useTheme();
    const { settingsOpen, setSettingsOpen } = useActivityBarStore();
    const { $user } = useAuthStore();

    const [isSyncing, setIsSyncing] = useState(false);
    const [syncReport, setSyncReport] = useState<KeywordSyncReport | null>(null);
    const [syncError, setSyncError] = useState<string | null>(null);
    const { loadKeywords } = useKeywordHelper();

    // K Repo Sync
    const { syncStatus, statusMessage, syncDirection, repoUrl, lastPushAt, setRepoUrl } = useKRepoSyncStore();
    const [repoUrlInput, setRepoUrlInput]   = useState("");
    const [branchInput, setBranchInput]     = useState("main");
    const [patInput, setPatInput]           = useState("");
    const [isSavingConfig, setIsSavingConfig] = useState(false);
    const [configError, setConfigError]     = useState<string | null>(null);
    const [configSaved, setConfigSaved]     = useState(false);
    const [compareDiff, setCompareDiff]     = useState<KRepoCompareDiff | null>(null);
    const [repoActionError, setRepoActionError] = useState<string | null>(null);
    const [reviewOpen, setReviewOpen]       = useState(false);
    const [isResolving, setIsResolving]     = useState(false);
    const [isComparing, setIsComparing]     = useState(false);
    const [secondsToRefresh, setSecondsToRefresh] = useState(REFRESH_INTERVAL_SEC);
    const isMountedRef = useRef(false);
    const isFetchingRef = useRef(false);

    const hasAnyDiff = (compareDiff?.repoOnlyCount ?? 0)
                     + (compareDiff?.dbOnlyCount   ?? 0)
                     + (compareDiff?.modifiedCount ?? 0) > 0;

    // Background fetch — silent, skips when resolve action is in flight
    const fetchCompareSilent = async () => {
        if (isFetchingRef.current || isResolving) return;
        if (!repoUrl) return;
        isFetchingRef.current = true;
        if (isMountedRef.current) setIsComparing(true);
        try {
            const diff = await KRepoSyncService._getCompare($user.userToken);
            if (isMountedRef.current) setCompareDiff(diff);
        } catch {/* ignore polling errors */}
        finally {
            isFetchingRef.current = false;
            if (isMountedRef.current) {
                setIsComparing(false);
                setSecondsToRefresh(REFRESH_INTERVAL_SEC);
            }
        }
    };

    useEffect(() => {
        isMountedRef.current = true;
        return () => { isMountedRef.current = false; };
    }, []);

    useEffect(() => {
        if (!settingsOpen) {
            setSyncReport(null);
            setConfigError(null);
            setConfigSaved(false);
            setRepoActionError(null);
            setCompareDiff(null);
            return;
        }
        // Load current status on open
        KRepoSyncService._getStatus($user.userToken)
            .then((cfg) => {
                setRepoUrlInput(cfg.repoUrl ?? "");
                setBranchInput(cfg.branch ?? "main");
                setRepoUrl(cfg.repoUrl ?? "");
            })
            .catch(() => {/* ignore */});
    }, [settingsOpen]);

    // Auto-poll diff every 10s while dialog is open and a repo is configured
    useEffect(() => {
        if (!settingsOpen || !repoUrl) return;
        fetchCompareSilent();
        setSecondsToRefresh(REFRESH_INTERVAL_SEC);
        const tick = setInterval(() => {
            setSecondsToRefresh(prev => {
                if (prev <= 1) { fetchCompareSilent(); return REFRESH_INTERVAL_SEC; }
                return prev - 1;
            });
        }, 1000);
        return () => clearInterval(tick);
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [settingsOpen, repoUrl]);

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

    const handleSaveConfig = async () => {
        setIsSavingConfig(true);
        setConfigError(null);
        setConfigSaved(false);
        try {
            await KRepoSyncService._saveConfig($user.userToken, {
                repoUrl: repoUrlInput,
                branch: branchInput,
                pat: patInput,
            });
            setRepoUrl(repoUrlInput);
            setPatInput("");
            setConfigSaved(true);
        } catch {
            setConfigError("Failed to save configuration.");
        } finally {
            setIsSavingConfig(false);
        }
    };

    const handleResolveConflicts = async (items: KRepoResolveConflictItem[]) => {
        setIsResolving(true);
        setRepoActionError(null);
        try {
            await KRepoSyncService._resolveConflicts($user.userToken, items);
            await fetchCompareSilent();
        } catch {
            setRepoActionError("Apply changes failed.");
        } finally {
            setIsResolving(false);
        }
    };

    const sortedTypes = syncReport
        ? Object.entries(syncReport.countByType).sort(([a], [b]) => {
              const ai = TYPE_ORDER.indexOf(a);
              const bi = TYPE_ORDER.indexOf(b);
              return (ai === -1 ? UNKNOWN_TYPE_SORT_ORDER : ai) - (bi === -1 ? UNKNOWN_TYPE_SORT_ORDER : bi);
          })
        : [];

    return (
        <>
        <Dialog open={settingsOpen} onOpenChange={setSettingsOpen}>
            <DialogContent className="max-w-5xl w-full max-h-[88vh] flex flex-col">
                <DialogHeader className="shrink-0">
                    <DialogTitle>Settings</DialogTitle>
                    <DialogDescription>Configure your application preferences</DialogDescription>
                </DialogHeader>

                <div className="overflow-y-auto flex-1 min-h-0 pr-1">
                <div className="space-y-6 py-2">
                    {/* Top row: two equal columns */}
                    <div className="grid grid-cols-2 gap-6">
                        {/* ── Left: Theme + Keywords ── */}
                        <div className="space-y-6">
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
                                    className="flex items-center gap-2 px-4 py-2 rounded-lg border border-border hover:bg-accent transition-all disabled:opacity-50 disabled:cursor-not-allowed text-sm w-full justify-center"
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

                                {syncError && (
                                    <div className="flex items-center gap-2 text-sm text-destructive">
                                        <AlertCircle className="w-4 h-4 flex-shrink-0" />
                                        {syncError}
                                    </div>
                                )}

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

                        {/* ── Right: K Repo Sync ── */}
                        <div className="space-y-3">
                            <Label className="text-sm font-medium flex items-center gap-1.5">
                                <GitBranch className="w-3.5 h-3.5" />
                                K Repo Sync
                            </Label>

                            <div className="flex items-center gap-2 flex-wrap">
                                <SyncStatusChip status={syncStatus} direction={syncDirection} />
                                {lastPushAt && (
                                    <span className="text-[11px] text-muted-foreground">
                                        last push {new Date(lastPushAt).toLocaleString()}
                                    </span>
                                )}
                            </div>

                            {statusMessage && (syncStatus === "error" || syncStatus === "conflict") && (
                                <p className="text-xs text-muted-foreground">{statusMessage}</p>
                            )}

                            <div className="space-y-1">
                                <label className="text-xs text-muted-foreground">Repo URL</label>
                                <input
                                    type="text"
                                    value={repoUrlInput}
                                    onChange={(e) => { setRepoUrlInput(e.target.value); setConfigSaved(false); }}
                                    placeholder="https://github.com/user/repo.git"
                                    className="w-full px-2.5 py-1.5 rounded-md border border-border bg-background text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-2">
                                <div className="space-y-1">
                                    <label className="text-xs text-muted-foreground">Branch</label>
                                    <input
                                        type="text"
                                        value={branchInput}
                                        onChange={(e) => { setBranchInput(e.target.value); setConfigSaved(false); }}
                                        placeholder="K"
                                        className="w-full px-2.5 py-1.5 rounded-md border border-border bg-background text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                                    />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-xs text-muted-foreground">Personal Access Token</label>
                                    <input
                                        type="password"
                                        value={patInput}
                                        onChange={(e) => { setPatInput(e.target.value); setConfigSaved(false); }}
                                        placeholder={repoUrl ? "Leave blank to keep" : "ghp_..."}
                                        className="w-full px-2.5 py-1.5 rounded-md border border-border bg-background text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                                    />
                                </div>
                            </div>

                            {configError && (
                                <div className="flex items-center gap-1.5 text-xs text-destructive">
                                    <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                                    {configError}
                                </div>
                            )}
                            {configSaved && (
                                <div className="flex items-center gap-1.5 text-xs text-green-500">
                                    <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                                    Configuration saved
                                </div>
                            )}

                            <button
                                onClick={handleSaveConfig}
                                disabled={isSavingConfig || !repoUrlInput}
                                className="flex items-center gap-2 px-4 py-2 rounded-lg border border-border hover:bg-accent transition-all disabled:opacity-50 disabled:cursor-not-allowed text-sm w-full justify-center"
                            >
                                {isSavingConfig ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                                Save config
                            </button>

                            {!repoUrl && (
                                <p className="text-xs text-muted-foreground">Configure a repo to enable sync.</p>
                            )}

                            {repoUrl && (
                                <div className="space-y-2">
                                    {/* Status / countdown */}
                                    <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                                        {isComparing ? (
                                            <><Loader2 className="w-3 h-3 animate-spin" /> Comparing repo vs DB…</>
                                        ) : compareDiff && !hasAnyDiff ? (
                                            <><CheckCircle2 className="w-3 h-3 text-green-500" /> Repo and DB are in sync · next check in {secondsToRefresh}s</>
                                        ) : (
                                            <><RefreshCw className="w-3 h-3" /> Next check in {secondsToRefresh}s</>
                                        )}
                                    </div>

                                    {/* View Changes — opens review dialog when there are changes from remote */}
                                    <button
                                        onClick={() => setReviewOpen(true)}
                                        disabled={!hasAnyDiff || isResolving}
                                        className="flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg border border-primary/40 text-primary hover:bg-primary/10 transition-all disabled:opacity-50 disabled:cursor-not-allowed text-xs w-full"
                                        title={hasAnyDiff
                                            ? "Review changes coming from remote"
                                            : "No changes from remote"}
                                    >
                                        {isResolving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
                                        {compareDiff && hasAnyDiff
                                            ? `View Changes (${(compareDiff.repoOnlyCount ?? 0) + (compareDiff.modifiedCount ?? 0) + (compareDiff.dbOnlyCount ?? 0)} change${(compareDiff.repoOnlyCount + compareDiff.modifiedCount + compareDiff.dbOnlyCount) === 1 ? "" : "s"})`
                                            : "View Changes"}
                                    </button>
                                </div>
                            )}
                            {repoActionError && (
                                <div className="flex items-center gap-1.5 text-xs text-destructive">
                                    <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                                    {repoActionError}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Bottom row (conditional, full width): Sync result lists */}
                    {syncReport && (syncReport.updates.length > 0 || syncReport.created.length > 0) && (
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
                                <div className="flex flex-col gap-2 min-w-0">
                                    <p className="text-xs text-muted-foreground font-medium">
                                        Created ({syncReport.created.length})
                                    </p>
                                    <ScrollArea className="h-72 rounded-md border">
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
                </div>{/* end scroll wrapper */}
            </DialogContent>
        </Dialog>

        <KRepoConflictDialog
            open={reviewOpen}
            onOpenChange={setReviewOpen}
            entries={compareDiff?.entries ?? []}
            onResolve={handleResolveConflicts}
            isResolving={isResolving}
        />
        </>
    );
}
