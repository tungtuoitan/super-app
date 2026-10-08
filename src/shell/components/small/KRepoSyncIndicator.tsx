/**
 * KRepoSyncIndicator — K repo sync status (pushing / behind / conflict / error) (#1514: moved out of TopNav, unchanged).
 */

import { useState } from "react";
import { AlertCircle, AlertTriangle, Loader2 } from "lucide-react";
import { useAuthStore } from "@/shared";
import { useKRepoSyncStore, KRepoSyncService } from "@/features/K";

// ── KRepoSyncIndicator ────────────────────────────────────────────────────────

export function KRepoSyncIndicator() {
    const { syncStatus, statusMessage, setIsDiffModalOpen } = useKRepoSyncStore();
    const { $user } = useAuthStore();
    const [isRetrying, setIsRetrying] = useState(false);

    if (syncStatus === "idle" || syncStatus === "synced") return null;

    if (syncStatus === "pushing" || syncStatus === "pulling" || syncStatus === "checking") {
        return (
            <div className="flex items-center gap-1.5 text-muted-foreground text-[11px]">
                <Loader2 className="w-3 h-3 animate-spin shrink-0" />
                <span className="hidden sm:block truncate max-w-[180px]">
                    {statusMessage ?? (syncStatus === "pushing" ? "Pushing DB → repo..." : syncStatus === "pulling" ? "Pulling repo → DB..." : "Checking...")}
                </span>
            </div>
        );
    }

    if (syncStatus === "behind") {
        return (
            <button
                onClick={() => setIsDiffModalOpen(true)}
                className="flex items-center gap-1.5 text-sa-amber-ink text-[11px] hover:opacity-80 transition-opacity"
                title="Remote changes available — click to view diff"
            >
                <AlertCircle className="w-3 h-3 shrink-0" />
                <span className="hidden sm:block">Remote changes</span>
            </button>
        );
    }

    if (syncStatus === "conflict") {
        return (
            <button
                onClick={async () => {
                    setIsRetrying(true);
                    try { await KRepoSyncService._retry($user.userToken); } catch { /* status via SignalR */ }
                    finally { setIsRetrying(false); }
                }}
                disabled={isRetrying}
                className="flex items-center gap-1.5 text-sa-danger text-[11px] hover:opacity-80 transition-opacity disabled:opacity-50"
                title="Conflict — resolve in git then click to retry"
            >
                {isRetrying ? <Loader2 className="w-3 h-3 animate-spin shrink-0" /> : <AlertTriangle className="w-3 h-3 shrink-0" />}
                <span className="hidden sm:block">Conflict</span>
            </button>
        );
    }

    if (syncStatus === "error") {
        return (
            <div className="flex items-center gap-1.5 text-sa-danger text-[11px]" title={statusMessage ?? "Sync error"}>
                <AlertCircle className="w-3 h-3 shrink-0" />
                <span className="hidden sm:block">Sync error</span>
            </div>
        );
    }

    return null;
}
