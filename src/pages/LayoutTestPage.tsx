import React from 'react'
import { FlexibleLayout, LayoutUtils, ViewId } from '@/components/Layout/FlexibleLayout'
import { 
  Box, 
  Button, 
  Toolbar, 
  Typography, 
  IconButton,
  Menu,
  MenuItem,
} from '@mui/material'
import { 
  Add as AddIcon, 
  Save as SaveIcon, 
  Restore as RestoreIcon,
  ViewModule as ViewModuleIcon,
} from '@mui/icons-material'

export function LayoutTestPage() {
  const [currentNode, setCurrentNode] = React.useState(LayoutUtils.resetLayout())
  const [anchorEl, setAnchorEl] = React.useState<null | HTMLElement>(null)
  
  const handleAddPanel = (viewId: ViewId) => {
    const newNode = LayoutUtils.addPanel(currentNode, viewId)
    setCurrentNode(newNode)
    setAnchorEl(null)
  }

  const handleSaveLayout = () => {
    LayoutUtils.saveLayout(currentNode)
    console.log('Layout saved to localStorage')
  }

  const handleLoadLayout = () => {
    const savedLayout = LayoutUtils.loadLayout()
    if (savedLayout) {
      setCurrentNode(savedLayout)
      console.log('Layout loaded from localStorage')
    }
  }

  const handleResetLayout = () => {
    const resetNode = LayoutUtils.resetLayout()
    setCurrentNode(resetNode)
    console.log('Layout reset to default')
  }

  return (
    <Box sx={{ height: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* Toolbar điều khiển layout */}
      <Toolbar 
        variant="dense" 
        sx={{ 
          backgroundColor: 'background.paper',
          borderBottom: 1,
          borderColor: 'divider',
          gap: 1,
        }}
      >
        <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
          Flexible Layout Demo
        </Typography>
        
        {/* Add Panel Button */}
        <IconButton
          size="small"
          onClick={(event) => setAnchorEl(event.currentTarget)}
        >
          <AddIcon />
        </IconButton>
        
        <Menu
          anchorEl={anchorEl}
          open={Boolean(anchorEl)}
          onClose={() => setAnchorEl(null)}
        >
          <MenuItem onClick={() => handleAddPanel('notes')}>
            Add Notes Panel
          </MenuItem>
          <MenuItem onClick={() => handleAddPanel('tags')}>
            Add Tags Panel
          </MenuItem>
          <MenuItem onClick={() => handleAddPanel('noteDetail')}>
            Add Note Detail Panel
          </MenuItem>
          <MenuItem onClick={() => handleAddPanel('properties')}>
            Add Properties Panel
          </MenuItem>
        </Menu>

        {/* Layout Controls */}
        <IconButton size="small" onClick={handleSaveLayout} title="Save Layout">
          <SaveIcon />
        </IconButton>
        
        <IconButton size="small" onClick={handleLoadLayout} title="Load Layout">
          <ViewModuleIcon />
        </IconButton>
        
        <IconButton size="small" onClick={handleResetLayout} title="Reset Layout">
          <RestoreIcon />
        </IconButton>
      </Toolbar>

      {/* Layout chính */}
      <Box sx={{ flex: 1, overflow: 'hidden' }}>
        <FlexibleLayout />
      </Box>
    </Box>
  )
}