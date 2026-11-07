import { RefreshCw, Loader2, CheckCircle2, AlertCircle, GitBranch, Download } from "lucide-react";
import { Label } from "@/shared";
import type { KSyncStatus, KRepoCompareDiff } from "@/features/K/types/kRepoSync.type";
import { SyncStatusChip } from "./SyncStatusChip";

interface SettingsKRepoSyncSectionProps {
    syncStatus: KSyncStatus;
    syncDirection: "push" | "pull" | null;
    statusMessage: string | null;
    lastPushAt: string | null;
    repoUrl: string;
    repoUrlInput: string;
    branchInput: string;
    patInput: string;
    onRepoUrlInputChange: (value: string) => void;
    onBranchInputChange: (value: string) => void;
    onPatInputChange: (value: string) => void;
    isSavingConfig: boolean;
    configError: string | null;
    configSaved: boolean;
    onSaveConfig: () => void;
    isComparing: boolean;
    compareDiff: KRepoCompareDiff | null;
    hasAnyDiff: boolean;
    secondsToRefresh: number;
    isResolving: boolean;
    onViewChanges: () => void;
    repoActionError: string | null;
}

export function SettingsKRepoSyncSection({
    syncStatus, syncDirection, statusMessage, lastPushAt, repoUrl,
    repoUrlInput, branchInput, patInput,
    onRepoUrlInputChange, onBranchInputChange, onPatInputChange,
    isSavingConfig, configError, configSaved, onSaveConfig,
    isComparing, compareDiff, hasAnyDiff, secondsToRefresh, isResolving, onViewChanges, repoActionError,
}: SettingsKRepoSyncSectionProps) {
    return (
        <div className="space-y-3">
            <Label className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground flex items-center gap-1.5">
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
                    onChange={(e) => onRepoUrlInputChange(e.target.value)}
                    placeholder="https://github.com/user/repo.git"
                    className="w-full h-8 px-2.5 rounded-lg border border-input bg-transparent text-[13px] focus:outline-none focus:border-ring focus:ring-1 focus:ring-ring"
                />
            </div>

            <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                    <label className="text-xs text-muted-foreground">Branch</label>
                    <input
                        type="text"
                        value={branchInput}
                        onChange={(e) => onBranchInputChange(e.target.value)}
                        placeholder="K"
                        className="w-full h-8 px-2.5 rounded-lg border border-input bg-transparent text-[13px] focus:outline-none focus:border-ring focus:ring-1 focus:ring-ring"
                    />
                </div>
                <div className="space-y-1">
                    <label className="text-xs text-muted-foreground">Personal Access Token</label>
                    <input
                        type="password"
                        value={patInput}
                        onChange={(e) => onPatInputChange(e.target.value)}
                        placeholder={repoUrl ? "Leave blank to keep" : "ghp_..."}
                        className="w-full h-8 px-2.5 rounded-lg border border-input bg-transparent text-[13px] focus:outline-none focus:border-ring focus:ring-1 focus:ring-ring"
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
                <div className="flex items-center gap-1.5 text-xs text-sa-good">
                    <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                    Configuration saved
                </div>
            )}

            <button
                onClick={onSaveConfig}
                disabled={isSavingConfig || !repoUrlInput}
                className="flex items-center gap-2 h-8 px-3 rounded-lg border border-sa-border-strong hover:bg-sa-hover-strong transition-colors duration-100 disabled:opacity-50 disabled:cursor-not-allowed text-sm w-full justify-center"
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
                            <><CheckCircle2 className="w-3 h-3 text-sa-good" /> Repo and DB are in sync · next check in {secondsToRefresh}s</>
                        ) : (
                            <><RefreshCw className="w-3 h-3" /> Next check in {secondsToRefresh}s</>
                        )}
                    </div>

                    {/* View Changes — opens review dialog when there are changes from remote */}
                    <button
                        onClick={onViewChanges}
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
    );
}
