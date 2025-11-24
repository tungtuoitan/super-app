import { useState } from 'react'
import { Folder, Tag, FileText, Settings } from 'lucide-react'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/Components/ui/tooltip'
import { SettingsDialog } from '@/Components/Dialogs/SettingsDialog'

export type ActivityBarView = 'explorer' | 'tags' | 'notes'

interface ActivityBarProps {
  activeView: ActivityBarView
  onViewChange: (view: ActivityBarView) => void
}

const activities = [
  { id: 'explorer' as const, icon: Folder, label: 'Explorer', shortcut: 'Ctrl+Shift+E' },
  { id: 'tags' as const, icon: Tag, label: 'Tags', shortcut: 'Ctrl+Shift+T' },
  { id: 'notes' as const, icon: FileText, label: 'Notes', shortcut: 'Ctrl+Shift+N' },
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
                      className={`w-12 h-12 rounded-none transition-colors border-transparent ${
                        isActive
                          ? 'text-editor-white border-editor-active cursor-default'
                          : 'text-muted-foreground hover:text-editor-white hover:bg-transparent cursor-pointer'
                      }`}
                    >
                      <Icon className="w-6 h-6 mx-auto" />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="right">
                    <p>{activity.label} ({activity.shortcut})</p>
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
                  className="w-12 h-12 rounded-none text-muted-foreground hover:text-editor-white hover:bg-transparent transition-colors"
                >
                  <Settings className="w-6 h-6 mx-auto" />
                </button>
              </TooltipTrigger>
              <TooltipContent side="right">
                <p>Settings (Ctrl+,)</p>
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
