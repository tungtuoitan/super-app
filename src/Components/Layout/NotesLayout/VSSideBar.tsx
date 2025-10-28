import { Panel } from 'react-resizable-panels'
import type { ActivityBarView } from '../VSCodeLayout/ActivityBar'
import { WorkspaceTree } from '@/features/tags/components/WorkspaceTree'
import { NoteGridPanel } from '../NoteGridPanel'
import { type Note } from '@/features/notes'
import { useEditorTabs } from '@/features/editor'

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
 * - Tags: Tag management interface with WorkspaceTree
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
      {isVisible && (
        <div className="h-full bg-editor-sidebar border-r border-editor-border flex flex-col overflow-hidden">
        {/* Header */}
        <div className="h-[35px] flex items-center justify-between px-3 border-b border-editor-border text-[11px] font-semibold uppercase text-muted-foreground">
          <span>{getViewTitle(activeView)}</span>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto">
          {activeView === 'explorer' && <ExplorerView />}
          {activeView === 'tags' && <TagsView />}
          {activeView === 'notes' && <NotesView />}
        </div>
      </div>
      )}
    </Panel>
  )
}

/**
 * Explorer View - WorkspaceTree for tag navigation
 */
function ExplorerView() {
  return (
    <div className="h-full overflow-hidden flex flex-col">
      {/* Using workspace tag tree API with workspaceId=1 */}
      <WorkspaceTree workspaceId={1} includeShared={true} />
    </div>
  )
}

/**
 * Tags View - Tag management interface
 */
function TagsView() {
  return (
    <div className="h-full overflow-hidden flex flex-col">
    </div>
  )
}

/**
 * Notes View - Notes list interface with grid
 * Shows compact sidebar view with only name column
 */
function NotesView() {
  const { openNoteTab } = useEditorTabs()

  const handleNoteClick = (note: Note) => {
    console.log('🎯 VSSideBar - Note clicked:', note)
    openNoteTab(note)
  }

  return (
    <div className="h-full flex flex-col overflow-hidden">
      {/* NoteGrid in sidebar mode - only shows name column */}
      <NoteGridPanel onNoteClick={handleNoteClick} sidebarMode={true} />
    </div>
  )
}

/**
 * Get view title for header
 */
function getViewTitle(view: ActivityBarView): string {
  switch (view) {
    case 'explorer':
      return 'Explorer'
    case 'tags':
      return 'Tags'
    case 'notes':
      return 'Notes'
    default:
      return 'View'
  }
}
