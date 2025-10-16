import React, { useState } from 'react';
import {
    Paper,
    Box,
    Typography,
    TextField,
    Button,
    Card,
    CardContent,
    CardActions,
    Chip,
    Stack,
    CircularProgress,
    Alert,
    IconButton,
    Divider
} from '@mui/material';
import {
    Edit as EditIcon,
    Save as SaveIcon,
    Cancel as CancelIcon
} from '@mui/icons-material';

// Import hooks and services from notes feature
import { useNoteUI, useUpdateNote, type Note, type UpdateNoteDTO } from '../../features/notes';

/**
 * NoteDetailPanel - A flexible layout panel for displaying and editing note details
 */
export function NoteDetailPanel() {
    const [isEditing, setIsEditing] = useState(false);
    const [editedNote, setEditedNote] = useState<UpdateNoteDTO>({});

    // Get selected note from context
    const { selectedNote, closeDialog } = useNoteUI();

    // Mutation hook for updating notes
    const updateNote = useUpdateNote();

    // No note selected
    if (!selectedNote) {
        return (
            <Paper sx={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Box textAlign="center">
                    <Typography variant="h6" color="text.secondary" gutterBottom>
                        No note selected
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                        Select a note from the grid to view its details
                    </Typography>
                </Box>
            </Paper>
        );
    }

    // Handle edit mode
    const handleEdit = () => {
        setEditedNote({
            name: selectedNote.name,
            description: selectedNote.description,
        });
        setIsEditing(true);
    };

    // Handle save
    const handleSave = async () => {
        try {
            await updateNote.mutateAsync({
                id: selectedNote.noteId,
                data: editedNote,
            });
            setIsEditing(false);
            setEditedNote({});
        } catch (error) {
            console.error('Failed to update note:', error);
        }
    };

    // Handle cancel
    const handleCancel = () => {
        setIsEditing(false);
        setEditedNote({});
    };

    // Format date
    const formatDate = (date: Date) => {
        return new Intl.DateTimeFormat('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        }).format(date);
    };

    return (
        <Paper sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
            {/* Header */}
            <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider' }}>
                <Box display="flex" alignItems="center" justifyContent="space-between">
                    <Typography variant="h6">Note Details</Typography>
                    {!isEditing ? (
                        <IconButton onClick={handleEdit} size="small">
                            <EditIcon />
                        </IconButton>
                    ) : (
                        <Box display="flex" gap={1}>
                            <IconButton 
                                onClick={handleSave} 
                                size="small" 
                                color="primary"
                                disabled={updateNote.isPending}
                            >
                                {updateNote.isPending ? (
                                    <CircularProgress size={16} />
                                ) : (
                                    <SaveIcon />
                                )}
                            </IconButton>
                            <IconButton onClick={handleCancel} size="small">
                                <CancelIcon />
                            </IconButton>
                        </Box>
                    )}
                </Box>
            </Box>

            {/* Content */}
            <Box sx={{ flex: 1, p: 2, overflow: 'auto' }}>
                {updateNote.error && (
                    <Alert severity="error" sx={{ mb: 2 }}>
                        Failed to update note
                    </Alert>
                )}

                <Card>
                    <CardContent>
                        {/* Note Name */}
                        <Box sx={{ mb: 3 }}>
                            <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                                Name
                            </Typography>
                            {isEditing ? (
                                <TextField
                                    fullWidth
                                    value={editedNote.name || ''}
                                    onChange={(e) => setEditedNote(prev => ({ 
                                        ...prev, 
                                        name: e.target.value 
                                    }))}
                                    variant="outlined"
                                    size="small"
                                />
                            ) : (
                                <Typography variant="h6">
                                    {selectedNote.name}
                                </Typography>
                            )}
                        </Box>

                        <Divider sx={{ my: 2 }} />

                        {/* Description */}
                        <Box sx={{ mb: 3 }}>
                            <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                                Description
                            </Typography>
                            {isEditing ? (
                                <TextField
                                    fullWidth
                                    multiline
                                    rows={4}
                                    value={editedNote.description || ''}
                                    onChange={(e) => setEditedNote(prev => ({ 
                                        ...prev, 
                                        description: e.target.value 
                                    }))}
                                    variant="outlined"
                                    size="small"
                                />
                            ) : (
                                <Typography variant="body1">
                                    {selectedNote.description || 'No description'}
                                </Typography>
                            )}
                        </Box>

                        <Divider sx={{ my: 2 }} />

                        {/* Metadata */}
                        <Stack spacing={2}>
                            <Box>
                                <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                                    Created
                                </Typography>
                                <Typography variant="body2">
                                    {formatDate(selectedNote.createdAt)}
                                </Typography>
                            </Box>

                            <Box>
                                <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                                    Last Modified
                                </Typography>
                                <Typography variant="body2">
                                    {selectedNote.updatedAt ? formatDate(selectedNote.updatedAt) : 'Never'}
                                </Typography>
                            </Box>

                            <Box>
                                <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                                    Created By
                                </Typography>
                                <Typography variant="body2">
                                    {selectedNote.createdBy}
                                </Typography>
                            </Box>

                            <Box>
                                <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                                    Status
                                </Typography>
                                <Chip 
                                    label={selectedNote.isArchived ? 'Archived' : 'Active'}
                                    color={selectedNote.isArchived ? 'default' : 'success'}
                                    size="small"
                                />
                            </Box>
                        </Stack>
                    </CardContent>
                </Card>
            </Box>
        </Paper>
    );
}