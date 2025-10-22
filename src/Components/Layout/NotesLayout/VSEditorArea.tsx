import { Box, Typography } from '@mui/material'
import { NoteGridPanel } from '../NoteGridPanel'
import { useNoteUI } from '@/features/notes'

/**
 * VSEditorArea - Main editor area displaying content
 * 
 * Content:
 * - NoteGrid: Main notes list with data grid
 * - Future: May add tabs for multiple note views
 */
export function VSEditorArea() {
  const { setSelectedNote } = useNoteUI()

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
      {/* Simple header - can be enhanced with tabs later */}
      <Box
        sx={{
          height: '35px',
          display: 'flex',
          alignItems: 'center',
          padding: '0 16px',
          borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
          backgroundColor: 'rgb(37, 37, 38)',
        }}
      >
        <Typography
          variant="body2"
          sx={{
            fontSize: '13px',
            color: '#cccccc',
            fontWeight: 500,
          }}
        >
          Notes
        </Typography>
      </Box>

      {/* Main content - NoteGrid */}
      <Box sx={{ flex: 1, overflow: 'hidden' }}>
        <NoteGridPanel onNoteClick={setSelectedNote} />
      </Box>
    </Box>
  )
}
