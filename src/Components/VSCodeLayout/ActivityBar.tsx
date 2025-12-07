import { useState } from 'react'
import { Folder, FileText, Settings, Boxes } from 'lucide-react'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/Components/ui/tooltip'
import {SettingsDialog} from './SettingsDialog'
import { useNavigationStore } from '@/contexts/NavigationContext'
import type { ActivityBarView } from '@/config/routes'

interface ActivityBarProps {
  isSideBarVisible: boolean
  onToggleSideBar: () => void
}

const activities = [
  { id: 'workspaceList' as const, icon: Boxes, label: 'WorkspaceList' },
  { id: 'workspace' as const, icon: Folder, label: 'Workspace' },
  { id: 'note' as const, icon: FileText, label: 'Notes' },
]

export function ActivityBar({ isSideBarVisible, onToggleSideBar }: ActivityBarProps) {
  const [settingsOpen, setSettingsOpen] = useState(false)
  const { activeView, navigateToView } = useNavigationStore()

  const handleActivityClick = (view: ActivityBarView) => {
    // Do nothing if clicking the already active view
    if (activeView === view) {
      return
    }
    
    // Navigate to different view
    navigateToView(view)
    // Ensure sidebar is visible when switching views
    if (!isSideBarVisible) {
      onToggleSideBar()
    }
  }

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

      {/* Settings Dialog */}
      <SettingsDialog open={settingsOpen} onOpenChange={setSettingsOpen} />
    </>
  )
}
