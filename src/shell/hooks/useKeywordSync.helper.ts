import { useEffect, useState } from "react";
import { keywordService, useKeywordHelper } from "@/shared";
import type { KeywordSyncReport } from "@/shared";
import { useAuthStore } from "@/shared";

export function useKeywordSync(settingsOpen: boolean) {
    const { $user } = useAuthStore();
    const [isSyncing, setIsSyncing] = useState(false);
    const [syncReport, setSyncReport] = useState<KeywordSyncReport | null>(null);
    const [syncError, setSyncError] = useState<string | null>(null);
    const { loadKeywords } = useKeywordHelper();

    useEffect(() => {
        if (!settingsOpen) setSyncReport(null);
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

    return { isSyncing, syncReport, syncError, handleSync };
}
