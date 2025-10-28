import React from 'react'
import { X } from 'lucide-react'
import { useEditorTabs, NoteEditorPanel, ConfirmCloseDialog } from '@/features/editor'
import { useNoteUI } from '@/features/notes'

/**
 * VSEditorArea - Main editor area for note content
 * 
 * Content:
 * - Note detail view when a note is selected
 * - Welcome/empty state when no note is selected
 */
export function VSEditorArea() {
  const { openTabs, activeTabId, setActiveTab, closeTab, confirmCloseTabId, setConfirmCloseTabId, getTabById } = useEditorTabs()
  const { selectedNote, setSelectedNote } = useNoteUI()

  const handleCloseTab = (event: React.MouseEvent, tabId: string) => {
    event.stopPropagation()
    closeTab(tabId)
  }

  const handleConfirmClose = () => {
    if (confirmCloseTabId) {
      closeTab(confirmCloseTabId, true) // Force close
      setConfirmCloseTabId(null)
    }
  }

  const handleCancelClose = () => {
    setConfirmCloseTabId(null)
  }

  // Get active tab
  const activeTab = activeTabId ? getTabById(activeTabId) : null

  // Sync selectedNote when active tab changes
  React.useEffect(() => {
    if (activeTab?.type === 'note') {
      setSelectedNote(activeTab.note)
    } else {
      setSelectedNote(null)
    }
  }, [activeTab, setSelectedNote])

  return (
    <div className="w-full h-full bg-editor-bg flex flex-col overflow-hidden">
      {/* Tab bar */}
      <div className="h-[35px] flex items-center border-b border-editor-border bg-editor-sidebar overflow-hidden">
        {openTabs.length > 0 ? (
          <div className="flex-1 flex items-center overflow-x-auto">
            {openTabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`
                  min-h-[35px] h-[35px] px-3 flex items-center gap-2
                  border-r border-editor-border min-w-max
                  ${activeTabId === tab.id
                    ? 'bg-editor-bg text-editor-fg'
                    : 'bg-transparent text-muted-foreground hover:bg-editor-hover'
                  }
                `}
              >
                <span className={`text-[13px] ${activeTabId === tab.id ? 'font-medium' : 'font-normal'}`}>
                  {tab.title}
                  {tab.hasUnsavedChanges && ' ●'}
                </span>
                <button
                  onClick={(e) => handleCloseTab(e, tab.id)}
                  className="p-0.5 hover:bg-editor-hover rounded"
                >
                  <X className="w-4 h-4" />
                </button>
              </button>
            ))}
          </div>
        ) : (
          <div className="px-4 w-full">
            <p className="text-[13px] text-muted-foreground/70 italic">
              No tabs open
            </p>
          </div>
        )}
      </div>

      {/* Main content area */}
      <div className="flex-1 overflow-hidden flex">
        {activeTab ? (
          // Render appropriate editor based on tab type
          <>
            {activeTab.type === 'note' && <NoteEditorPanel tab={activeTab} />}
            {activeTab.type === 'tag' && (
              <div className="flex-1 flex items-center justify-center text-muted-foreground/70">
                <p className="text-base">Tag editor coming soon...</p>
              </div>
            )}
          </>
        ) : (
          // Welcome/empty state
          <div className="flex-1 flex items-center justify-center text-muted-foreground/70">
            <div className="text-center">
              <h2 className="text-xl font-semibold mb-1">
                Welcome to Notes
              </h2>
              <p className="text-sm">
                Select a note from the sidebar to view its details
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Confirm close dialog */}
      <ConfirmCloseDialog
        open={!!confirmCloseTabId}
        tabTitle={confirmCloseTabId ? (getTabById(confirmCloseTabId)?.title || '') : ''}
        onConfirm={handleConfirmClose}
        onCancel={handleCancelClose}
      />
    </div>
  )
}
