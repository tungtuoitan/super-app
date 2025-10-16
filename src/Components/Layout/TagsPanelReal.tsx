import React from 'react';
import {
    Paper,
    Box,
    Typography,
    List,
    ListItem,
    ListItemButton,
    ListItemText,
    Chip,
    CircularProgress,
    Alert,
    Divider
} from '@mui/material';

// Import hooks and services from tags feature
import { useTags, useTagUI, type Tag } from '../../features/tags';

/**
 * TagsPanelProps interface
 */
interface TagsPanelProps {
    /** Optional callback when tag is selected */
    onTagSelect?: (tag: Tag) => void;
}

/**
 * TagsPanel - A flexible layout panel for displaying and managing tags
 */
export function TagsPanel({ onTagSelect }: TagsPanelProps) {
    // Get data from React Query
    const { data: tags, isLoading, error } = useTags();
    
    // Get UI state if available
    const tagUI = useTagUI?.();

    // Handle tag click
    const handleTagClick = (tag: Tag) => {
        onTagSelect?.(tag);
        tagUI?.openDialog?.(tag);
    };

    // Loading state
    if (isLoading) {
        return (
            <Paper sx={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Box display="flex" flexDirection="column" alignItems="center" gap={2}>
                    <CircularProgress size={24} />
                    <Typography variant="body2" color="text.secondary">
                        Loading tags...
                    </Typography>
                </Box>
            </Paper>
        );
    }

    // Error state
    if (error) {
        return (
            <Paper sx={{ height: '100%', p: 2 }}>
                <Alert severity="error" sx={{ mb: 2 }}>
                    Failed to load tags
                </Alert>
            </Paper>
        );
    }

    // Empty state
    if (!tags || tags.length === 0) {
        return (
            <Paper sx={{ height: '100%', p: 2 }}>
                <Typography variant="h6" gutterBottom>
                    Tags
                </Typography>
                <Typography variant="body2" color="text.secondary">
                    No tags available
                </Typography>
            </Paper>
        );
    }

    return (
        <Paper sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
            <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider' }}>
                <Typography variant="h6">Tags</Typography>
                <Typography variant="body2" color="text.secondary">
                    {tags.length} tag{tags.length !== 1 ? 's' : ''}
                </Typography>
            </Box>
            
            <Box sx={{ flex: 1, overflow: 'auto' }}>
                <List dense>
                    {tags.map((tag) => (
                        <React.Fragment key={tag.tagId}>
                            <ListItem disablePadding>
                                <ListItemButton
                                    onClick={() => handleTagClick(tag)}
                                    sx={{
                                        py: 1,
                                        px: 2,
                                        '&:hover': {
                                            backgroundColor: 'action.hover',
                                        },
                                    }}
                                >
                                    <ListItemText
                                        primary={
                                            <Box display="flex" alignItems="center" gap={1}>
                                                <Chip 
                                                    label={tag.name}
                                                    size="small"
                                                    variant="outlined"
                                                    sx={{
                                                        backgroundColor: tag.color || 'primary.light',
                                                        borderColor: tag.color || 'primary.main',
                                                    }}
                                                />
                                                {/* Show usage count if available from tree data */}
                                            </Box>
                                        }
                                        secondary={tag.description}
                                    />
                                </ListItemButton>
                            </ListItem>
                            <Divider variant="inset" component="li" />
                        </React.Fragment>
                    ))}
                </List>
            </Box>
        </Paper>
    );
}