/**
 * Note Detail Dialog Content Component
 * 3-column layout content for note details dialog
 * Replicates RFDDetailDialogContent UI structure but follows SuperApp architecture guidelines
 */

import React from 'react';
import { styled, Box, Typography, Grid2, TextField } from '@mui/material';
import { useNoteUI } from '../../store/NoteUIContext';
import { Note, NOTE_TYPES, NoteType } from '../../types/note.types';
import {GenericAutoComplete, GenericTagAutoComplete, GenericTextField, IAutoCompleteOptions} from '@/shared/components';

const NoteDetailWrapper = styled('div')({
    display: 'flex',
    flexFlow: 'column',
    margin: 0,
    padding: 8,
    flex: 1,
    height: '100%',
    background: '#f6f6f6',
    overflowY: 'auto',
    [`& .card-content`]: {
        margin: '10px 0',
        [`& .MuiPaper-root.MuiPaper-elevation`]: {
            marginBottom: 0,
        }
    },
    [`& .title-container`]: {
        display: 'flex',
        alignItems: 'flex-start',
        height: '30px',
        marginBottom: '16px',
    }
});

/**
 * Note Detail Dialog Content
 * Three-column layout matching RFD dialog structure:
 * - Left: Note form fields
 * - Center: Note content/description
 * - Right: Actions/metadata
 */
export function NoteDetailDialogContent() {
    const { selectedNote, isDialogOpen, closeDialog, updateSelectedNote } = useNoteUI();
        const [loading, setLoading] = React.useState(false);
    
        // Create options for type autocomplete
        const typeOptions: IAutoCompleteOptions[] = NOTE_TYPES.map((type) => ({
            id: type,
            label: type.charAt(0).toUpperCase() + type.slice(1),
            desc: type.charAt(0).toUpperCase() + type.slice(1),
            active: true,
        }));
    
        // Create current type value for autocomplete
        const currentTypeValue = selectedNote?.type 
            ? typeOptions.find(option => option.id === selectedNote.type) || null
            : null;
    
        // Mock tag options (in real app, this would come from a service)
        const tagOptions: IAutoCompleteOptions[] = [
            { id: 'urgent', label: 'Urgent', desc: 'Urgent', active: true },
            { id: 'important', label: 'Important', desc: 'Important', active: true },
            { id: 'work', label: 'Work', desc: 'Work', active: true },
            { id: 'personal', label: 'Personal', desc: 'Personal', active: true },
            { id: 'project', label: 'Project', desc: 'Project', active: true },
            { id: 'follow-up', label: 'Follow-up', desc: 'Follow-up', active: true },
        ];
    
        // Convert tags array to comma-separated string for TagAutoComplete
        const currentTagsValue = selectedNote?.tags?.join(',') || '';
    
        // Handlers for form interactions
        const handleFieldChange = (field: keyof Note, value: any) => {
            updateSelectedNote({ [field]: value });
            console.log(`Field ${field} changed to:`, value);
        };
    
        const handleTypeChange = (event: React.SyntheticEvent, newValue: IAutoCompleteOptions | null) => {
            const typeValue = newValue?.id as NoteType;
            handleFieldChange('type', typeValue);
        };
    
        const handleTagsChange = (tagsString: string) => {
            // Convert comma-separated string back to tags array
            const tagsArray = tagsString ? tagsString.split(',') : [];
            handleFieldChange('tags', tagsArray);
        };
    
        const handleDuplicate = () => {
            // TODO: Implement duplicate logic
            console.log('Duplicating note');
        };
    
        const handleArchive = () => {
            // TODO: Implement archive logic
            console.log('Toggling archive status');
        };
    
        const handleDelete = () => {
            // TODO: Implement delete logic
            console.log('Deleting note');
        };
    
        if (!selectedNote) {
            return null;
        }
    
        const isCreateMode = selectedNote.noteId === 0;

    return (
        <NoteDetailWrapper>
            <Grid2 container spacing={1}>
                {/* Left Column - Form Fields */}
                <Grid2 size={{ xs: 12, sm: 12, md: 6, lg: 4 }}>
                    <div style={{ 
                        height: 'calc(100vh - 160px)', 
                        background: '#fff', 
                        padding: '12px 24px 0 24px', 
                        overflowY: 'auto'
                    }}>
                        <Box sx={{ padding: '16px 0' }}>
                            <b className='title-container'>
                                NOTE DETAILS
                            </b>
                            
                            {/* ID */}
                            <GenericTextField
                                label="ID"
                                value={selectedNote?.noteId ? `${selectedNote.noteId}` : '0'}
                                disabled
                                sx={{ mb: '16px' }}
                                size="small"
                            />

                            {/* Note Name */}
                            <GenericTextField
                                label="Note Name"
                                value={selectedNote?.name || ''}
                                onChange={(e) => handleFieldChange('name', e.target.value)}
                                sx={{ mb: '16px' }}
                                size="small"
                            />

                            {/* Note Type - Temporarily Hidden */}
                            {/* <GenericAutoComplete
                                value={currentTypeValue}
                                onChange={handleTypeChange}
                                allOptions={typeOptions}
                                inputProps={{
                                    name: 'type',
                                    label: 'Type',
                                    required: false,
                                }}
                                sx={{ mb: '16px' }}
                            /> */}

                            {/* Status */}
                            <GenericAutoComplete
                                value={selectedNote?.isArchived ? { id: 'archived', label: 'Archived', desc: 'Archived', active: true } : { id: 'active', label: 'Active', desc: 'Active', active: true }}
                                onChange={(event, newValue) => handleFieldChange('isArchived', newValue?.id === 'archived')}
                                allOptions={[
                                    { id: 'active', label: 'Active', desc: 'Active', active: true },
                                    { id: 'archived', label: 'Archived', desc: 'Archived', active: true },
                                ]}
                                inputProps={{
                                    name: 'status',
                                    label: 'Status',
                                    required: false,
                                }}
                                sx={{ mb: '16px' }}
                            />

                            {/* Tags */}
                            <GenericTagAutoComplete
                                options={tagOptions}
                                value={currentTagsValue}
                                onChange={handleTagsChange}
                                label="Tags"
                                placeholder="+ Add Tag"
                                sx={{ mb: '16px' }}
                                size="small"
                                data-testid="note-tags"
                            />

                            {/* Created/Updated Info */}
                            <Box sx={{ mt: '24px', pt: '16px' }}>
                                <b className='title-container'>
                                    INFORMATION
                                </b>
                                
                                <GenericTextField
                                    label="Created"
                                    value={selectedNote?.createdAt ? new Intl.DateTimeFormat('en-US', {
                                        year: 'numeric',
                                        month: 'short',
                                        day: 'numeric',
                                        hour: '2-digit',
                                        minute: '2-digit',
                                        hour12: true
                                    }).format(selectedNote.createdAt) : '-'}
                                    disabled
                                    sx={{ mb: '16px' }}
                                    size="small"
                                />
                                
                                <GenericTextField
                                    label="Updated"
                                    value={selectedNote?.updatedAt ? new Intl.DateTimeFormat('en-US', {
                                        year: 'numeric',
                                        month: 'short',
                                        day: 'numeric',
                                        hour: '2-digit',
                                        minute: '2-digit',
                                        hour12: true
                                    }).format(selectedNote.updatedAt) : '-'}
                                    disabled
                                    sx={{ mb: '16px' }}
                                    size="small"
                                />
                                
                                <GenericTextField
                                    label="Created by"
                                    value={selectedNote?.createdBy || '-'}
                                    disabled
                                    size="small"
                                />
                            </Box>
                        </Box>
                    </div>
                </Grid2>

                {/* Center Column - Content */}
                <Grid2 size={{ xs: 12, sm: 12, md: 6, lg: 4 }}>
                    <div style={{ 
                        height: 'calc(100vh - 160px)', 
                        background: '#fff', 
                        padding: '12px 24px 0 24px', 
                        overflowY: 'auto'
                    }}>
                        <Box sx={{ padding: '16px 0', height: '100%', display: 'flex', flexDirection: 'column' }}>
                            <b className='title-container'>
                                CONTENT
                            </b>
                            
                            <TextField
                                fullWidth
                                multiline
                                rows={25}
                                label="Description"
                                value={selectedNote?.description || ''}
                                onChange={(e) => handleFieldChange('description', e.target.value)}
                                variant="outlined"
                                sx={{ 
                                    flex: 1,
                                    '& .MuiOutlinedInput-root': {
                                        borderRadius: '4px !important',
                                        height: '100%',
                                        alignItems: 'flex-start'
                                    },
                                    '& .MuiInputBase-input': {
                                        height: '100% !important',
                                        overflow: 'auto !important'
                                    }
                                }}
                            />
                        </Box>
                    </div>
                </Grid2>

                {/* Right Column - Actions & Metadata */}
                <Grid2 size={{ xs: 12, sm: 12, md: 6, lg: 4 }}>
                    <div style={{ 
                        height: 'calc(100vh - 170px)', 
                        background: '#fff', 
                        padding: '12px 0 0 0' 
                    }}>
                        <Box sx={{ padding: '16px' }}>
                            <b className='title-container'>
                                TAG TREE
                            </b>
                        </Box>
                    </div>
                </Grid2>
            </Grid2>
        </NoteDetailWrapper>
    );
}