import { Box, Typography, Tab, Tabs, IconButton } from '@mui/material'
import {
  Close as CloseIcon,
  Description as DescriptionIcon,
  Settings as SettingsIcon,
} from '@mui/icons-material'
import { useState } from 'react'
import { Panel } from 'react-resizable-panels'
import { useNoteUI } from '@/features/notes'

interface VSPanelProps {
  isVisible: boolean
  onClose: () => void
  onCollapse?: () => void
  onExpand?: () => void
}

type PanelTab = 'noteDetail' | 'properties'

/**
 * VSPanel - Bottom panel for content details
 * 
 * Tabs:
 * - Note Detail: Selected note details and content
 * - Properties: Note properties and metadata
 * 
 * Collapse behavior:
 * - When collapsed, panel size goes to 0 but resize handle remains visible
 * - User can drag the resize handle to expand the panel again (like VSCode)
 */
export function VSPanel({ isVisible, onClose, onCollapse, onExpand }: VSPanelProps) {
  const [activeTab, setActiveTab] = useState<PanelTab>('noteDetail')

  return (
    <Panel 
      id="bottom-panel"
      defaultSize={30}
      minSize={5}
      maxSize={60}
      collapsible
      collapsedSize={0}
      onCollapse={onCollapse}
      onExpand={onExpand}
    >
      {isVisible && (
        <Box
          sx={{
            height: '100%',
            borderTop: '1px solid rgba(255, 255, 255, 0.1)',
            backgroundColor: 'rgb(30, 30, 30)',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
          }}
        >
          {/* Tabs Header */}
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
              height: '35px',
            }}
          >
            <Tabs
              value={activeTab}
              onChange={(_, newValue) => setActiveTab(newValue)}
              sx={{
                minHeight: '35px',
                '& .MuiTab-root': {
                  minHeight: '35px',
                  padding: '0 12px',
                  fontSize: '13px',
                  textTransform: 'none',
                  color: 'rgba(255, 255, 255, 0.6)',
                  minWidth: 'auto',
                  '&.Mui-selected': {
                    color: '#fff',
                  },
                },
                '& .MuiTabs-indicator': {
                  backgroundColor: '#007acc',
                },
              }}
            >
              <Tab
                icon={<DescriptionIcon sx={{ fontSize: 16, mr: 0.5 }} />}
                iconPosition="start"
                label="Note Detail"
                value="noteDetail"
              />
              <Tab
                icon={<SettingsIcon sx={{ fontSize: 16, mr: 0.5 }} />}
                iconPosition="start"
                label="Properties"
                value="properties"
              />
            </Tabs>

            <IconButton
              size="small"
              onClick={onClose}
              sx={{
                mr: 1,
                color: 'rgba(255, 255, 255, 0.6)',
                '&:hover': {
                  backgroundColor: 'rgba(255, 255, 255, 0.1)',
                },
              }}
            >
              <CloseIcon fontSize="small" />
            </IconButton>
          </Box>

          {/* Panel Content */}
          <Box sx={{ flex: 1, overflow: 'auto', padding: '12px' }}>
            {activeTab === 'noteDetail' && <NoteDetailTab />}
            {activeTab === 'properties' && <PropertiesTab />}
          </Box>
        </Box>
      )}
    </Panel>
  )
}

/**
 * Note Detail Tab - Display selected note details
 */
function NoteDetailTab() {
  const { selectedNote } = useNoteUI()

  if (!selectedNote) {
    return (
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          height: '100%',
          color: 'rgba(255, 255, 255, 0.6)',
        }}
      >
        <Typography variant="body2">
          Select a note to view details
        </Typography>
      </Box>
    )
  }

  return (
    <Box>
      <Typography
        variant="h6"
        sx={{
          fontSize: '16px',
          fontWeight: 600,
          mb: 2,
          color: '#fff',
        }}
      >
        {selectedNote.name}
      </Typography>

      <Typography
        variant="body2"
        sx={{
          color: 'rgba(255, 255, 255, 0.8)',
          mb: 2,
          lineHeight: 1.6,
        }}
      >
        {selectedNote.description || 'No description'}
      </Typography>

      <Box sx={{ mt: 3 }}>
        <Typography
          variant="caption"
          sx={{
            display: 'block',
            color: 'rgba(255, 255, 255, 0.6)',
            mb: 0.5,
          }}
        >
          Created: {new Date(selectedNote.createdAt).toLocaleString()}
        </Typography>
        {selectedNote.updatedAt && (
          <Typography
            variant="caption"
            sx={{
              display: 'block',
              color: 'rgba(255, 255, 255, 0.6)',
            }}
          >
            Updated: {new Date(selectedNote.updatedAt).toLocaleString()}
          </Typography>
        )}
      </Box>
    </Box>
  )
}

/**
 * Properties Tab - Display note properties
 */
function PropertiesTab() {
  const { selectedNote } = useNoteUI()

  if (!selectedNote) {
    return (
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          height: '100%',
          color: 'rgba(255, 255, 255, 0.6)',
        }}
      >
        <Typography variant="body2">
          Select a note to view properties
        </Typography>
      </Box>
    )
  }

  return (
    <Box>
      <Typography
        variant="body2"
        sx={{
          fontWeight: 600,
          mb: 2,
          color: '#fff',
        }}
      >
        Note Properties
      </Typography>

      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
        <PropertyRow label="ID" value={selectedNote.noteId.toString()} />
        <PropertyRow label="Name" value={selectedNote.name} />
        <PropertyRow label="Type" value={selectedNote.type || 'N/A'} />
        <PropertyRow label="Archived" value={selectedNote.isArchived ? 'Yes' : 'No'} />
        <PropertyRow label="Created By" value={selectedNote.createdBy || 'Unknown'} />
        <PropertyRow label="Tags" value={selectedNote.tags?.join(', ') || 'No tags'} />
      </Box>
    </Box>
  )
}

/**
 * Property row component
 */
function PropertyRow({ label, value }: { label: string; value: string }) {
  return (
    <Box sx={{ display: 'flex', gap: 2 }}>
      <Typography
        variant="body2"
        sx={{
          minWidth: '100px',
          color: 'rgba(255, 255, 255, 0.6)',
          fontSize: '12px',
        }}
      >
        {label}:
      </Typography>
      <Typography
        variant="body2"
        sx={{
          color: '#cccccc',
          fontSize: '12px',
        }}
      >
        {value}
      </Typography>
    </Box>
  )
}
