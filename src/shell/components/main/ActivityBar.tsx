import { Settings, UserCircle } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/shared/components/ui/tooltip";
import { SettingsDialog } from "../SettingsDialog";
import { AccountsDialog } from "../AccountsDialog";
import { useActivityBarStore } from "@/store/index";
import { useActivityBarHelper } from "@/shell/hooks/useActivityBar.helper";
import { useAuthStore } from "@/store/Auth.store";
import { useGridControlStore } from "@/store/useGridControl.store";
import { moduleRegistry, type ModuleDefinition } from "@/shell/moduleRegistry";
import type { ActivityBarView } from "@/utils/constants";

// ─── Per-module button (own component so hooks inside useBadge work) ─────────

function ModuleButton({ module, isActive, horizontal, onClick }: {
    module: ModuleDefinition;
    isActive: boolean;
    horizontal: boolean;
    onClick: () => void;
}) {
    const badge = module.useBadge?.() ?? 0;
    const Icon = module.icon;

    return (
        <TooltipProvider>
            <Tooltip>
                <TooltipTrigger asChild>
                    <button
                        onClick={onClick}
                        className={`relative w-12 h-12 rounded-none transition-colors border-transparent ${
                            isActive
                                ? "text-editor-white border-editor-active"
                                : "cursor-pointer text-[#6a6a6a] hover:text-white hover:bg-transparent"
                        }`}
                    >
                        <Icon className="w-6 h-6 mx-auto" />
                        {badge > 0 && (
                            <span className="absolute top-1.5 right-1 min-w-[16px] h-4 flex items-center justify-center rounded-full bg-blue-600 text-white text-[9px] font-bold px-1 leading-none">
                                {badge > 99 ? "99+" : badge}
                            </span>
                        )}
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
}

export function ActivityBar({ horizontal }: ActivityBarProps) {
    const { setAccountsOpen, setSettingsOpen } = useActivityBarStore();
    const { handleActivityClick } = useActivityBarHelper();
    const { isAuthenticated } = useAuthStore();
    const { moduleName } = useGridControlStore();

    // Only show modules that have a defined sidebar view (i.e. intended for ActivityBar)
    // note and ws are registered but hidden by default (no activityBar flag)
    const visibleModules = moduleRegistry.getAll().filter(
        (m) => m.id !== "Note" && m.id !== "Ws"
    );

    const accountButton = (
        <TooltipProvider>
            <Tooltip>
                <TooltipTrigger asChild>
                    <button
                        onClick={() => setAccountsOpen(true)}
                        className={`w-12 h-12 rounded-none hover:text-white hover:bg-transparent transition-colors ${
                            isAuthenticated ? "text-[#6a6a6a]" : "text-red-500"
                        }`}
                    >
                        <UserCircle className="w-6 h-6 mx-auto" />
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
                        className="w-12 h-12 rounded-none text-[#6a6a6a] hover:text-white hover:bg-transparent transition-colors"
                    >
                        <Settings className="w-6 h-6 mx-auto" />
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
                <div className="pb-1">{accountButton}</div>
                <div className="pb-1">{settingsButton}</div>
            </div>
            <AccountsDialog />
            <SettingsDialog />
        </>
    );
}
