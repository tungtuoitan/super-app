/**
 * Confirm Close Tab Dialog
 * Shows confirmation when closing tab with unsaved changes
 */

import React from 'react';
import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Button,
    Typography,
} from '@mui/material';
import WarningIcon from '@mui/icons-material/Warning';

interface ConfirmCloseDialogProps {
    open: boolean;
    tabTitle: string;
    onConfirm: () => void;
    onCancel: () => void;
}

export function ConfirmCloseDialog({
    open,
    tabTitle,
    onConfirm,
    onCancel,
}: ConfirmCloseDialogProps) {
    return (
        <Dialog
            open={open}
            onClose={onCancel}
            maxWidth="sm"
            fullWidth
            PaperProps={{
                sx: {
                    backgroundColor: 'rgb(37, 37, 38)',
                    color: '#cccccc',
                },
            }}
        >
            <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <WarningIcon sx={{ color: '#FFA726' }} />
                <span>Unsaved Changes</span>
            </DialogTitle>
            <DialogContent>
                <Typography variant="body1">
                    Do you want to close <strong>"{tabTitle}"</strong> without saving changes?
                </Typography>
                <Typography variant="body2" sx={{ mt: 1, color: 'rgba(255, 255, 255, 0.6)' }}>
                    Your changes will be lost if you don't save them.
                </Typography>
            </DialogContent>
            <DialogActions sx={{ padding: '16px 24px' }}>
                <Button
                    onClick={onCancel}
                    sx={{
                        color: '#cccccc',
                        '&:hover': {
                            backgroundColor: 'rgba(255, 255, 255, 0.1)',
                        },
                    }}
                >
                    Cancel
                </Button>
                <Button
                    onClick={onConfirm}
                    variant="contained"
                    sx={{
                        backgroundColor: '#f44336',
                        color: '#fff',
                        '&:hover': {
                            backgroundColor: '#d32f2f',
                        },
                    }}
                >
                    Close Without Saving
                </Button>
            </DialogActions>
        </Dialog>
    );
}
