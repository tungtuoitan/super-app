/**
 * KEYBOARD SHORTCUTS DEMO
 * Test keyboard shortcuts functionality
 */

import React, { useState } from 'react';
import { Box, Button, Typography, Paper, Chip } from '@mui/material';
import { AddTagDialog } from './AddTagDialog';

export function KeyboardShortcutsDemo() {
    const [isDialogOpen, setIsDialogOpen] = useState(false);

    return (
        <Box sx={{ padding: '32px', maxWidth: '800px', margin: '0 auto' }}>
            <Typography variant="h4" sx={{ mb: '24px' }}>
                ⌨️ Keyboard Shortcuts Demo
            </Typography>

            <Paper sx={{ padding: '24px', mb: '24px' }}>
                <Typography variant="h6" sx={{ mb: '16px' }}>
                    Available Shortcuts in Add Tag Dialog:
                </Typography>

                <Box sx={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <Chip label="Enter" size="small" sx={{ fontFamily: 'monospace' }} />
                        <Typography variant="body2">
                            Submit form (only when valid)
                        </Typography>
                    </Box>

                    <Box sx={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <Chip label="Escape" size="small" sx={{ fontFamily: 'monospace' }} />
                        <Typography variant="body2">
                            Close dialog
                        </Typography>
                    </Box>
                </Box>
            </Paper>

            <Paper sx={{ padding: '24px', mb: '24px', backgroundColor: '#f5f5f5' }}>
                <Typography variant="h6" sx={{ mb: '16px' }}>
                    ✅ Safety Features:
                </Typography>

                <Box component="ul" sx={{ margin: 0, paddingLeft: '24px' }}>
                    <li>
                        <Typography variant="body2">
                            Only active when dialog is open
                        </Typography>
                    </li>
                    <li>
                        <Typography variant="body2">
                            Disabled during form submission
                        </Typography>
                    </li>
                    <li>
                        <Typography variant="body2">
                            Won't interfere with typing in inputs
                        </Typography>
                    </li>
                    <li>
                        <Typography variant="body2">
                            Enter requires valid input (tag selected or name filled)
                        </Typography>
                    </li>
                    <li>
                        <Typography variant="body2">
                            Always have button alternative for mobile
                        </Typography>
                    </li>
                </Box>
            </Paper>

            <Paper sx={{ padding: '24px', mb: '24px', backgroundColor: '#fff3e0' }}>
                <Typography variant="h6" sx={{ mb: '16px' }}>
                    🚫 What We DON'T Do:
                </Typography>

                <Box component="ul" sx={{ margin: 0, paddingLeft: '24px' }}>
                    <li>
                        <Typography variant="body2">
                            ❌ No global shortcuts (Ctrl+S, Ctrl+W, etc.)
                        </Typography>
                    </li>
                    <li>
                        <Typography variant="body2">
                            ❌ No always-on dangerous shortcuts (Delete key)
                        </Typography>
                    </li>
                    <li>
                        <Typography variant="body2">
                            ❌ No hidden/undocumented shortcuts
                        </Typography>
                    </li>
                    <li>
                        <Typography variant="body2">
                            ❌ No browser shortcut conflicts
                        </Typography>
                    </li>
                </Box>
            </Paper>

            <Box sx={{ display: 'flex', gap: '16px', justifyContent: 'center' }}>
                <Button 
                    variant="contained" 
                    onClick={() => setIsDialogOpen(true)}
                    size="large"
                >
                    Open Dialog & Try Shortcuts
                </Button>
            </Box>

            {/* Demo dialog with workspace ID 1 */}
            <AddTagDialog
                open={isDialogOpen}
                onClose={() => setIsDialogOpen(false)}
                workspaceId={1}
            />

            <Box sx={{ mt: '32px', padding: '16px', backgroundColor: '#e3f2fd', borderRadius: '8px' }}>
                <Typography variant="caption" sx={{ display: 'block', mb: '8px', fontWeight: 600 }}>
                    💡 Try it:
                </Typography>
                <Typography variant="caption" component="div">
                    1. Click "Open Dialog" button<br />
                    2. Select a tag or type a name<br />
                    3. Press <strong>Enter</strong> to submit<br />
                    4. Or press <strong>Escape</strong> to cancel<br />
                    5. Notice shortcuts are shown in button labels!
                </Typography>
            </Box>
        </Box>
    );
}
