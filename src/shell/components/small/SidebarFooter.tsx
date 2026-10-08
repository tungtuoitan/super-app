/**
 * SidebarFooter — bottom row of the unified sidebar (#1514): account (opens Accounts dialog; red when
 * signed out), K repo sync status, bottom-panel toggle, settings. Replaces the ActivityBar's bottom buttons.
 */

import { Settings, UserCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/shared";
import { useActivityBarStore } from "../../store/ActivityBar.store";
import { PanelToggleButton } from "./PanelToggleButton";
import { KRepoSyncIndicator } from "./KRepoSyncIndicator";

export function SidebarFooter() {
    const { setAccountsOpen, setSettingsOpen } = useActivityBarStore();
    const { isAuthenticated, $user } = useAuthStore();
    const displayName = $user.firstName || $user.userName || $user.email || "Account";

    return (
        <div className="flex flex-col gap-1 border-t border-editor-border px-2 py-2">
            <div className="px-1 empty:hidden">
                <KRepoSyncIndicator />
            </div>
            <div className="flex items-center gap-1">
                <button
                    type="button"
                    onClick={() => setAccountsOpen(true)}
                    className="flex h-8 min-w-0 flex-1 items-center gap-2 rounded-md px-1.5 text-left text-[13px] transition-colors duration-100 hover:bg-sa-hover"
                    title="Accounts"
                >
                    {$user.picture ? (
                        <img src={$user.picture} alt="" className="h-6 w-6 shrink-0 rounded-full object-cover" />
                    ) : (
                        <UserCircle className={cn("h-5 w-5 shrink-0", isAuthenticated ? "text-muted-foreground" : "text-sa-danger")} strokeWidth={1.75} />
                    )}
                    <span className={cn("truncate", isAuthenticated ? "text-muted-foreground" : "text-sa-danger")}>
                        {isAuthenticated ? displayName : "Sign in"}
                    </span>
                </button>
                <PanelToggleButton variant="compact" side="top" />
                <button
                    type="button"
                    onClick={() => setSettingsOpen(true)}
                    aria-label="Settings"
                    title="Settings"
                    className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground/70 transition-colors duration-100 hover:bg-sa-hover-strong hover:text-foreground"
                >
                    <Settings className="h-4 w-4" strokeWidth={1.75} />
                </button>
            </div>
        </div>
    );
}
