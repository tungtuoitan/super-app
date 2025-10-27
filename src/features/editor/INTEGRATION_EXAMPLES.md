/**
 * INTEGRATION GUIDE: Editor Tab System
 * 
 * Hướng dẫn tích hợp hệ thống editor tab với các component hiện có
 */

// ============================================================================
// 1. WORKSPACE TREE INTEGRATION
// ============================================================================

/**
 * Example: Mở note khi double-click item trong WorkspaceTree
 * 
 * File: src/features/tags/components/WorkspaceTree.tsx
 */

import { useOpenNoteInEditor } from '@/features/editor';
import { useNotes } from '@/features/notes/hooks/useNotes'; // Hook to fetch note by ID

function WorkspaceTree({ workspaceId }: WorkspaceTreeProps) {
    const openNoteInEditor = useOpenNoteInEditor();
    
    // Handler for tree node actions
    const handleNodeAction = useCallback((node: TreeNode, action: 'click' | 'doubleClick') => {
        if (action === 'doubleClick' && node.type === 'note') {
            // Option 1: If you have full note data in the tree
            if (node.noteData) {
                openNoteInEditor(node.noteData);
            }
            
            // Option 2: If you only have noteId, fetch first
            else if (node.noteId) {
                // Fetch note and open in editor
                fetchNoteAndOpen(node.noteId);
            }
        }
    }, [openNoteInEditor]);
    
    // Helper to fetch and open note
    const fetchNoteAndOpen = async (noteId: number) => {
        try {
            const note = await noteService.getNoteById(noteId);
            openNoteInEditor(note);
        } catch (error) {
            console.error('Failed to fetch note:', error);
            enqueueSnackbar('Failed to open note', { variant: 'error' });
        }
    };
    
    return (
        <Tree
            onNodeClick={(node) => handleNodeAction(node, 'click')}
            onNodeDoubleClick={(node) => handleNodeAction(node, 'doubleClick')}
        />
    );
}

// ============================================================================
// 2. DATA GRID INTEGRATION
// ============================================================================

/**
 * Example: Mở note từ MUI DataGrid
 * 
 * File: src/features/notes/components/NoteGrid.tsx
 */

import { useOpenNoteInEditor } from '@/features/editor';
import { DataGrid } from '@mui/x-data-grid';

function NoteGrid() {
    const { data: notes } = useNotes();
    const openNote = useOpenNoteInEditor();
    
    return (
        <DataGrid
            rows={notes || []}
            columns={columns}
            onRowDoubleClick={(params) => {
                openNote(params.row); // params.row is the Note object
            }}
        />
    );
}

// ============================================================================
// 3. LIST VIEW INTEGRATION
// ============================================================================

/**
 * Example: Mở note từ custom list
 */

import { useOpenNoteInEditor } from '@/features/editor';

function NoteListView({ notes }: { notes: Note[] }) {
    const openNote = useOpenNoteInEditor();
    
    return (
        <List>
            {notes.map((note) => (
                <ListItem
                    key={note.noteId}
                    button
                    onDoubleClick={() => openNote(note)}
                >
                    <ListItemText primary={note.name} />
                </ListItem>
            ))}
        </List>
    );
}

// ============================================================================
// 4. CONTEXT MENU INTEGRATION
// ============================================================================

/**
 * Example: Thêm "Open in Editor" vào context menu
 */

import { useOpenNoteInEditor } from '@/features/editor';
import { useContextMenu } from '@/shared/contexts';

function NoteContextMenu() {
    const openNote = useOpenNoteInEditor();
    const { registerContextMenuItems } = useContextMenu();
    
    useEffect(() => {
        registerContextMenuItems([
            {
                id: 'open-in-editor',
                label: 'Open in Editor',
                icon: <EditIcon />,
                onClick: (item) => {
                    if (item.type === 'note') {
                        openNote(item.data);
                    }
                },
            },
        ]);
    }, [openNote, registerContextMenuItems]);
}

// ============================================================================
// 5. SEARCH RESULTS INTEGRATION
// ============================================================================

/**
 * Example: Mở note từ search results
 */

import { useOpenNoteInEditor } from '@/features/editor';

function SearchResults({ results }: { results: Note[] }) {
    const openNote = useOpenNoteInEditor();
    
    return (
        <Box>
            {results.map((note) => (
                <Card 
                    key={note.noteId}
                    onClick={() => openNote(note)}
                    sx={{ cursor: 'pointer' }}
                >
                    <CardContent>
                        <Typography variant="h6">{note.name}</Typography>
                        <Typography variant="body2">{note.description}</Typography>
                    </CardContent>
                </Card>
            ))}
        </Box>
    );
}

// ============================================================================
// 6. TAG INTEGRATION (Future)
// ============================================================================

/**
 * Example: Mở tag trong editor
 */

import { useOpenTagInEditor } from '@/features/editor';

function TagList({ tags }: { tags: Tag[] }) {
    const openTag = useOpenTagInEditor();
    
    return (
        <List>
            {tags.map((tag) => (
                <ListItem
                    key={tag.tagId}
                    button
                    onDoubleClick={() => openTag(tag)}
                >
                    <ListItemText primary={tag.name} />
                </ListItem>
            ))}
        </List>
    );
}

// ============================================================================
// 7. KEYBOARD SHORTCUT INTEGRATION (Future)
// ============================================================================

/**
 * Example: Thêm keyboard shortcuts
 */

import { useEditorTabs } from '@/features/editor';

function EditorKeyboardShortcuts() {
    const { activeTab, closeTab, switchToTab, tabs } = useEditorTabs();
    
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            // Ctrl+S: Save current tab
            if (e.ctrlKey && e.key === 's') {
                e.preventDefault();
                // Trigger save in active tab
            }
            
            // Ctrl+W: Close current tab
            if (e.ctrlKey && e.key === 'w') {
                e.preventDefault();
                if (activeTab) {
                    closeTab(activeTab.id);
                }
            }
            
            // Ctrl+Tab: Next tab
            if (e.ctrlKey && e.key === 'Tab' && !e.shiftKey) {
                e.preventDefault();
                const currentIndex = tabs.findIndex(t => t.id === activeTab?.id);
                const nextIndex = (currentIndex + 1) % tabs.length;
                switchToTab(tabs[nextIndex].id);
            }
            
            // Ctrl+Shift+Tab: Previous tab
            if (e.ctrlKey && e.key === 'Tab' && e.shiftKey) {
                e.preventDefault();
                const currentIndex = tabs.findIndex(t => t.id === activeTab?.id);
                const prevIndex = (currentIndex - 1 + tabs.length) % tabs.length;
                switchToTab(tabs[prevIndex].id);
            }
        };
        
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [activeTab, tabs, closeTab, switchToTab]);
}

// ============================================================================
// 8. PROGRAMMATIC TAB MANAGEMENT
// ============================================================================

/**
 * Example: Advanced tab management
 */

import { useEditorTabs } from '@/features/editor';

function TabManager() {
    const { 
        tabs, 
        activeTab, 
        closeTab, 
        closeAllTabs, 
        closeOtherTabs,
        setTabDirty 
    } = useEditorTabs();
    
    const handleCloseAllSaved = async () => {
        // Close all tabs that are not dirty
        for (const tab of tabs) {
            if (!tab.isDirty) {
                await closeTab(tab.id, true); // force=true
            }
        }
    };
    
    const handleCloseOthers = async () => {
        if (activeTab) {
            await closeOtherTabs(activeTab.id);
        }
    };
    
    return (
        <Box>
            <Button onClick={handleCloseAllSaved}>Close All Saved</Button>
            <Button onClick={handleCloseOthers}>Close Others</Button>
            <Button onClick={() => closeAllTabs()}>Close All</Button>
        </Box>
    );
}

// ============================================================================
// 9. CUSTOM TAB CONTENT TYPE (Future)
// ============================================================================

/**
 * Example: Thêm custom tab type mới
 */

// Step 1: Update types
// File: src/features/editor/types/editor.types.ts

export type TabType = 'note' | 'tag' | 'welcome' | 'settings' | 'custom';

export type TabContentData = 
    | { type: 'note'; data: Note }
    | { type: 'tag'; data: Tag }
    | { type: 'welcome'; data: null }
    | { type: 'settings'; data: null }
    | { type: 'custom'; data: CustomData }; // NEW

// Step 2: Add renderer
// File: src/features/editor/components/TabContentRenderer.tsx

export function TabContentRenderer({ tab }: TabContentRendererProps) {
    switch (tab.content.type) {
        // ... existing cases
        
        case 'custom':
            return <CustomEditorPanel data={tab.content.data} tabId={tab.id} />;
    }
}

// Step 3: Create hook
// File: src/features/editor/hooks/useEditorActions.ts

export function useOpenCustomInEditor() {
    const { openTab } = useEditorTabs();
    
    return useCallback((data: CustomData) => {
        openTab({
            type: 'custom',
            title: data.name,
            content: { type: 'custom', data },
        });
    }, [openTab]);
}

// ============================================================================
// 10. MONITORING & DEBUGGING
// ============================================================================

/**
 * Example: Debug tab state
 */

import { useEditorTabs } from '@/features/editor';

function EditorDebugPanel() {
    const { tabs, activeTab } = useEditorTabs();
    
    return (
        <Box sx={{ padding: 2, backgroundColor: '#f5f5f5' }}>
            <Typography variant="h6">Editor Debug Info</Typography>
            <Typography variant="body2">
                Open Tabs: {tabs.length}
            </Typography>
            <Typography variant="body2">
                Active Tab: {activeTab?.title || 'None'}
            </Typography>
            <Typography variant="body2">
                Dirty Tabs: {tabs.filter(t => t.isDirty).length}
            </Typography>
            
            <Box sx={{ mt: 2 }}>
                <Typography variant="subtitle2">Tab List:</Typography>
                {tabs.map(tab => (
                    <Box key={tab.id} sx={{ ml: 2 }}>
                        {tab.isDirty ? '● ' : '○ '}{tab.title} ({tab.type})
                    </Box>
                ))}
            </Box>
        </Box>
    );
}

// ============================================================================
// BEST PRACTICES
// ============================================================================

/**
 * ✅ DO:
 * - Use type-safe hooks (useOpenNoteInEditor, useOpenTagInEditor)
 * - Check if data is loaded before opening tab
 * - Handle errors gracefully
 * - Provide user feedback (snackbars)
 * - Use double-click for opening tabs (matches VS Code UX)
 * 
 * ❌ DON'T:
 * - Directly manipulate EditorTabContext state
 * - Open tabs without full data
 * - Ignore error cases
 * - Open tabs on single click (confusing UX)
 * - Create multiple tabs for same item
 */
