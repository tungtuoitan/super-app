import React from 'react';
import { 
    Box, 
    Typography, 
    Paper,
    Alert,
    List,
    ListItem,
    ListItemText,
    Divider
} from '@mui/material';
import { FlexibleLayout } from '../Components/Layout/FlexibleLayout';

/**
 * Demo page for FlexibleLayout
 * Shows the flexible layout system in action
 */
export function FlexibleLayoutDemo() {
    return (
        <Box sx={{ height: '100vh', display: 'flex', flexDirection: 'column' }}>
            {/* Header */}
            <Paper sx={{ p: 2, mb: 1, borderRadius: 0 }}>
                <Typography variant="h4" gutterBottom>
                    FlexibleLayout Demo
                </Typography>
                <Typography variant="body1" color="text.secondary">
                    VS Code-like flexible layout system with resizable panels
                </Typography>
                
                <Alert severity="info" sx={{ mt: 2 }}>
                    <Typography variant="body2">
                        <strong>Instructions:</strong>
                    </Typography>
                    <List dense>
                        <ListItem>
                            <ListItemText primary="• Drag panel edges to resize" />
                        </ListItem>
                        <ListItem>
                            <ListItemText primary="• Click on a note in the grid to view details in the right panel" />
                        </ListItem>
                        <ListItem>
                            <ListItemText primary="• Click on tags in the left panel to interact with them" />
                        </ListItem>
                        <ListItem>
                            <ListItemText primary="• Use window controls to close panels or add new ones" />
                        </ListItem>
                        <ListItem>
                            <ListItemText primary="• Layout automatically saves to localStorage" />
                        </ListItem>
                    </List>
                </Alert>
            </Paper>

            {/* FlexibleLayout */}
            <Box sx={{ flex: 1, overflow: 'hidden' }}>
                <FlexibleLayout />
            </Box>
        </Box>
    );
}