import { Settings, UserCircle, PanelLeftOpen, Search } from "lucide-react";
import { useCommandPaletteStore } from "@/shell/commandPallete/useCommandPalette.store";
import { useEffect, useRef } from "react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/shared";
import { SettingsDialog } from "../SettingsDialog";
import { AccountsDialog } from "../AccountsDialog";
import { useAuthStore, debugLog, getDeviceFingerprint } from "@/shared";
import {useActivityBarStore} from "@/shell/store/ActivityBar.store";
import {useActivityBarHelper} from "@/shell/hooks/useActivityBar.helper";
import {ModuleDefinition} from "@/shell/types/moduleRegistry.type";
import {useSideBarStore} from "@/shell/store/SideBar.store";
import {moduleRegistry} from "@/shell/moduleRegistry";
import { PanelToggleButton } from "../small/PanelToggleButton";
import {ActivityBarView} from "@/shell/types/activeBarView";

// ─── Per-module button (own component so hooks inside useBadge work) ─────────

function ModuleButton({ module, isActive, horizontal, onClick }: {
    module: ModuleDefinition;
    isActive: boolean;
    horizontal: boolean;
    onClick: () => void;
}) {
    const badge     = module.useBadge?.() ?? 0;
    const statusDot = module.useStatusDot?.() ?? null;
    const Icon = module.icon;

    return (
        <TooltipProvider>
            <Tooltip>
                <TooltipTrigger asChild>
                    <button
                        onClick={onClick}
                        className={`relative w-12 h-12 rounded-none transition-colors duration-100 border-transparent ${
                            isActive
                                ? `text-foreground ${horizontal ? "shadow-[inset_0_-2px_0_hsl(var(--sa-accent-amber))]" : "shadow-[inset_2px_0_0_hsl(var(--sa-accent-amber))]"}`
                                : "cursor-pointer text-muted-foreground/70 hover:text-foreground hover:bg-transparent"
                        }`}
                    >
                        <Icon className="w-5 h-5 mx-auto" strokeWidth={1.75} />
                        {statusDot ? (
                            <span
                                className="absolute top-2 right-2 w-2 h-2 rounded-full"
                                style={{ backgroundColor: statusDot.color }}
                            />
                        ) : badge > 0 ? (
                            <span className="absolute top-1.5 right-1 min-w-[16px] h-4 flex items-center justify-center rounded-full bg-sa-amber text-sa-on-amber font-mono text-[9px] font-semibold px-1 leading-none">
                                {badge > 99 ? "99+" : badge}
                            </span>
                        ) : null}
                    </button>
                </TooltipTrigger>
                <TooltipContent side={horizontal ? "bottom" : "right"}>
                    <p>{module.label}</p>
                </TooltipContent>
            </Tooltip>
        </TooltipProvider>
    );
}

// ─── ActivityBar ─────────────────────────────────────────────────────────────

interface ActivityBarProps {
    horizontal?: boolean;
    /** Render Accounts/Settings dialogs here (false when the layout renders them itself) */
    withDialogs?: boolean;
}

export function ActivityBar({ horizontal, withDialogs = true }: ActivityBarProps) {
    const { setAccountsOpen, setSettingsOpen, setIsSideBarVisible } = useActivityBarStore();
    const { setIsOpen: setIsCommandPaletteOpen } = useCommandPaletteStore();
    const { handleActivityClick } = useActivityBarHelper();
    const { isAuthenticated, $user } = useAuthStore();
    const { moduleName } = useSideBarStore();

    // Track every change of isAuthenticated so we can see WHEN the Accounts btn turns red.
    // Compare against previous value via ref so we only log real transitions.
    const prevAuthRef = useRef<boolean | null>(null);
    useEffect(() => {
        const prev = prevAuthRef.current;
        prevAuthRef.current = isAuthenticated;
        const device = getDeviceFingerprint();
        debugLog.log("ActivityBar", "isAuthenticated-change", {
            prev,
            next: isAuthenticated,
            userId: $user.userId,
            email: $user.email,
            hasToken: !!$user.userToken,
            tokenLen: $user.userToken?.length ?? 0,
            pathname: window.location.pathname,
            visibility: document.visibilityState,
            online: navigator.onLine,
            device,
        });
        debugLog.flush();
    }, [isAuthenticated]);

    // On mobile (horizontal), only show the K module
    const visibleModules = moduleRegistry.getAll().filter((m) => {
        if (m.hideFromActivityBar) return false;
        if (horizontal && m.id !== "K") return false;
        return true;
    });

    const accountButton = (
        <TooltipProvider>
            <Tooltip>
                <TooltipTrigger asChild>
                    <button
                        onClick={() => setAccountsOpen(true)}
                        className={`w-12 h-12 rounded-none hover:text-foreground hover:bg-transparent transition-colors duration-100 ${
                            isAuthenticated ? "text-muted-foreground/70" : "text-sa-danger"
                        }`}
                    >
                        <UserCircle className="w-5 h-5 mx-auto" strokeWidth={1.75} />
                    </button>
                </TooltipTrigger>
                <TooltipContent side={horizontal ? "bottom" : "right"}>
                    <p>Accounts</p>
                </TooltipContent>
            </Tooltip>
        </TooltipProvider>
    );

    const settingsButton = (
        <TooltipProvider>
            <Tooltip>
                <TooltipTrigger asChild>
                    <button
                        onClick={() => setSettingsOpen(true)}
                        className="w-12 h-12 rounded-none text-muted-foreground/70 hover:text-foreground hover:bg-transparent transition-colors duration-100"
                    >
                        <Settings className="w-5 h-5 mx-auto" strokeWidth={1.75} />
                    </button>
                </TooltipTrigger>
                <TooltipContent side={horizontal ? "bottom" : "right"}>
                    <p>Settings</p>
                </TooltipContent>
            </Tooltip>
        </TooltipProvider>
    );

    if (horizontal) {
        return (
            <>
                <div className="w-full h-12 bg-editor-activitybar flex flex-row items-center border-b border-editor-border px-1">
                    <div className="flex flex-row flex-1">
                        {visibleModules.map((m) => (
                            <ModuleButton
                                key={m.id}
                                module={m}
                                isActive={moduleName === m.id}
                                horizontal
                                onClick={() => handleActivityClick(m.id as ActivityBarView)}
                            />
                        ))}
                    </div>
                    <div className="flex flex-row">
                        {accountButton}
                        {settingsButton}
                    </div>
                </div>
                <AccountsDialog />
                <SettingsDialog />
            </>
        );
    }

    return (
        <>
            <div className="w-12 h-full bg-editor-activitybar flex flex-col items-center border-r border-editor-border">
                {/* Collapsed-sidebar rail (#1514): expand + search on top */}
                <button onClick={() => setIsSideBarVisible(true)} className="w-12 h-12 flex items-center justify-center text-muted-foreground/70 hover:text-foreground transition-colors duration-100" aria-label="Expand sidebar" title="Expand sidebar">
                    <PanelLeftOpen className="w-5 h-5" strokeWidth={1.75} />
                </button>
                <button onClick={() => setIsCommandPaletteOpen(true)} className="w-12 h-12 flex items-center justify-center text-muted-foreground/70 hover:text-foreground transition-colors duration-100" aria-label="Search (Ctrl+P)" title="Search (Ctrl+P)">
                    <Search className="w-5 h-5" strokeWidth={1.75} />
                </button>
                <div className="flex-1">
                    {visibleModules.map((m) => (
                        <ModuleButton
                            key={m.id}
                            module={m}
                            isActive={moduleName === m.id}
                            horizontal={false}
                            onClick={() => handleActivityClick(m.id as ActivityBarView)}
                        />
                    ))}
                </div>
                <PanelToggleButton variant="rail" side="right" />
                <div className="pb-1">{accountButton}</div>
                <div className="pb-1">{settingsButton}</div>
            </div>
            {withDialogs && <AccountsDialog />}
            {withDialogs && <SettingsDialog />}
        </>
    );
}
