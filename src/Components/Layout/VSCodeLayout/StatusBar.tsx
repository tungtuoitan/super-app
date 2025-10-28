import { GitBranch, AlertCircle, AlertTriangle, Bell } from 'lucide-react'

export function StatusBar() {
  return (
    <div className="h-[22px] bg-editor-active text-white flex items-center justify-between px-2 text-xs border-t border-black/20">
      {/* Left side */}
      <div className="flex items-center gap-4">
        {/* Git branch */}
        <div className="flex items-center gap-1 cursor-pointer px-1 hover:bg-black/20 transition-colors">
          <GitBranch className="w-3.5 h-3.5" />
          <span>master-dev</span>
        </div>

        {/* Sync status */}
        <div className="flex items-center gap-1 cursor-pointer px-1 hover:bg-black/20 transition-colors">
          <span>↓0</span>
          <span>↑0</span>
        </div>

        {/* Errors and warnings */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1">
            <AlertCircle className="w-3.5 h-3.5" />
            <span>1</span>
          </div>
          <div className="flex items-center gap-1">
            <AlertTriangle className="w-3.5 h-3.5" />
            <span>1</span>
          </div>
        </div>
      </div>

      {/* Right side */}
      <div className="flex items-center gap-4">
        {/* Line/Column */}
        <div className="cursor-pointer px-1 hover:bg-black/20 transition-colors">
          Ln 45, Col 12
        </div>

        {/* Spaces */}
        <div className="cursor-pointer px-1 hover:bg-black/20 transition-colors">
          Spaces: 2
        </div>

        {/* Encoding */}
        <div className="cursor-pointer px-1 hover:bg-black/20 transition-colors">
          UTF-8
        </div>

        {/* Line ending */}
        <div className="cursor-pointer px-1 hover:bg-black/20 transition-colors">
          CRLF
        </div>

        {/* Language */}
        <div className="cursor-pointer px-1 hover:bg-black/20 transition-colors">
          TypeScript React
        </div>

        {/* Notifications */}
        <div className="cursor-pointer px-1 flex items-center hover:bg-black/20 transition-colors">
          <Bell className="w-3.5 h-3.5" />
        </div>
      </div>
    </div>
  )
}
