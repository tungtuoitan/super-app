import { Folder, FileText, Settings, Boxes, UserCircle } from 'lucide-react'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/Components/ui/tooltip'
import { SettingsDialog } from './SettingsDialog'
import { AccountsDialog } from './AccountsDialog'
import { constants } from '@/utils/constants'
import { useActivityBarStore } from '@/store/index'
import { useActivityBarHelper } from '@/hooks/useActivityBar.helper'
import { useAuthStore } from '@/store/auth/Auth.store'

const activities = [
  { id: 'workspaceList' as const, icon: Boxes, label: 'WorkspaceList' },
  { id: constants.vscode.viewTypes.workspace, icon: Folder, label: constants.vscode.displayNames.workspace },
  { id: constants.vscode.viewTypes.note, icon: FileText, label: constants.vscode.displayNames.notes },
]

export function ActivityBar() {
  const {
    setAccountsOpen,
    setSettingsOpen,
  } = useActivityBarStore()

  const {
    activeView,
    handleActivityClick,
  } = useActivityBarHelper()

  const { isAuthenticated } = useAuthStore()

  return (
    <>
      <div className="w-12 h-full bg-editor-activitybar flex flex-col items-center border-r border-editor-border">
        {/* Activity icons */}
        <div className="flex-1">
          <TooltipProvider>
            {activities.map((activity) => {
              const Icon = activity.icon
              const isActive = activeView === activity.id

              return (
                <Tooltip key={activity.id}>
                  <TooltipTrigger asChild>
                    <button
                      onClick={() => handleActivityClick(activity.id)}
                      className={`w-12 h-12 rounded-none transition-colors border-transparent cursor-pointer ${
                        isActive
                          ? 'text-editor-white border-editor-active'
                          : 'text-[#6a6a6a] hover:text-white hover:bg-transparent'
                      }`}
                    >
                      <Icon className="w-6 h-6 mx-auto" />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="right">
                    <p>{activity.label}</p>
                  </TooltipContent>
                </Tooltip>
              )
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
                    isAuthenticated ? 'text-[#6a6a6a]' : 'text-red-500'
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
  )
}
