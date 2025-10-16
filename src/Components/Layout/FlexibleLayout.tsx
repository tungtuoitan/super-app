import React, { useState } from 'react'
import { 
  Mosaic, 
  MosaicNode, 
  MosaicWindow, 
  MosaicBranch,
  getLeaves,
} from 'react-mosaic-component'
import { Box, Typography } from '@mui/material'

// Import real components
import { NoteGridPanel } from './NoteGridPanel';
import { TagsPanel as TagsPanelReal } from './TagsPanelReal';
import { NoteDetailPanel } from './NoteDetailPanelReal';

// Import CSS cho mosaic
import 'react-mosaic-component/react-mosaic-component.css'
import './FlexibleLayout.css'

interface FlexibleLayoutProps {
  className?: string
}

// Định nghĩa các window types
export type ViewId = 'notes' | 'tags' | 'noteDetail' | 'properties'

// Real components
const NotesComponent = () => <NoteGridPanel />

const TagsComponent = () => <TagsPanelReal />

const NoteDetailComponent = () => <NoteDetailPanel />

const PropertiesComponent = () => (
  <Box sx={{ p: 2, height: '100%', overflow: 'auto' }}>
    <Typography variant="h6" gutterBottom>Properties</Typography>
    <Typography variant="body2">
      This is where properties will be displayed
    </Typography>
  </Box>
)

// Component registry
const COMPONENT_MAP = {
  notes: NotesComponent,
  tags: TagsComponent,
  noteDetail: NoteDetailComponent,
  properties: PropertiesComponent,
}

// Titles cho các window
const TITLE_MAP: Record<ViewId, string> = {
  notes: 'Notes',
  tags: 'Tags', 
  noteDetail: 'Note Detail',
  properties: 'Properties',
}

export function FlexibleLayout({ className }: FlexibleLayoutProps) {
  // Cấu hình layout mặc định - 3 cột
  const [currentNode, setCurrentNode] = useState<MosaicNode<ViewId> | null>({
    direction: 'row',
    first: 'tags',
    second: {
      direction: 'row',
      first: 'notes', 
      second: 'noteDetail',
      splitPercentage: 60,
    },
    splitPercentage: 20,
  })

  // Render component trong window
  const renderTile = (id: ViewId, path: MosaicBranch[]) => {
    const Component = COMPONENT_MAP[id]
    return (
      <MosaicWindow<ViewId>
        path={path}
        title={TITLE_MAP[id]}
        createNode={() => 'notes'}
        renderToolbar={() => {
          // Use only native DOM elements to avoid React DnD errors
          return (
            <div style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: '8px',
              width: '100%',
              height: '100%',
              padding: '0 8px',
            }}>
              <span style={{ flex: 1, fontSize: '14px', fontWeight: 500 }}>
                {TITLE_MAP[id]}
              </span>
              <button
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  padding: '4px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '16px'
                }}
                onClick={() => {
                  // Remove window từ layout
                  if (currentNode) {
                    const leaves = getLeaves(currentNode)
                    if (leaves.length > 1) {
                      // Có thể implement logic remove window ở đây
                      console.log('Remove window:', id)
                    }
                  }
                }}
              >
                ✕
              </button>
            </div>
          )
        }}
      >
        <Component />
      </MosaicWindow>
    )
  }

  return (
    <Box 
      className={className}
      sx={{ 
        width: '100%', 
        height: '100%',
        overflow: 'hidden',
        '& .mosaic': {
          height: '100%',
        },
        '& .mosaic-window': {
          backgroundColor: 'background.paper',
        },
        '& .mosaic-window-title': {
          backgroundColor: 'background.default',
          borderBottom: 1,
          borderColor: 'divider',
          color: 'text.primary',
        },
        '& .mosaic-window-body': {
          backgroundColor: 'background.paper',
        },
        '& .mosaic-drop-target': {
          backgroundColor: 'primary.main',
        //   opacity: 0.3,
        },
        '& .mosaic-split': {
          backgroundColor: 'divider',
        },
      }}
    >
      <Mosaic<ViewId>
        renderTile={renderTile}
        value={currentNode}
        onChange={setCurrentNode}
        blueprintNamespace="bp5"
      />
    </Box>
  )
}

// Utility functions để điều khiển layout
export const LayoutUtils = {
  // Add panel mới
  addPanel: (currentNode: MosaicNode<ViewId> | null, viewId: ViewId) => {
    if (!currentNode) {
      return viewId
    }
    
    // Thêm panel vào bên phải
    return {
      direction: 'row' as const,
      first: currentNode,
      second: viewId,
      splitPercentage: 70,
    }
  },

  // Save layout to localStorage
  saveLayout: (node: MosaicNode<ViewId> | null) => {
    if (node) {
      localStorage.setItem('mosaic-layout', JSON.stringify(node))
    }
  },

  // Load layout from localStorage
  loadLayout: (): MosaicNode<ViewId> | null => {
    try {
      const saved = localStorage.getItem('mosaic-layout')
      return saved ? JSON.parse(saved) : null
    } catch {
      return null
    }
  },

  // Reset về layout mặc định
  resetLayout: (): MosaicNode<ViewId> => ({
    direction: 'row',
    first: 'tags',
    second: {
      direction: 'row',
      first: 'notes', 
      second: 'noteDetail',
      splitPercentage: 60,
    },
    splitPercentage: 20,
  }),
}