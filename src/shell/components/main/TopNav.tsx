import { useState } from "react";
import { constants } from "@/shared";
import { envConfig } from "config/env.config";
import { useDeviceStore, useAuthStore } from "@/shared";
import { CommandPalette } from "@/shell/commandPallete/CommandPalette";
import { useActivityBarStore } from "@/shell/store/ActivityBar.store";
import { AlertCircle, AlertTriangle, Loader2 } from "lucide-react";
import { useKRepoSyncStore, KRepoSyncService } from "@/features/K";

// ── KRepoSyncIndicator ────────────────────────────────────────────────────────

function KRepoSyncIndicator() {
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

// ── Icon sub-components ───────────────────────────────────────────────────────

function CloseIcon() {
    return (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
        </svg>
    );
}

function HamburgerIcon() {
    return (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="3" y1="6" x2="21" y2="6" />
            <line x1="3" y1="12" x2="21" y2="12" />
            <line x1="3" y1="18" x2="21" y2="18" />
        </svg>
    );
}

// ── TopNav ────────────────────────────────────────────────────────────────────

/**
 * TopNav — application top bar.
 * Ctrl+P is handled by useCommandPaletteKeyDown inside <CommandPalette />.
 */
export function TopNav() {
    const showDevBadge = envConfig.REACT_APP_ENVIRONMENT?.toLowerCase() !== constants.environments.production.toLowerCase();
    const { isSideBarVisible, setIsSideBarVisible, isHomeOpen, setIsHomeOpen } = useActivityBarStore();
    const { isMobile } = useDeviceStore();

    /** Logo = homepage over the whole workbench (TungRoot #1481); click again to go back to work. */
    const handleToggleHome = () => setIsHomeOpen((open) => !open);

    const handleToggleSidebar = () => {
        setIsSideBarVisible(!isSideBarVisible);
    };

    return (
        <>
            <CommandPalette />

            <div className="top-navigation w-full bg-editor-bg h-[36px] sticky top-0 z-50">
                <nav className="bg-editor-sidebar border-b border-editor-border h-[36px] flex items-center px-4 gap-2 w-full">
                    <button type="button" onClick={handleToggleHome} className="flex items-center cursor-pointer" title={isHomeOpen ? "Về chỗ làm việc" : "Trang chủ"} aria-label="Home">
                        <img src="/logo-32x32-web.png" alt="Logo" className="w-4 h-4 mr-1 rounded-sm dark:invert" />
                        <span className="text-[10px] text-muted-foreground uppercase tracking-wide">S  u  p  e  r   A  p  p</span>
                    </button>

                    {isMobile && (
                        <button
                            onClick={handleToggleSidebar}
                            className="p-1 rounded text-muted-foreground hover:text-foreground transition-colors"
                            title={isSideBarVisible ? "Hide sidebar" : "Show sidebar"}
                            aria-label={isSideBarVisible ? "Hide sidebar" : "Show sidebar"}
                        >
                            {isSideBarVisible ? <CloseIcon /> : <HamburgerIcon />}
                        </button>
                    )}

                    <div className="flex-1"></div>
                    <KRepoSyncIndicator />
                    {showDevBadge && <div className="rounded-md border border-sa-danger/40 px-1.5 font-mono text-[10px] font-medium uppercase leading-4 text-sa-danger">DEV</div>}
                </nav>
            </div>
        </>
    );
}
