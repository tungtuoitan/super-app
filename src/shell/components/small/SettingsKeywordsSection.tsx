import { RefreshCw, Loader2, CheckCircle2, AlertCircle } from "lucide-react";
import { Label } from "@/shared";
import type { KeywordSyncReport } from "@/shared";
import { TYPE_ORDER, UNKNOWN_TYPE_SORT_ORDER } from "../../settingsDialog.constants";

interface SettingsKeywordsSectionProps {
    isSyncing: boolean;
    syncReport: KeywordSyncReport | null;
    syncError: string | null;
    onSync: () => void;
}

export function SettingsKeywordsSection({ isSyncing, syncReport, syncError, onSync }: SettingsKeywordsSectionProps) {
    const sortedTypes = syncReport
        ? Object.entries(syncReport.countByType).sort(([a], [b]) => {
              const ai = TYPE_ORDER.indexOf(a);
              const bi = TYPE_ORDER.indexOf(b);
              return (ai === -1 ? UNKNOWN_TYPE_SORT_ORDER : ai) - (bi === -1 ? UNKNOWN_TYPE_SORT_ORDER : bi);
          })
        : [];

    return (
        <div className="space-y-3">
            <Label className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">Keywords</Label>
            <button
                onClick={onSync}
                disabled={isSyncing}
                className="flex items-center gap-2 h-8 px-3 rounded-lg border border-sa-border-strong hover:bg-sa-hover-strong transition-colors duration-100 disabled:opacity-50 disabled:cursor-not-allowed text-sm w-full justify-center"
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
                        <span className={`font-medium ${syncReport.nameMismatchCount > 0 ? "text-sa-amber-ink" : ""}`}>
                            {syncReport.nameMismatchCount}
                        </span>

                        <span className="text-muted-foreground">Link fix</span>
                        <span className={`font-medium ${syncReport.linkMismatchCount > 0 ? "text-sa-amber-ink" : ""}`}>
                            {syncReport.linkMismatchCount}
                        </span>

                        <span className="text-muted-foreground">Updated</span>
                        <span className={`font-medium ${syncReport.updatedCount > 0 ? "text-sa-good" : ""}`}>
                            {syncReport.updatedCount}
                        </span>

                        <span className="text-muted-foreground">Created</span>
                        <span className={`font-medium ${syncReport.createdCount > 0 ? "text-muted-foreground" : ""}`}>
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
                        <div className="flex items-center gap-1.5 text-xs text-sa-good">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            All keywords are up to date
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
