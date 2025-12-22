import { Panel, PanelGroup } from 'react-resizable-panels'
import type { ActivityBarView } from '@/config/routes'
import { NoteGrid } from '../notes_temp/NoteGrid'
import {VSCodeResizeHandle} from '@/Components/VSCodeLayout/VSCodeResizeHandle'
import { WorkspaceView } from './WorkspaceView'
import { WorkspaceListView } from './WorkspaceListView'
import { GridControlBar } from '@/Components/shared/GridControlBar'
import { GridControlProvider } from '@/store/grid/useGridControl.store'
import { constants } from '@/utils/constants'

interface VSSideBarProps {
  activeView: ActivityBarView
  isVisible: boolean
  onCollapse?: () => void  
  onExpand?: () => void
}

/**
 * VSSideBar - Sidebar content for VS Code style layout
 * 
 * Now wraps itself in a Panel for direct integration with PanelGroup.
 * This allows the sidebar and main content to be siblings in the panel hierarchy.
 * 
 * Views:
 * - Explorer: WorkspaceTree component for workspace navigation
 * - Workspace: Workspace management (currently same as Explorer)
 * - Notes: Notes list interface with search
 * 
 * Collapse behavior:
 * - When collapsed, panel size goes to 0 but resize handle remains visible
 * - User can drag the resize handle to expand the panel again (like VSCode)
 */
export function VSSideBar({ activeView, isVisible, onCollapse, onExpand }: VSSideBarProps) {
  return (
    <Panel
      id="sidebar"
      defaultSize={20}
      minSize={5}
      maxSize={40}
      collapsible
      collapsedSize={0}
      onCollapse={onCollapse}
      onExpand={onExpand}
    >
      {/* Only render inner panels when visible to avoid mounting when hidden */}
      {isVisible && (
        <GridControlProvider>
          {/* Use a vertical PanelGroup to split the sidebar into two stacked panels */}
          <PanelGroup direction="vertical" className="h-full">
            {/* Top panel: original sidebar content */}
            <Panel defaultSize={70} minSize={20}>
              <div className="h-full bg-editor-sidebar border-r border-editor-border flex flex-col overflow-hidden">
                {/* Header */}
                <div className="h-[35px] flex items-center justify-between px-3 border-b border-editor-border text-[11px] font-semibold uppercase text-muted-foreground flex-shrink-0">
                  <span>{getViewTitle(activeView)}</span>
                  <GridControlBar />
                </div>

                {/* Content */}
                <div className="flex-1 overflow-hidden">
                  {activeView === 'workspaceList' && <WorkspaceListView />}
                  {activeView === constants.viewTypes.workspace && <WorkspaceView />}
                  {activeView === constants.viewTypes.note && <NotesView />}
                </div>
              </div>
            </Panel>

          <VSCodeResizeHandle direction="vertical" id="panel2-resize" />

          {/* Bottom panel: secondary area (e.g., quick actions, details) */}
          <Panel defaultSize={30} minSize={5} collapsible collapsedSize={0}>
            {/* Mirror VSEditorArea structure but leave content empty */}
            <div className="w-full h-full bg-editor-bg flex flex-col overflow-hidden border-1 border-red-0">
              {/* Tab bar style header */}
              <div className="h-[35px] flex items-center border-b border-editor-border bg-editor-sidebar overflow-hidden px-3">
                <div className="text-[13px] text-muted-foreground">Secondary</div>
              </div>

              {/* Main content area (intentionally empty) */}
              <div className="flex-1 overflow-hidden flex">
                {/* Intentionally left blank - secondary panel content goes here */}
              </div>
            </div>
          </Panel>
        </PanelGroup>
        </GridControlProvider>
      )}
    </Panel>
  )
}

/**
 * Notes View - Notes list interface with grid
 * Shows full note grid with all columns
 */
function NotesView() {
  return (
    <div className="h-full flex flex-col overflow-hidden">
      <NoteGrid />
    </div>
  )
}

/**
 * Get view title for header
 */
function getViewTitle(view: ActivityBarView): string {
  switch (view) {
    case constants.viewTypes.workspace:
      return constants.displayNames.workspace
    case constants.viewTypes.workspaceList:
      return 'WorkspaceList'
    case constants.viewTypes.note:
      return constants.displayNames.notes
    default:
      return 'View'
  }
}
