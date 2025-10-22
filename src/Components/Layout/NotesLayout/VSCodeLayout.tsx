import { Box } from '@mui/material'
import { useState } from 'react'
import { Panel, PanelGroup } from 'react-resizable-panels'
import { ActivityBar, type ActivityBarView } from '../VSCodeLayout/ActivityBar'
import { VSCodeResizeHandle } from '../VSCodeLayout/VSCodeResizeHandle'
import { VSSideBar } from './VSSideBar'
import { VSEditorArea } from './VSEditorArea'
import { VSPanel } from './VSPanel'
import { StatusBar } from '../VSCodeLayout/StatusBar'

interface VSCodeLayoutProps {
  className?: string
}

/**
 * VSCodeLayout - VS Code style layout with resizable panels
 * 
 * Layout structure:
 * - ActivityBar (left, fixed 48px): View selector (Explorer/Tags/Notes)
 * - SideBar (resizable 5-40%): TagTree for Explorer/Tags views, Notes list for Notes view
 * - EditorArea (resizable): NoteGrid (main notes list)
 *   - Future: Will use react-mosaic for multi-editor drag & drop support
 * - Panel (bottom, resizable 5-60%): NoteDetail and Properties tabs
 * - StatusBar (bottom, fixed): Application status information
 * 
 * Resize features:
 * - Horizontal: SideBar width (Ctrl+B to toggle)
 * - Vertical: Panel height (Ctrl+J to toggle)
 * - Auto-save: Panel sizes persist across sessions
 * - Collapsible: Both SideBar and Panel can collapse to 0%
 * - Re-expandable: Drag resize handle to restore collapsed panels (like VSCode)
 * - Minimum size: 5% before collapse triggers
 * 
 * Future enhancements:
 * - EditorArea will use react-mosaic for drag & drop multi-note editing
 * - Support split view, tab management, and editor groups
 */
export function VSCodeLayout({ className }: VSCodeLayoutProps) {
  // View state - Explorer, Tags, Notes
  const [activeView, setActiveView] = useState<ActivityBarView>('explorer')
  const [isSideBarVisible, setIsSideBarVisible] = useState(true)
  const [isPanelVisible, setIsPanelVisible] = useState(true)

  // Handle activity bar view changes
  const handleViewChange = (view: ActivityBarView) => {
    if (activeView === view) {
      // Toggle sidebar if clicking the same view
      setIsSideBarVisible(!isSideBarVisible)
    } else {
      setActiveView(view)
      setIsSideBarVisible(true)
    }
  }

  return (
    <Box
      className={className}
      sx={{
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        backgroundColor: 'rgb(30, 30, 30)',
        color: '#cccccc',
        overflow: 'hidden',
      }}
    >
      {/* Main content area with resizable panels */}
      <Box sx={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
        {/* Activity Bar - Fixed width, no resize */}
        <ActivityBar 
          activeView={activeView} 
          onViewChange={handleViewChange}
        />

        {/* Horizontal PanelGroup: SideBar | Editor+Panel */}
        <PanelGroup 
          direction="horizontal"
          autoSaveId="notes-layout-horizontal"
          style={{ flex: 1 }}
        >
          {/* Side Bar - Always rendered to allow resize handle interaction */}
          <VSSideBar
            activeView={activeView}
            isVisible={isSideBarVisible}
            onClose={() => setIsSideBarVisible(false)}
            onCollapse={() => setIsSideBarVisible(false)}
            onExpand={() => setIsSideBarVisible(true)}
          />

          {/* Resize handle - Always visible to allow re-expanding */}
          <VSCodeResizeHandle direction="horizontal" id="sidebar-resize" />

          {/* Main content: Editor + Panel (Vertical split) */}
          <Panel id="main-content" minSize={50}>
            <PanelGroup 
              direction="vertical"
              autoSaveId="notes-layout-vertical"
            >
              {/* Editor Area - NoteGrid (Future: react-mosaic) */}
              <Panel 
                id="editor-area"
                defaultSize={70}
                minSize={30}
              >
                <VSEditorArea />
              </Panel>

              {/* Resize handle between editor and panel */}
              <VSCodeResizeHandle direction="vertical" id="panel-resize" />

              {/* Bottom Panel - NoteDetail and Properties */}
              <VSPanel 
                isVisible={isPanelVisible} 
                onClose={() => setIsPanelVisible(false)}
                onCollapse={() => setIsPanelVisible(false)}
                onExpand={() => setIsPanelVisible(true)}
              />
            </PanelGroup>
          </Panel>
        </PanelGroup>
      </Box>

      {/* Status Bar - Fixed height, no resize */}
      <StatusBar />
    </Box>
  )
}

/**
 * Keyboard shortcuts for VSCodeLayout
 * 
 * Layout controls:
 * - Ctrl+B: Toggle sidebar (collapse/expand)
 * - Ctrl+J: Toggle panel (collapse/expand)
 * 
 * View switching:
 * - Ctrl+Shift+E: Show Explorer view
 * - Ctrl+Shift+T: Show Tags view (future)
 * - Ctrl+Shift+N: Show Notes view (future)
 * 
 * Panel resizing:
 * - Drag resize handles to adjust panel sizes
 * - Double-click resize handle to reset to default size
 * - Panel sizes auto-save and persist across sessions
 * 
 * @param setIsSideBarVisible - Function to toggle sidebar visibility
 * @param setIsPanelVisible - Function to toggle panel visibility
 * @param setActiveView - Function to switch between views
 */
export function useNotesKeyboardShortcuts(
  setIsSideBarVisible: (visible: boolean) => void,
  setIsPanelVisible: (visible: boolean) => void,
  setActiveView: (view: ActivityBarView) => void
) {
  // TODO: Implement keyboard shortcuts
  // Will be implemented in future phase
}
