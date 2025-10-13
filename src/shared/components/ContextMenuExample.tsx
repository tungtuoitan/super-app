/**
 * Example component demonstrating how to use the ContextMenu
 */

import React from 'react';
import { Box, Typography, Paper } from '@mui/material';
import { useContextMenu } from '../contexts/ContextMenuContext';

export function ContextMenuExample() {
    const { showContextMenu } = useContextMenu();

    return (
        <Box sx={{ p: 3, maxWidth: 600 }}>
            <Typography variant="h5" gutterBottom>
                Context Menu Examples
            </Typography>
            
            <Typography variant="body1" sx={{ mb: 2 }}>
                Right-click on the areas below to see different context menus:
            </Typography>

            {/* Default context menu */}
            <Paper
                sx={{
                    p: 3,
                    mb: 2,
                    cursor: 'context-menu',
                    '&:hover': {
                        backgroundColor: 'action.hover',
                    },
                }}
                onContextMenu={(e) => showContextMenu(e, 'default')}
            >
                <Typography variant="h6">Default Menu Area</Typography>
                <Typography variant="body2" color="text.secondary">
                    Right-click here for the default context menu
                </Typography>
            </Paper>

            {/* Tag context menu */}
            <Paper
                sx={{
                    p: 3,
                    mb: 2,
                    cursor: 'context-menu',
                    backgroundColor: 'primary.light',
                    color: 'primary.contrastText',
                    '&:hover': {
                        backgroundColor: 'primary.main',
                    },
                }}
                onContextMenu={(e) => showContextMenu(e, 'tag')}
            >
                <Typography variant="h6">Tag Menu Area</Typography>
                <Typography variant="body2">
                    Right-click here for tag-specific context menu
                </Typography>
            </Paper>

            {/* Note context menu */}
            <Paper
                sx={{
                    p: 3,
                    mb: 2,
                    cursor: 'context-menu',
                    backgroundColor: 'secondary.light',
                    color: 'secondary.contrastText',
                    '&:hover': {
                        backgroundColor: 'secondary.main',
                    },
                }}
                onContextMenu={(e) => showContextMenu(e, 'note')}
            >
                <Typography variant="h6">Note Menu Area</Typography>
                <Typography variant="body2">
                    Right-click here for note-specific context menu
                </Typography>
            </Paper>
        </Box>
    );
}