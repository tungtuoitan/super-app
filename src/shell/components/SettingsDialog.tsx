import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/shared";
import { Label } from "@/shared";
import { Sun, Moon, RefreshCw, Loader2, CheckCircle2, AlertCircle, AlertTriangle, GitBranch, Upload, Download } from "lucide-react";
import { useTheme } from "@/contexts/ThemeContext";
import { ScrollArea } from "@/shared";
import { keywordService, useKeywordHelper } from "@/shared";
import type { KeywordSyncReport } from "@/shared";
import { useAuthStore } from "@/shared";
import { useActivityBarStore } from "../store/ActivityBar.store";
import { useKRepoSyncStore, KRepoSyncService } from "@/features/K";
import type { KSyncStatus } from "@/features/K/types/kRepoSync.type";

const TYPE_ORDER = ["workspace", "folder", "note", "file", "project", "task", "log", "track", "external"];
/** Fallback sort index for types not in TYPE_ORDER — sorts them after all known types. */
const UNKNOWN_TYPE_SORT_ORDER = TYPE_ORDER.length + 1;

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
    const [branchInput, setBranchInput]     = useState("K");
    const [patInput, setPatInput]           = useState("");
    const [isSavingConfig, setIsSavingConfig] = useState(false);
    const [configError, setConfigError]     = useState<string | null>(null);
    const [configSaved, setConfigSaved]     = useState(false);
    const [isPushing, setIsPushing]         = useState(false);
    const [isPulling, setIsPulling]         = useState(false);
    const [repoActionError, setRepoActionError] = useState<string | null>(null);

    useEffect(() => {
        if (!settingsOpen) {
            setSyncReport(null);
            setConfigError(null);
            setConfigSaved(false);
            setRepoActionError(null);
            return;
        }
        // Load current status on open
        KRepoSyncService._getStatus($user.userToken)
            .then((cfg) => {
                setRepoUrlInput(cfg.repoUrl ?? "");
                setBranchInput(cfg.branch ?? "K");
                setRepoUrl(cfg.repoUrl ?? "");
            })
            .catch(() => {/* ignore */});
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

    const handlePush = async () => {
        setIsPushing(true);
        setRepoActionError(null);
        try {
            await KRepoSyncService._push($user.userToken);
        } catch {
            setRepoActionError("Push failed. Check sync status for details.");
        } finally {
            setIsPushing(false);
        }
    };

    const handlePull = async () => {
        setIsPulling(true);
        setRepoActionError(null);
        try {
            await KRepoSyncService._pull($user.userToken);
        } catch {
            setRepoActionError("Sync from remote failed. Check status for details.");
        } finally {
            setIsPulling(false);
        }
    };

    const handleRetry = async () => {
        setRepoActionError(null);
        try {
            await KRepoSyncService._retry($user.userToken);
        } catch {
            setRepoActionError("Retry failed.");
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
        <Dialog open={settingsOpen} onOpenChange={setSettingsOpen}>
            <DialogContent className="max-w-4xl w-full">
                <DialogHeader>
                    <DialogTitle>Settings</DialogTitle>
                    <DialogDescription>Configure your application preferences</DialogDescription>
                </DialogHeader>

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
                                <div className="flex gap-2">
                                    <button
                                        onClick={handlePush}
                                        disabled={isPushing || syncStatus === "pushing" || syncStatus === "pulling" || syncStatus === "conflict"}
                                        className="flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg border border-border hover:bg-accent transition-all disabled:opacity-50 disabled:cursor-not-allowed text-xs"
                                        title="Push DB → repo"
                                    >
                                        {isPushing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
                                        Push to R
                                    </button>
                                    <button
                                        onClick={handlePull}
                                        disabled={isPulling || syncStatus === "pushing" || syncStatus === "pulling" || syncStatus === "conflict"}
                                        className="flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg border border-border hover:bg-accent transition-all disabled:opacity-50 disabled:cursor-not-allowed text-xs"
                                        title="Sync repo → DB"
                                    >
                                        {isPulling ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
                                        Push to DB
                                    </button>
                                </div>
                            )}

                            {syncStatus === "conflict" && (
                                <button
                                    onClick={handleRetry}
                                    className="flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg border border-red-500/40 text-red-400 hover:bg-red-500/10 transition-all text-xs w-full"
                                >
                                    <AlertTriangle className="w-3.5 h-3.5" />
                                    Retry after resolving conflict
                                </button>
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
            </DialogContent>
        </Dialog>
    );
}
