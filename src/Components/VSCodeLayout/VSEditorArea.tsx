import React, {useEffect} from 'react'
import { X } from 'lucide-react'
import { useEditorTabsStore, NoteEditorPanel, ConfirmCloseDialog } from '@/Components/Editor'
import {useEditorTabHelper} from '@/hooks/useEditorTabHelper'
import {useNoteUIStore} from '@/store/note/useNoteUIStore'
import { WsEditorPanel } from '@/Components/Workspace'

/**
 * VSEditorArea - Main editor area for note content
 * 
 * Content: 
 * - Note detail view when a note is selected
 * - Welcome/empty state when no note is selected
 */
export function VSEditorArea() {
  const { openTabs, activeTabId, confirmCloseTabId, setConfirmCloseTabId } = useEditorTabsStore()
  const { closeTab, getTabById, handleSetActiveTab } = useEditorTabHelper()
  const { selectedNote, setSelectedNote } = useNoteUIStore()

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


  return (
    <div className="w-full h-full bg-editor-bg flex flex-col overflow-hidden">
      {/* Tab bar */}
      <div className="min-h-[35px] flex items-start border-b border-editor-border bg-editor-sidebar">
        {openTabs.length > 0 ? (
          <div className="flex-1 flex flex-wrap">
            {openTabs.map((tab) => {
              const isDeleted = tab.type === 'note' && tab.isDeleted;
              return (
                <button
                  key={tab.id}
                  onClick={() => handleSetActiveTab(tab.id)}
                  className={`
                    h-[35px] px-3 flex items-center gap-2
                    border-r border-b border-editor-border
                    ${activeTabId === tab.id
                      ? 'bg-editor-bg text-editor-fg border-b-transparent border-t-2 border-t-blue-500'
                      : 'bg-transparent text-muted-foreground hover:bg-editor-hover border-t border-t-transparent'
                    }
                  `}
                >
                  {/* ${activeTabId === tab.id ? 'font-medium' : 'font-normal'} */}
                  <span className={`text-[13px] whitespace-nowrap ${
                    isDeleted ? 'text-red-500 line-through' : ''
                  }`}>
                    {tab.title}
                    {tab.hasUnsavedChanges && ' ●'}
                    {isDeleted && ' [Deleted]'}
                  </span>
                  <button
                    onClick={(e) => handleCloseTab(e, tab.id)}
                    className="p-0.5 hover:bg-editor-hover rounded"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </button>
              );
            })}
          </div>
        ) : (
          <div className="px-4 w-full h-[35px] flex items-center">
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
            {activeTab.type === 'workspace' && <WsEditorPanel tab={activeTab} />}
            {activeTab.type === 'tag' && (
              <div className="flex-1 flex items-center justify-center text-muted-foreground/70">
                <p className="text-base">Folder editor coming soon...</p>
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
