import { useEffect, useRef, useState } from "react";
import { useAuthStore } from "@/shared";
import { useKRepoSyncStore, KRepoSyncService, notifyViewing } from "@/features/K";
import type { KRepoCompareDiff, KRepoResolveConflictItem } from "@/features/K/types/kRepoSync.type";
import { REFRESH_INTERVAL_SEC } from "../settingsDialog.constants";

export function useKRepoSyncSettings(settingsOpen: boolean) {
    const { $user } = useAuthStore();

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

    // Background fetch — silent, skips when:
    //   • a fetch is already in flight,
    //   • user is applying changes (isResolving),
    //   • Review Changes dialog is open (entries must stay stable while user inspects them).
    const fetchCompareSilent = async () => {
        if (isFetchingRef.current || isResolving || reviewOpen) return;
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

    // Tell BE the user is viewing the diff popup so the daemon won't push DB → remote
    // mid-review and invalidate what they're looking at. Best-effort: SignalR may be
    // disconnected; daemon will just behave as before in that case.
    useEffect(() => {
        if (!reviewOpen) return;
        notifyViewing("start");
        return () => { notifyViewing("stop"); };
    }, [reviewOpen]);

    useEffect(() => {
        if (!settingsOpen) {
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
        } catch {
            setRepoActionError("Apply changes failed.");
        } finally {
            setIsResolving(false);
        }
        // Refresh compare AFTER isResolving becomes false — fetchCompareSilent
        // skips while resolving, so an in-try fetch would no-op.
        await fetchCompareSilent();
    };

    return {
        syncStatus, statusMessage, syncDirection, repoUrl, lastPushAt,
        repoUrlInput, setRepoUrlInput, branchInput, setBranchInput, patInput, setPatInput,
        isSavingConfig, configError, configSaved, setConfigSaved,
        compareDiff, repoActionError, reviewOpen, setReviewOpen,
        isResolving, isComparing, secondsToRefresh, hasAnyDiff,
        handleSaveConfig, handleResolveConflicts,
    };
}
