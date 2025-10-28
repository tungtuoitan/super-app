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
  const isHorizontal = direction === 'horizontal'
  
  return (
    <PanelResizeHandle id={id}>
      <div
        className={`
          ${isHorizontal ? 'w-1' : 'w-full'}
          ${isHorizontal ? 'h-full' : 'h-1'}
          bg-white/5
          ${isHorizontal ? 'cursor-col-resize' : 'cursor-row-resize'}
          relative
          transition-colors duration-100
          z-10
          hover:bg-[#007acc]
          data-[resize-handle-active]:bg-[#007acc]
        `}
        style={{
          // Larger hit area for easier grabbing (pseudo-element simulation via padding trick)
        }}
      >
        <div 
          className={`
            absolute inset-0
            ${isHorizontal ? '-translate-x-1 w-3' : '-translate-y-1 h-3'}
          `}
        />
      </div>
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
