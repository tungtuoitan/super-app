import { useState } from 'react'
import { 
  Mosaic, 
  MosaicNode, 
  MosaicWindow, 
  MosaicBranch,
  getLeaves,
} from 'react-mosaic-component'

// Import real components
import { NoteGridPanel } from './NoteGridPanel';
import { WorkspaceTree } from '@/features/tags/components/WorkspaceTree';
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

const TagsComponent = () => (
  <div className="h-full overflow-hidden flex flex-col">
    {/* Using workspace tag tree API with workspaceId=1 for testing */}
    <WorkspaceTree workspaceId={1} includeShared={true} />
  </div>
)

const NoteDetailComponent = () => <NoteDetailPanel />

const PropertiesComponent = () => (
  <div className="p-2 h-full overflow-auto">
    <h2 className="text-lg font-semibold mb-4">Properties</h2>
    <p className="text-sm text-muted-foreground">
      This is where properties will be displayed
    </p>
  </div>
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
    <div className={`w-full h-full overflow-hidden mosaic-theme ${className || ''}`}>
      <Mosaic<ViewId>
        renderTile={renderTile}
        value={currentNode}
        onChange={setCurrentNode}
        blueprintNamespace="bp5"
      />
    </div>
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