// features/tags/components/AddTagDialog.tsx
// Example: Using keyboard shortcuts in Add Tag Dialog

import { useState, useCallback } from 'react'
import { Dialog, DialogTitle, DialogContent, DialogActions, TextField, Button } from '@mui/material'
import { useSnackbar } from 'notistack'
import { useKeyboardShortcut, useInputShortcuts } from '@/shared/hooks/useKeyboardShortcut'

interface AddTagDialogProps {
    open: boolean
    onClose: () => void
    parentId?: number
}

export function AddTagDialog({ open, onClose, parentId }: AddTagDialogProps) {
    const [tagName, setTagName] = useState('')
    const createTag = useCreateTag()
    const { enqueueSnackbar } = useSnackbar()

    const handleSubmit = useCallback(async () => {
        if (!tagName.trim()) {
            enqueueSnackbar('Tag name is required', { variant: 'error' })
            return
        }

        try {
            await createTag.mutateAsync({
                name: tagName.trim(),
                parentId,
            })
            enqueueSnackbar('Tag created!', { variant: 'success' })
            setTagName('')
            onClose()
        } catch (error) {
            enqueueSnackbar('Failed to create tag', { variant: 'error' })
        }
    }, [tagName, parentId, createTag, onClose, enqueueSnackbar])

    // ✅ Method 1: Global keyboard shortcuts (only when dialog is open)
    useKeyboardShortcut({
        key: 'Enter',
        enabled: open && tagName.trim().length > 0,
        callback: handleSubmit,
        description: 'Create tag',
    })

    useKeyboardShortcut({
        key: 'Escape',
        enabled: open,
        callback: onClose,
        description: 'Close dialog',
    })

    // ✅ Method 2: Input-specific shortcuts (alternative approach)
    const inputShortcuts = useInputShortcuts({
        onEnter: handleSubmit,
        onEscape: onClose,
        enabled: open,
    })

    return (
        <Dialog 
            open={open} 
            onClose={onClose}
            maxWidth="sm"
            fullWidth
        >
            <DialogTitle>Add New Tag</DialogTitle>
            
            <DialogContent>
                <TextField
                    value={tagName}
                    onChange={(e) => setTagName(e.target.value)}
                    // Use Method 2 if you prefer input-specific handling
                    // {...inputShortcuts}
                    placeholder="Enter tag name"
                    label="Tag Name"
                    fullWidth
                    autoFocus
                    helperText="Press Enter to create, Esc to cancel"
                />
            </DialogContent>

            <DialogActions>
                <Button onClick={onClose}>
                    Cancel (Esc)
                </Button>
                <Button 
                    variant="contained"
                    onClick={handleSubmit}
                    disabled={!tagName.trim() || createTag.isPending}
                >
                    {createTag.isPending ? 'Creating...' : 'Create (Enter)'}
                </Button>
            </DialogActions>
        </Dialog>
    )
}

// ====================================
// Example 2: Advanced shortcuts in TagsPage
// ====================================

export function TagsPage() {
    const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
    const [searchText, setSearchText] = useState('')

    // ✅ Ctrl+N to open Add Tag dialog
    useKeyboardShortcut({
        key: 'n',
        ctrl: true,
        callback: () => setIsAddDialogOpen(true),
        description: 'New tag',
    })

    // ✅ Ctrl+K to focus search
    useKeyboardShortcut({
        key: 'k',
        ctrl: true,
        callback: () => {
            const searchInput = document.querySelector('input[name="search"]') as HTMLInputElement
            searchInput?.focus()
        },
        description: 'Focus search',
    })

    return (
        <div>
            <input
                name="search"
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
                placeholder="Search tags (Ctrl+K)"
            />

            <Button onClick={() => setIsAddDialogOpen(true)}>
                New Tag (Ctrl+N)
            </Button>

            <AddTagDialog
                open={isAddDialogOpen}
                onClose={() => setIsAddDialogOpen(false)}
            />
        </div>
    )
}

// ====================================
// Example 3: Keyboard shortcut help panel
// ====================================

import { Box, Typography, Chip } from '@mui/material'
import {useCreateTag} from '../hooks/useTags'

export function KeyboardShortcutsHelp() {
    const shortcuts = [
        { keys: ['Enter'], description: 'Create/Submit' },
        { keys: ['Esc'], description: 'Close dialog' },
        { keys: ['Ctrl', 'N'], description: 'New tag' },
        { keys: ['Ctrl', 'K'], description: 'Search' },
        { keys: ['Ctrl', 'S'], description: 'Save' },
        { keys: ['Delete'], description: 'Delete selected' },
    ]

    return (
        <Box sx={{ padding: '24px' }}>
            <Typography variant="h6" sx={{ mb: '16px' }}>
                Keyboard Shortcuts
            </Typography>

            {shortcuts.map((shortcut, index) => (
                <Box 
                    key={index}
                    sx={{ 
                        display: 'flex', 
                        alignItems: 'center', 
                        gap: '16px',
                        mb: '8px',
                    }}
                >
                    <Box sx={{ display: 'flex', gap: '4px' }}>
                        {shortcut.keys.map((key) => (
                            <Chip 
                                key={key}
                                label={key}
                                size="small"
                                sx={{ fontFamily: 'monospace' }}
                            />
                        ))}
                    </Box>
                    <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                        {shortcut.description}
                    </Typography>
                </Box>
            ))}
        </Box>
    )
}
