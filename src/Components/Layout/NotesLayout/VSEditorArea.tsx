import React from 'react'
import { Box, Typography, Tabs, Tab, IconButton } from '@mui/material'
import CloseIcon from '@mui/icons-material/Close'
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

  const handleTabChange = (_event: React.SyntheticEvent, newValue: string) => {
    setActiveTab(newValue)
  }

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
    <Box
      sx={{
        width: '100%',
        height: '100%',
        backgroundColor: 'rgb(30, 30, 30)',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}
    >
      {/* Tab bar */}
      <Box
        sx={{
          height: '35px',
          display: 'flex',
          alignItems: 'center',
          borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
          backgroundColor: 'rgb(37, 37, 38)',
          overflow: 'hidden',
        }}
      >
        {openTabs.length > 0 ? (
          <Tabs
            value={activeTabId || false}
            onChange={handleTabChange}
            variant="scrollable"
            scrollButtons="auto"
            sx={{
              minHeight: '35px',
              height: '35px',
              flex: 1,
              '& .MuiTabs-indicator': {
                backgroundColor: '#4FC3F7',
                height: '2px',
              },
              '& .MuiTabs-scrollButtons': {
                color: 'rgba(255, 255, 255, 0.6)',
                '&.Mui-disabled': {
                  opacity: 0.3,
                },
              },
            }}
          >
            {openTabs.map((tab) => (
              <Tab
                key={tab.id}
                value={tab.id}
                label={
                  <Box
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 1,
                      textTransform: 'none',
                    }}
                  >
                    <Typography
                      variant="body2"
                      sx={{
                        fontSize: '13px',
                        fontWeight: activeTabId === tab.id ? 500 : 400,
                      }}
                    >
                      {tab.title}
                      {tab.hasUnsavedChanges && ' ●'}
                    </Typography>
                    <IconButton
                      size="small"
                      onClick={(e) => handleCloseTab(e, tab.id)}
                      sx={{
                        padding: '2px',
                        color: 'inherit',
                        '&:hover': {
                          backgroundColor: 'rgba(255, 255, 255, 0.1)',
                        },
                      }}
                    >
                      <CloseIcon sx={{ fontSize: '16px' }} />
                    </IconButton>
                  </Box>
                }
                sx={{
                  minHeight: '35px',
                  height: '35px',
                  padding: '0 12px',
                  color: activeTabId === tab.id ? '#cccccc' : 'rgba(255, 255, 255, 0.6)',
                  backgroundColor: activeTabId === tab.id ? 'rgb(30, 30, 30)' : 'transparent',
                  borderRight: '1px solid rgba(255, 255, 255, 0.1)',
                  minWidth: 'auto',
                  '&:hover': {
                    backgroundColor: activeTabId === tab.id
                      ? 'rgb(30, 30, 30)'
                      : 'rgba(255, 255, 255, 0.05)',
                  },
                }}
              />
            ))}
          </Tabs>
        ) : (
          <Box sx={{ padding: '0 16px', width: '100%' }}>
            <Typography
              variant="body2"
              sx={{
                fontSize: '13px',
                color: 'rgba(255, 255, 255, 0.4)',
                fontStyle: 'italic',
              }}
            >
              No tabs open
            </Typography>
          </Box>
        )}
      </Box>

      {/* Main content area */}
      <Box sx={{ 
        flex: 1, 
        overflow: 'hidden',
        display: 'flex',
      }}>
        {activeTab ? (
          // Render appropriate editor based on tab type
          <>
            {activeTab.type === 'note' && <NoteEditorPanel tab={activeTab} />}
            {activeTab.type === 'tag' && (
              <Box sx={{ 
                flex: 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'rgba(255, 255, 255, 0.4)',
              }}>
                <Typography variant="body1">Tag editor coming soon...</Typography>
              </Box>
            )}
          </>
        ) : (
          // Welcome/empty state
          <Box sx={{ 
            flex: 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'rgba(255, 255, 255, 0.4)',
          }}>
            <Box sx={{ textAlign: 'center' }}>
              <Typography variant="h5" sx={{ mb: 1, fontWeight: 600 }}>
                Welcome to Notes
              </Typography>
              <Typography variant="body2">
                Select a note from the sidebar to view its details
              </Typography>
            </Box>
          </Box>
        )}
      </Box>

      {/* Confirm close dialog */}
      <ConfirmCloseDialog
        open={!!confirmCloseTabId}
        tabTitle={confirmCloseTabId ? (getTabById(confirmCloseTabId)?.title || '') : ''}
        onConfirm={handleConfirmClose}
        onCancel={handleCancelClose}
      />
    </Box>
  )
}
