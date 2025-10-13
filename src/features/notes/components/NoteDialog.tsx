/**
 * Note Dialog Component
 * Simple dialog to display note details when clicked from the grid
 */

import React from 'react';
import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Typography,
    Button,
    Chip,
    Box,
} from '@mui/material';
import { useNoteUI } from '../store/NoteUIContext';
import type { Note } from '../types/note.types';
import type { Tag } from '@/features/tags/types/tag.types';

/**
 * NoteDialog component for displaying note details
 * Uses the NoteUI context to manage dialog state
 */
export function NoteDialog() {
    const { selectedNote, isDialogOpen, closeDialog } = useNoteUI();

    if (!selectedNote) {
        return null;
    }

    return (
        <Dialog
            open={isDialogOpen}
            onClose={closeDialog}
            maxWidth="md"
            fullWidth
        >
            <DialogTitle>
                <Typography variant="h5" component="div">
                    {selectedNote.name}
                </Typography>
                <Box sx={{ display: 'flex', gap: 1, mt: 1 }}>
                    {selectedNote.type && (
                        <Chip
                            label={selectedNote.type}
                            size="small"
                            color="primary"
                            variant="outlined"
                        />
                    )}
                    <Chip
                        label={selectedNote.isArchived ? 'Archived' : 'Active'}
                        size="small"
                        color={selectedNote.isArchived ? 'default' : 'success'}
                        variant={selectedNote.isArchived ? 'outlined' : 'filled'}
                    />
                </Box>
            </DialogTitle>

            <DialogContent>
                {selectedNote.description && (
                    <Box sx={{ mb: 2 }}>
                        <Typography variant="subtitle2" gutterBottom>
                            Description
                        </Typography>
                        <Typography variant="body1" color="text.secondary">
                            {selectedNote.description}
                        </Typography>
                    </Box>
                )}

                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                    <Typography variant="body2">
                        <strong>Created:</strong> {selectedNote.createdAt.toLocaleString()}
                    </Typography>
                    <Typography variant="body2">
                        <strong>Updated:</strong> {selectedNote.updatedAt?.toLocaleString() || 'N/A'}
                    </Typography>
                    <Typography variant="body2">
                        <strong>Created by:</strong> {selectedNote.createdBy}
                    </Typography>
                    {selectedNote.tags && selectedNote.tags.length > 0 && (
                        <Box>
                            <Typography variant="body2" component="span">
                                <strong>Tags:</strong>
                            </Typography>
                            <Box sx={{ display: 'flex', gap: 0.5, mt: 0.5, flexWrap: 'wrap' }}>
                                {Array.isArray(selectedNote.tags) 
                                    ? selectedNote.tags.map((tag: Tag, index: number) => (
                                        <Chip
                                            key={tag.id || tag.tagId || index}
                                            label={tag.name}
                                            size="small"
                                            variant="outlined"
                                        />
                                    ))
                                    : null
                                }
                            </Box>
                        </Box>
                    )}
                </Box>
            </DialogContent>

            <DialogActions>
                <Button onClick={closeDialog}>
                    Close
                </Button>
                <Button variant="contained" onClick={closeDialog}>
                    Edit Note
                </Button>
            </DialogActions>
        </Dialog>
    );
}