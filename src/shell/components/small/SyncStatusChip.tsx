import { Loader2 } from "lucide-react";
import type { KSyncStatus } from "@/features/K/types/kRepoSync.type";

export function SyncStatusChip({ status, direction }: { status: KSyncStatus; direction: "push" | "pull" | null }) {
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
        if (status === "pushing" || status === "pulling") return "bg-sa-hover text-muted-foreground border-sa-border-strong";
        if (status === "behind")   return "bg-sa-amber/10 text-sa-amber-ink border-sa-amber/30";
        if (status === "conflict" || status === "error") return "bg-sa-danger/10 text-sa-danger border-sa-danger/30";
        if (status === "synced")   return "bg-sa-good/10 text-sa-good border-sa-good/30";
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
