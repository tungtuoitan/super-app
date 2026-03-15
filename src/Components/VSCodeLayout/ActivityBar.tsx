import { Folder, FileText, Settings, Boxes, UserCircle, Cuboid, Feather, Footprints, AudioWaveform, Spline, RulerDimensionLine, Ruler, Clover, Shell, BookIcon, LibraryBig } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/Components/ui/tooltip";
import { SettingsDialog } from "./SettingsDialog";
import { AccountsDialog } from "./AccountsDialog";
import { constants } from "@/utils/constants";
import { useActivityBarStore } from "@/store/index";
import { useActivityBarHelper } from "@/hooks/useActivityBar.helper";
import { useAuthStore } from "@/store/auth/Auth.store";
import {useGridControlStore} from "@/store/grid/useGridControl.store";

const activityModules = [
    { id: constants.modules.ws, icon: Boxes, label: constants.vscode.displayNames.ws },
    { id: constants.modules.workspace, icon: Folder, label: constants.vscode.displayNames.workspace },
    { id: constants.modules.k, icon: LibraryBig, label: constants.vscode.displayNames.k },
    // { id: constants.modules.note, icon: FileText, label: constants.vscode.displayNames.notes },
    { id: constants.modules.project, icon: Cuboid, label: constants.vscode.displayNames.project },
    { id: constants.modules.lifeLog, icon: Shell, label: constants.vscode.displayNames.lifeLog },
];

interface ActivityBarProps {
    horizontal?: boolean;
}

export function ActivityBar({ horizontal }: ActivityBarProps) {
    const { setAccountsOpen, setSettingsOpen } = useActivityBarStore();
    const { handleActivityClick } = useActivityBarHelper();
    const { isAuthenticated } = useAuthStore();
    const { moduleName } = useGridControlStore();

    if (horizontal) {
        return (
            <>
                <div className="w-full h-12 bg-editor-activitybar flex flex-row items-center border-b border-editor-border px-1">
                    {/* Activity icons */}
                    <div className="flex flex-row flex-1">
                        <TooltipProvider>
                            {activityModules.map((activity) => {
                                const Icon = activity.icon;
                                const isActive = moduleName === activity.id;

                                return (
                                    <button
                                        key={activity.id}
                                        onClick={() => handleActivityClick(activity.id)}
                                        className={`w-12 h-12 rounded-none transition-colors border-transparent ${
                                            isActive ? "text-editor-white border-editor-active" : "cursor-pointer text-[#6a6a6a] hover:text-white hover:bg-transparent"
                                        }`}
                                    >
                                        <Icon className="w-6 h-6 mx-auto" />
                                    </button>
                                );
                            })}
                        </TooltipProvider>
                    </div>

                    {/* Accounts + Settings on the right */}
                    <div className="flex flex-row">
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
                                <TooltipContent side="bottom">
                                    <p>Accounts</p>
                                </TooltipContent>
                            </Tooltip>
                        </TooltipProvider>
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
                                <TooltipContent side="bottom">
                                    <p>Settings</p>
                                </TooltipContent>
                            </Tooltip>
                        </TooltipProvider>
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
                {/* Activity icons */}
                <div className="flex-1">
                    <TooltipProvider>
                        {activityModules.map((activity) => {
                            const Icon = activity.icon;
                            const isActive = moduleName === activity.id;

                            return (
                                <button
                                    key={activity.id}
                                    onClick={() => handleActivityClick(activity.id)}
                                    className={`w-12 h-12 rounded-none transition-colors border-transparent ${
                                        isActive ? "text-editor-white border-editor-active": "cursor-pointer text-[#6a6a6a] hover:text-white hover:bg-transparent"
                                    }`}
                                >
                                    <Icon className="w-6 h-6 mx-auto" />
                                </button>
                            );
                        })}
                    </TooltipProvider>
                </div>

                {/* Accounts at bottom */}
                <div className="pb-1">
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
                            <TooltipContent side="right">
                                <p>Accounts</p>
                            </TooltipContent>
                        </Tooltip>
                    </TooltipProvider>
                </div>

                {/* Settings at bottom */}
                <div className="pb-1">
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
                            <TooltipContent side="right">
                                <p>Settings</p>
                            </TooltipContent>
                        </Tooltip>
                    </TooltipProvider>
                </div>
            </div>

            {/* Accounts Dialog */}
            <AccountsDialog />

            {/* Settings Dialog */}
            <SettingsDialog />
        </>
    );
}
