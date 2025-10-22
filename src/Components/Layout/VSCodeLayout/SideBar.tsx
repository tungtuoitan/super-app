import { Box, Typography, IconButton, TextField, InputAdornment, Collapse, List, ListItem, ListItemText, ListItemButton } from '@mui/material'
import SearchIcon from '@mui/icons-material/Search'
import ChevronRightIcon from '@mui/icons-material/ChevronRight'
import ExpandMoreIcon from '@mui/icons-material/ExpandMore'
import FolderIcon from '@mui/icons-material/Folder'
import InsertDriveFileIcon from '@mui/icons-material/InsertDriveFile'
import MoreVertIcon from '@mui/icons-material/MoreVert'
import CloseIcon from '@mui/icons-material/Close'
import { useState } from 'react'
import type { ActivityBarView } from './ActivityBar'

interface SideBarProps {
  activeView: ActivityBarView
  isVisible: boolean
  onClose: () => void
}

// Explorer view component
function ExplorerView() {
  const [expanded, setExpanded] = useState(true)

  return (
    <Box>
      {/* Workspace header */}
      <Box sx={{ 
        padding: '8px 16px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        fontSize: '11px',
        fontWeight: 600,
        textTransform: 'uppercase',
        color: 'rgba(255, 255, 255, 0.6)',
      }}>
        <span>Explorer</span>
        <MoreVertIcon sx={{ fontSize: '16px' }} />
      </Box>

      {/* Folder tree */}
      <Box>
        <Box
          onClick={() => setExpanded(!expanded)}
          sx={{
            display: 'flex',
            alignItems: 'center',
            padding: '4px 8px',
            cursor: 'pointer',
            '&:hover': {
              backgroundColor: 'rgba(255, 255, 255, 0.1)',
            },
          }}
        >
          {expanded ? <ExpandMoreIcon sx={{ fontSize: '16px' }} /> : <ChevronRightIcon sx={{ fontSize: '16px' }} />}
          <FolderIcon sx={{ fontSize: '16px', marginLeft: '4px', marginRight: '8px', color: '#dcb67a' }} />
          <Typography variant="body2">SUPERAPP-FRONTEND</Typography>
        </Box>

        <Collapse in={expanded}>
          <List dense sx={{ paddingLeft: '20px' }}>
            <ListItemButton sx={{ paddingLeft: '20px' }}>
              <FolderIcon sx={{ fontSize: '16px', marginRight: '8px', color: '#dcb67a' }} />
              <ListItemText primary="src" primaryTypographyProps={{ variant: 'body2' }} />
            </ListItemButton>
            <ListItemButton sx={{ paddingLeft: '20px' }}>
              <FolderIcon sx={{ fontSize: '16px', marginRight: '8px', color: '#dcb67a' }} />
              <ListItemText primary="public" primaryTypographyProps={{ variant: 'body2' }} />
            </ListItemButton>
            <ListItemButton sx={{ paddingLeft: '20px' }}>
              <InsertDriveFileIcon sx={{ fontSize: '16px', marginRight: '8px', color: 'rgba(255, 255, 255, 0.6)' }} />
              <ListItemText primary="package.json" primaryTypographyProps={{ variant: 'body2' }} />
            </ListItemButton>
            <ListItemButton sx={{ paddingLeft: '20px' }}>
              <InsertDriveFileIcon sx={{ fontSize: '16px', marginRight: '8px', color: 'rgba(255, 255, 255, 0.6)' }} />
              <ListItemText primary="tsconfig.json" primaryTypographyProps={{ variant: 'body2' }} />
            </ListItemButton>
          </List>
        </Collapse>
      </Box>
    </Box>
  )
}

// Tags view component
function TagsView() {
  return (
    <Box sx={{ padding: '16px', textAlign: 'center' }}>
      <Typography variant="body2" sx={{ color: 'rgba(255, 255, 255, 0.6)' }}>
        Tag management interface
      </Typography>
      <Typography variant="caption" sx={{ display: 'block', marginTop: '8px', color: 'rgba(255, 255, 255, 0.4)' }}>
        This view will display tag tree and management tools
      </Typography>
    </Box>
  )
}

// Notes view component
function NotesView() {
  return (
    <Box sx={{ padding: '8px' }}>
      <TextField
        fullWidth
        size="small"
        placeholder="Search notes..."
        InputProps={{
          startAdornment: (
            <InputAdornment position="start">
              <SearchIcon sx={{ fontSize: '18px' }} />
            </InputAdornment>
          ),
        }}
        sx={{
          marginBottom: '16px',
          '& .MuiOutlinedInput-root': {
            backgroundColor: 'rgba(255, 255, 255, 0.05)',
          },
        }}
      />
      <Typography variant="caption" sx={{ display: 'block', color: 'rgba(255, 255, 255, 0.6)' }}>
        Notes list will appear here
      </Typography>
    </Box>
  )
}

export function SideBar({ activeView, isVisible, onClose }: SideBarProps) {
  if (!isVisible) return null

  const viewComponents = {
    explorer: <ExplorerView />,
    tags: <TagsView />,
    notes: <NotesView />,
  }

  const viewTitles = {
    explorer: 'Explorer',
    tags: 'Tags',
    notes: 'Notes',
  }

  return (
    <Box
      sx={{
        width: '300px',
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
          padding: '8px 16px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
        }}
      >
        <Typography variant="body2" sx={{ fontWeight: 600 }}>
          {viewTitles[activeView]}
        </Typography>
        <IconButton
          size="small"
          onClick={onClose}
          sx={{
            color: 'rgba(255, 255, 255, 0.6)',
            '&:hover': {
              color: '#fff',
            },
          }}
        >
          <CloseIcon sx={{ fontSize: '18px' }} />
        </IconButton>
      </Box>

      {/* Content */}
      <Box sx={{ flex: 1, overflow: 'auto' }}>
        {viewComponents[activeView]}
      </Box>
    </Box>
  )
}
