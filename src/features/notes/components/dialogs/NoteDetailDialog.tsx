/**
 * Note Detail Dialog Component
 * Main dialog container for note details with fullscreen layout
 * Replicates RFDDetailDialog UI structure but follows SuperApp architecture guidelines
 */

import React from 'react';
import { 
    Dialog,
    DialogContent,
    DialogTitle,
    Typography,
    IconButton,
    AppBar,
    Toolbar,
    Box,
    Backdrop,
    CircularProgress,
    styled,
    Grid2,
    TextField,
    Button,
    Chip,
} from '@mui/material';
import { GenericTextField } from '@/shared/components/ui/GenericTextField';
import { GenericTagAutoComplete } from '@/shared/components/ui/TagAutoComplete';
import { GenericAutoComplete, type IAutoCompleteOptions } from '@/shared/components/ui/GenericAutoComplete';
import CloseIcon from '@mui/icons-material/Close';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import ArchiveIcon from '@mui/icons-material/Archive';
import UnarchiveIcon from '@mui/icons-material/Unarchive';
import DeleteIcon from '@mui/icons-material/Delete';
import { useNoteUI } from '../../store/NoteUIContext';
import { NoteContentToolbar } from './NoteContentToolbar';
import {NoteDetailDialogContent} from './NoteDetailDialogContent';

const StyledDialog = styled(Dialog)(({ theme }) => ({
    '& .MuiDialog-paper': {
        margin: 0,
        maxWidth: 'none',
        maxHeight: 'none',
        width: '100vw',
        height: '100vh',
        borderRadius: 0,
    },
    '& .MuiDialogContent-root': {
        padding: 0,
        overflowY: 'hidden',
        height: '100%',
        background: 'rgb(246, 246, 246)',
    },
}));



/**
 * Note Detail Dialog - Fullscreen dialog for note management
 * Uses the same UI structure as RFDDetailDialog
 */
export function NoteDetailDialog() {
    const { selectedNote, isDialogOpen, closeDialog } = useNoteUI();
    const [loading, setLoading] = React.useState(false);

    if (!selectedNote) {
        return null;
    }

    const isCreateMode = selectedNote.noteId === 0;

    return (
        <StyledDialog
            open={isDialogOpen}
            onClose={closeDialog}
            fullScreen
            disableEnforceFocus
        >
            {/* Dialog Header */}
            <Box sx={{
                flexGrow: 1,
                display: 'flex',
                maxHeight: '64px',
                zIndex: 1300,
                '& header.MuiPaper-root': {
                    height: '64px',
                    boxShadow: 'rgba(0, 0, 0, 0.2) 0px 2px 4px -1px, rgba(0, 0, 0, 0.14) 0px 4px 5px 0px, rgba(0, 0, 0, 0.12) 0px 1px 10px 0px',
                    '& .MuiToolbar-root': {
                        backgroundColor: '#fff!important',
                        color: '#000',
                        minHeight: 64,
                    }
                }
            }}>
                {/* Note Detail Dialog Header */}
                <AppBar 
                    position="static" 
                    elevation={2}
                    sx={{ 
                        backgroundColor: '#fff',
                        color: '#000',
                        borderBottom: '1px solid #e0e0e0',
                        height: '64px',
                        boxShadow: 'rgba(0, 0, 0, 0.2) 0px 2px 4px -1px, rgba(0, 0, 0, 0.14) 0px 4px 5px 0px, rgba(0, 0, 0, 0.12) 0px 1px 10px 0px'
                    }}
                >
                    <Toolbar variant="dense" sx={{ minHeight: '64px !important' }}>
                        <Box sx={{ flexGrow: 1 }}>
                            <Typography variant="h5" sx={{ lineHeight: 1 }}>
                                {isCreateMode ? 'Create New Note' : `${selectedNote.name || 'Untitled Note'}`}
                            </Typography>
                            {!isCreateMode && (
                                <Typography variant="caption" sx={{ fontSize: 11.5 }}>
                                    Created: {selectedNote.createdAt.toLocaleDateString()}
                            {selectedNote.createdBy && ` • Created by: ${selectedNote.createdBy}`}
                                </Typography>
                            )}
                        </Box>
                        
                        <IconButton
                            edge="end"
                            color="inherit"
                            onClick={closeDialog}
                            aria-label="close"
                            sx={{ color: '#000' }}
                        >
                            <CloseIcon />
                        </IconButton>
                    </Toolbar>
                </AppBar>
            </Box>

            {/* Toolbar Section */}
            <NoteContentToolbar />

            {/* Loading Backdrop */}
            <Backdrop 
                open={loading} 
                sx={{ 
                    color: '#fff', 
                    zIndex: 9999999 
                }}
            >
                <CircularProgress color="inherit" />
            </Backdrop>

            {/* Dialog Content */}
            <DialogContent className="note-dialog-content">
                {selectedNote && (
                    <NoteDetailDialogContent />
                )}
            </DialogContent>
        </StyledDialog>
    );
}