import { Box } from '@mui/material'
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
        <Box
          sx={{
            height: '100%',
            backgroundColor: 'rgb(37, 37, 38)',
            borderRight: '1px solid rgba(255, 255, 255, 0.1)',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
          }}
        >
        {/* Header */}
        <Box
          sx={{
            height: '35px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '0 12px',
            borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
            fontSize: '11px',
            fontWeight: 600,
            textTransform: 'uppercase',
            color: 'rgba(255, 255, 255, 0.6)',
          }}
        >
          <span>{getViewTitle(activeView)}</span>
        </Box>

        {/* Content */}
        <Box sx={{ flex: 1, overflow: 'auto' }}>
          {activeView === 'explorer' && <ExplorerView />}
          {activeView === 'tags' && <TagsView />}
          {activeView === 'notes' && <NotesView />}
        </Box>
      </Box>
      )}
    </Panel>
  )
}

/**
 * Explorer View - WorkspaceTree for tag navigation
 */
function ExplorerView() {
  return (
    <Box sx={{ height: '100%', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
      {/* Using workspace tag tree API with workspaceId=1 */}
      <WorkspaceTree workspaceId={1} includeShared={true} />
    </Box>
  )
}

/**
 * Tags View - Tag management interface
 */
function TagsView() {
  return (
    <Box sx={{ height: '100%', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
    </Box>
  )
}

/**
 * Notes View - Notes list interface with grid
 */
function NotesView() {
  const { openNoteTab } = useEditorTabs()

  const handleNoteClick = (note: Note) => {
    console.log('🎯 VSSideBar - Note clicked:', note)
    openNoteTab(note)
  }

  return (
    <Box sx={{
      height: '100%',
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden'
    }}>
      {/* NoteGrid takes full height */}
      <NoteGridPanel onNoteClick={handleNoteClick} />
    </Box>
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
