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
            {/*
              Visual: small 1px line
              Hit area: expanded via padding (px-2 / py-2)
              z-index: high so it sits above neighboring panels
            */}
            <div
                role="separator"
                aria-orientation={isHorizontal ? 'vertical' : 'horizontal'}
                // outer acts as hit area (transparent); inner is the visible 1px line
                className={
                    `${isHorizontal ? ' h-full cursor-col-resize' : 'w-full cursor-row-resize'}` +
                    ' group relative z-[10001] pointer-events-auto bg-transparent'
                }
            >
                {/* Inner element used as the visible 1px line (absolute overlay to cover panel borders) */}
                <div
                    className={
                        `${isHorizontal ? 'absolute inset-y-0 left-1/2 -translate-x-1/2 w-px' : 'absolute inset-x-0 top-1/2 -translate-y-1/2 h-px'}` +
                        ' bg-[hsl(var(--editor-border))] transition-colors duration-100 group-hover:bg-[#007acc] data-[resize-handle-active]:bg-[#007acc]'
                    }
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
