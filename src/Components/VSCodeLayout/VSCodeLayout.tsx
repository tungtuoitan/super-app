import { useState } from 'react'
import { Panel, PanelGroup } from 'react-resizable-panels'
import { ActivityBar } from './ActivityBar'
import { VSCodeResizeHandle } from './VSCodeResizeHandle'
import { VSSideBar } from './VSSideBar'
import { VSPanel } from './VSPanel'
import { StatusBar } from './StatusBar' 
import {VSEditorArea} from './VSEditorArea'
import { useNavigationStore } from '@/contexts/NavigationContext'
import { useActivityBarStore } from '@/store/index'

interface VSCodeLayoutProps {
  className?: string
}

/**
 * VSCodeLayout - VS Code style layout with resizable panels
 * 
 * Layout structure:
 * - ActivityBar (left, fixed 48px): View selector (Explorer/Workspace/Notes)
 * - SideBar (resizable 5-40%): FolderTree for Explorer/Workspace views, Notes list for Notes view
 * - EditorArea (resizable): NoteGrid (main notes list)
 *   - Future: Will use react-mosaic for multi-editor drag & drop support
 * - Panel (bottom, resizable 5-60%): NoteDetail and Properties tabs
 * - StatusBar (bottom, fixed): Application status information
 * 
 * Navigation:
 * - Routes: /explorer, /workspace, /notes
 * - URL-first: Browser back/forward work automatically
 * - ActiveView synced with URL via NavigationContext
 * 
 * Resize features:
 * - Horizontal: SideBar width (Ctrl+B to toggle)
 * - Vertical: Panel height (Ctrl+J to toggle)
 * - Auto-save: Panel sizes persist across sessions
 * - Collapsible: Both SideBar and Panel can collapse to 0%
 * - Re-expandable: Drag resize handle to restore collapsed panels (like VSCode)
 * - Minimum size: 5% before collapse triggers
 * 
 * ✨ MIGRATION STATUS: MUI → shadcn/ui + Tailwind
 * - Main layout: ✅ Migrated to Tailwind
 * - Sub-components: ⏳ Still using MUI (will migrate incrementally)
 */
export function VSCodeLayout({ className }: VSCodeLayoutProps) {
  const { activeView } = useNavigationStore()
  const { isSideBarVisible, setIsSideBarVisible, isPanelVisible, setIsPanelVisible } = useActivityBarStore()

  return (
    <div
      className={`w-full h-full flex flex-col overflow-hidden ${className || ''}`}
      style={{ 
        backgroundColor: 'rgb(30, 30, 30)',
        color: '#cccccc' 
      }}
    >
      {/* Main content area with resizable panels */}
      <div className="flex-1 flex overflow-hidden">
        {/* Activity Bar - Fixed width, no resize */}
        <ActivityBar />

        {/* Horizontal PanelGroup: SideBar | Editor+Panel */}
        <PanelGroup 
          direction="horizontal"
          autoSaveId="notes-layout-horizontal"
          className="flex-1"
        >
          {/* Side Bar - Always rendered to allow resize handle interaction */}
          <VSSideBar
            activeView={activeView}
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
                onClose={() => setIsPanelVisible(false)}
              />
            </PanelGroup>
          </Panel>
        </PanelGroup>
      </div>

      {/* Status Bar - Fixed height, no resize */}
      <StatusBar />
    </div>
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
 * - Ctrl+Shift+T: Show Workspace view
 * - Ctrl+Shift+N: Show Notes view
 * 
 * Panel resizing:
 * - Drag resize handles to adjust panel sizes
 * - Double-click resize handle to reset to default size
 * - Panel sizes auto-save and persist across sessions
 */
