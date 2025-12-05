import { useState } from 'react'
import { Folder, FileText, Settings, Boxes } from 'lucide-react'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/Components/ui/tooltip'
import {SettingsDialog} from './SettingsDialog'

export type ActivityBarView = 'explorer' | 'workspace' | 'note'

interface ActivityBarProps {
  activeView: ActivityBarView
  onViewChange: (view: ActivityBarView) => void
}

const activities = [
  { id: 'explorer' as const, icon: Folder, label: 'Explorer' },
  { id: 'workspace' as const, icon: Boxes, label: 'Workspace' },
  { id: 'note' as const, icon: FileText, label: 'Note' },
]

export function ActivityBar({ activeView, onViewChange }: ActivityBarProps) {
  const [settingsOpen, setSettingsOpen] = useState(false)

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
                      onClick={isActive ? undefined : () => onViewChange(activity.id)}
                      disabled={isActive}
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
