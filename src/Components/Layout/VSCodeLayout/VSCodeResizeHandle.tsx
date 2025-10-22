import { Box } from '@mui/material'
import { PanelResizeHandle } from 'react-resizable-panels'

interface VSCodeResizeHandleProps {
  direction: 'horizontal' | 'vertical'
  id?: string
}

/**
 * VSCodeResizeHandle - VS Code style resize handle for panels
 * 
 * Features:
 * - Blue highlight on hover/active
 * - Larger hit area for easier grabbing
 * - Smooth transitions
 * - Direction-aware cursor
 * - Always visible even when panel is collapsed (allows re-expanding)
 */
export function VSCodeResizeHandle({ direction, id }: VSCodeResizeHandleProps) {
  return (
    <PanelResizeHandle id={id}>
      <Box
        sx={{
          // Size based on direction
          width: direction === 'horizontal' ? '4px' : '100%',
          height: direction === 'vertical' ? '4px' : '100%',
          
          // Visual styling - slightly visible by default
          background: 'rgba(255, 255, 255, 0.05)',
          cursor: direction === 'horizontal' ? 'col-resize' : 'row-resize',
          position: 'relative',
          transition: 'background 0.1s ease',
          zIndex: 10,
          
          // Hover and active states
          '&:hover, &[data-resize-handle-active]': {
            background: '#007acc', // VS Code blue
          },
          
          // Larger hit area for easier grabbing
          '&::before': {
            content: '""',
            position: 'absolute',
            inset: 0,
            // Expand hit area
            ...(direction === 'horizontal' ? {
              transform: 'translateX(-4px)',
              width: '12px',
            } : {
              transform: 'translateY(-4px)',
              height: '12px',
            }),
          },
        }}
      />
    </PanelResizeHandle>
  )
}

/**
 * VS Code resize handle styles for reference:
 * - Default: transparent background
 * - Hover: #007acc (VS Code blue)
 * - Active (dragging): #007acc
 * - Width: 4px visual, 8px hit area
 * - Cursor: col-resize (horizontal) or row-resize (vertical)
 */
