import { Folder, FileText, Settings, Boxes, UserCircle } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/Components/ui/tooltip";
import { SettingsDialog } from "./SettingsDialog";
import { AccountsDialog } from "./AccountsDialog";
import { constants } from "@/utils/constants";
import { useActivityBarStore, useEditorTabsStore, useWorkspaceStore } from "@/store/index";
import { useActivityBarHelper } from "@/hooks/useActivityBar.helper";
import { useAuthStore } from "@/store/auth/Auth.store";
import { useNavigationStore } from "@/contexts/NavigationContext";
import { UnsavedTabsTooltip } from "./UnsavedTabsTooltip";
import {hasNewTabsInCurrentWorkspace} from "@/hooks/vsCode/useNewTabs.helper";
import {useGridControlStore} from "@/store/grid/useGridControl.store";

const activityModules = [
    { id: constants.vscode.viewTypes.ws, icon: Boxes, label: constants.vscode.displayNames.ws },
    { id: constants.vscode.viewTypes.workspace, icon: Folder, label: constants.vscode.displayNames.workspace },
    { id: constants.vscode.viewTypes.note, icon: FileText, label: constants.vscode.displayNames.notes },
];

export function ActivityBar() {
    const { setAccountsOpen, setSettingsOpen } = useActivityBarStore();
    const { handleActivityClick } = useActivityBarHelper();
    const { activeView } = useNavigationStore();
    const { isAuthenticated } = useAuthStore();
    const { openTabs } = useEditorTabsStore();
    const { moduleName } = useGridControlStore();
    const _hasNewTab = hasNewTabsInCurrentWorkspace(openTabs, moduleName);

    return (
        <>
            <div className="w-12 h-full bg-editor-activitybar flex flex-col items-center border-r border-editor-border">
                {/* Activity icons */}
                <div className="flex-1">
                    <TooltipProvider>
                        {activityModules.map((activity) => {
                            const Icon = activity.icon;
                            const isActive = activeView === activity.id;

                            return (
                                <UnsavedTabsTooltip 
                                    key={activity.id} 
                                    side="right" 
                                    actionText="Cannot switch module"
                                    normalLabel={activity.label}
                                >
                                    <button
                                        onClick={_hasNewTab ? undefined : () => handleActivityClick(activity.id)}
                                        disabled={_hasNewTab}
                                        className={`w-12 h-12 rounded-none transition-colors border-transparent ${
                                            isActive ? "text-editor-white border-editor-active" : _hasNewTab ? "text-[#6a6a6a]" : "cursor-pointer text-[#6a6a6a] hover:text-white hover:bg-transparent"
                                        }`}
                                    >
                                        <Icon className="w-6 h-6 mx-auto" />
                                    </button>
                                </UnsavedTabsTooltip>
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
