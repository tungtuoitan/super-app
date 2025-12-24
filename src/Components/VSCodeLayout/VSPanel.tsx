import {useNoteDetailStore} from '@/store/note/useNoteDetail.store'
import {useNoteGridStore} from '@/store/note/useNoteGrid.store'
import { X, FileText, Settings } from 'lucide-react'
import { useState } from 'react'
import { Panel } from 'react-resizable-panels'
import { useActivityBarStore } from '@/store/index'

interface VSPanelProps {
  onClose: () => void
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
export function VSPanel({ onClose }: VSPanelProps) {
  const [activeTab, setActiveTab] = useState<PanelTab>('noteDetail')
  const { isPanelVisible, setIsPanelVisible } = useActivityBarStore()

  return (
    <Panel 
      id="bottom-panel"
      defaultSize={30}
      minSize={5}
      maxSize={60}
      collapsible
      collapsedSize={0}
      onCollapse={() => setIsPanelVisible(false)}
      onExpand={() => setIsPanelVisible(true)}
    >
      {isPanelVisible && (
        <div className="h-full border-t border-editor-border bg-editor-bg flex flex-col overflow-hidden">
          {/* Tabs Header */}
          <div className="flex items-center justify-between border-b border-editor-border h-[35px]">
            <div className="flex h-full">
              <button
                onClick={() => setActiveTab('noteDetail')}
                className={`flex items-center gap-1.5 px-3 text-[13px] border-b-2 transition-colors ${
                  activeTab === 'noteDetail'
                    ? 'border-editor-active text-editor-fg'
                    : 'border-transparent text-muted-foreground hover:text-editor-fg'
                }`}
              >
                <FileText className="w-4 h-4" />
                <span>Note Detail</span>
              </button>
              <button
                onClick={() => setActiveTab('properties')}
                className={`flex items-center gap-1.5 px-3 text-[13px] border-b-2 transition-colors ${
                  activeTab === 'properties'
                    ? 'border-editor-active text-editor-fg'
                    : 'border-transparent text-muted-foreground hover:text-editor-fg'
                }`}
              >
                <Settings className="w-4 h-4" />
                <span>Properties</span>
              </button>
            </div>

            <button
              onClick={onClose}
              className="p-1 mr-2 text-muted-foreground hover:text-editor-fg hover:bg-editor-hover rounded transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Panel Content */}
          <div className="flex-1 overflow-auto p-3">
            {activeTab === 'noteDetail' && <NoteDetailTab />}
            {activeTab === 'properties' && <PropertiesTab />}
          </div>
        </div>
      )}
    </Panel>
  )
}

/**
 * Note Detail Tab - Display selected note details
 */
function NoteDetailTab() {
  const { selectedNote } = useNoteGridStore()

  if (!selectedNote) {
    return (
      <div className="flex items-center justify-center h-full text-muted-foreground">
        <p className="text-sm">
          Select a note to view details
        </p>
      </div>
    )
  }

  return (
    <div>
      {/* <h3 className="text-base font-semibold mb-2 text-editor-fg">
        {selectedNote.name}
      </h3>

      <p className="text-sm text-editor-fg/80 mb-2 leading-relaxed">
        {selectedNote.description || 'No description'}
      </p>

      <div className="mt-3">
        <span className="block text-xs text-muted-foreground mb-0.5">
          Created: {new Date(selectedNote.createdAt).toLocaleString()}
        </span>
        {selectedNote.updatedAt && (
          <span className="block text-xs text-muted-foreground">
            Updated: {new Date(selectedNote.updatedAt).toLocaleString()}
          </span>
        )}
      </div> */}
    </div>
  )
}

/**
 * Properties Tab - Display note properties
 */
function PropertiesTab() {
  const { selectedNote } = useNoteGridStore()

  if (!selectedNote) {
    return (
      <div className="flex items-center justify-center h-full text-muted-foreground">
        <p className="text-sm">
          Select a note to view properties
        </p>
      </div>
    )
  }

  return (
    <div>
      <p className="text-sm font-semibold mb-2 text-editor-fg">
        Note Properties
      </p>

      <div className="flex flex-col gap-1">
        <PropertyRow label="ID" value={selectedNote.id.toString()} />
        <PropertyRow label="Name" value={selectedNote.name} />
        <PropertyRow label="Type" value={selectedNote.type || 'N/A'} />
        <PropertyRow label="Deleted" value={selectedNote.deletedAt ? 'Yes' : 'No'} />
        <PropertyRow label="Created By" value={selectedNote.createdBy || 'Unknown'} />
        <PropertyRow label="HashTags" value={selectedNote.tags?.join(', ') || 'No hashtags'} />
      </div>
    </div>
  )
}

/**
 * Property row component
 */
function PropertyRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex gap-2">
      <span className="min-w-[100px] text-muted-foreground text-xs">
        {label}:
      </span>
      <span className="text-editor-fg text-xs">
        {value}
      </span>
    </div>
  )
}
