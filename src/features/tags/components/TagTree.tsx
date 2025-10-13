/**
 * TagTree Component - Hierarchical tree view of tags using react-arborist
 * Similar to NoteGrid but displays tags in a tree structure with advanced tree functionality
 */

import React, { useMemo, useState } from 'react';
import { Tree, NodeApi } from 'react-arborist';
import { 
    Box, 
    Typography, 
    Skeleton, 
    Chip,
    IconButton,
    Tooltip,
    Alert
} from '@mui/material';
import { 
    ExpandMore as ExpandMoreIcon,
    ChevronRight as ChevronRightIcon,
    LocalOffer as TagIcon,
    FolderOpen as FolderOpenIcon,
    Folder as FolderIcon,
    DragIndicator as DragIcon
} from '@mui/icons-material';

import { useTagTree } from '../hooks/useTags';
import { useTagUI } from '../store/TagUIContext';
import { useContextMenu } from '@/shared/contexts';
import type { Tag } from '../types/tag.types';

interface TagTreeProps {
    onTagClick?: (tag: Tag) => void;
    includeShared?: boolean;
}

// Transform Tag to tree data structure for react-arborist
interface TreeTag {
    id: string;
    name: string;
    children?: TreeTag[];
    data: Tag; // Store original tag data
}

/**
 * Node component for react-arborist tree
 */
function TagNode({ node, style, dragHandle }: { 
    node: NodeApi<TreeTag>; 
    style: React.CSSProperties;
    dragHandle?: (el: HTMLDivElement | null) => void;
}) {
    const { isTagSelected, toggleTagSelection } = useTagUI();
    const { showContextMenu } = useContextMenu();
    
    const tag = node.data.data;
    const hasChildren = node.data.children && node.data.children.length > 0;
    const isSelected = isTagSelected(tag.tagId);
    
    const handleSelectToggle = (e: React.MouseEvent) => {
        e.stopPropagation();
        e.preventDefault(); // Prevent any default behavior
        toggleTagSelection(tag.tagId);
    };

    const handleMainClick = (e: React.MouseEvent) => {
        e.stopPropagation();
        e.preventDefault(); // Prevent tree activation that causes scrolling
        // Handle tag selection or other actions here if needed
        toggleTagSelection(tag.tagId);
    };

    const handleRightClick = (e: React.MouseEvent) => {
        e.stopPropagation(); // Prevent bubbling to parent
        e.preventDefault(); // Prevent default context menu
        // Open tag-specific context menu with tag data
        showContextMenu(e, 'tag', tag);
    };
    
    return (
        <Box
            style={style}
            onClick={handleMainClick}
            onContextMenu={handleRightClick}
            sx={{
                display: 'flex',
                alignItems: 'center',
                height: '100%',
                paddingY: '4px',
                paddingRight: '8px',
                cursor: 'pointer',
                borderRadius: '4px',
                backgroundColor: isSelected ? 'action.selected' : 'transparent',
                '&:hover': {
                    backgroundColor: isSelected ? 'action.selected' : 'action.hover',
                },
                transition: 'background-color 0.2s',
            }}
        >
            {/* Drag Handle */}
            <Box
                ref={(el) => dragHandle?.(el as HTMLDivElement | null)}
                onClick={(e) => e.stopPropagation()} // Prevent click from bubbling
                sx={{ 
                    display: 'flex',
                    alignItems: 'center',
                    marginRight: '4px',
                    cursor: 'grab',
                    '&:active': { cursor: 'grabbing' }
                }}
            >
                <DragIcon fontSize="small" sx={{ color: 'action.disabled' }} />
            </Box>

            {/* Expand/Collapse Button */}
            <IconButton
                size="small"
                onClick={(e) => {
                    e.stopPropagation();
                    e.preventDefault();
                    node.toggle();
                }}
                sx={{ 
                    marginRight: '4px',
                    padding: '2px',
                    visibility: hasChildren ? 'visible' : 'hidden',
                }}
            >
                {hasChildren ? (
                    node.isOpen ? <ExpandMoreIcon fontSize="small" /> : <ChevronRightIcon fontSize="small" />
                ) : null}
            </IconButton>

            {/* Tag Icon */}
            <Box sx={{ marginRight: '8px', display: 'flex', alignItems: 'center' }}>
                {hasChildren ? (
                    node.isOpen ? <FolderOpenIcon fontSize="small" /> : <FolderIcon fontSize="small" />
                ) : (
                    <TagIcon 
                        fontSize="small" 
                        sx={{ 
                            color: tag.color || 'action.active' 
                        }} 
                    />
                )}
            </Box>

            {/* Tag Info - Flexbox with 2 items */}
            <Box sx={{ flex: 1, minWidth: 0, display: 'flex', alignItems: 'center', gap: '8px', height: '100%' }}>
                {/* Item 1: Main tag info (icon, name, indicators) - 30% width */}
                <Box sx={{ 
                    width: '30%', 
                    minWidth: 0,
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: '8px' 
                }}>
                    <Typography
                        variant="body2"
                        sx={{
                            fontWeight: hasChildren ? 600 : 400,
                            color: 'text.primary',
                        }}
                        noWrap
                    >
                        {tag.name}
                    </Typography>

                    {/* Color Indicator */}
                    {/* {tag.color && (
                        <Box
                            sx={{
                                width: '14px',
                                height: '14px',
                                borderRadius: '50%',
                                backgroundColor: tag.color,
                                border: '2px solid',
                                borderColor: 'background.paper',
                                boxShadow: '0 0 0 1px rgba(0,0,0,0.1)',
                                flexShrink: 0,
                            }}
                        />
                    )} */}
                </Box>

                {/* Item 2: Description - remaining width */}
                <Box sx={{ flex: 1, minWidth: 0 }}>
                    {tag.description && (
                        <Typography
                            variant="caption"
                            color="text.secondary"
                            sx={{ display: 'block', textAlign: 'left' }}
                            noWrap
                        >
                            {tag.description}
                        </Typography>
                    )}
                </Box>
            </Box>

            {/* Selection Checkbox */}
            <Tooltip title="Select tag">
                <IconButton
                    size="small"
                    onClick={handleSelectToggle}
                    sx={{ 
                        marginLeft: '8px',
                        opacity: isSelected ? 1 : 0.5,
                        '&:hover': { opacity: 1 }
                    }}
                >
                    <Box
                        sx={{
                            width: '16px',
                            height: '16px',
                            borderRadius: '2px',
                            border: '2px solid',
                            borderColor: isSelected ? 'primary.main' : 'grey.400',
                            backgroundColor: isSelected ? 'primary.main' : 'transparent',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                        }}
                    >
                        {isSelected && (
                            <Typography color="primary.contrastText" sx={{ fontSize: '10px', lineHeight: 1 }}>
                                ✓
                            </Typography>
                        )}
                    </Box>
                </IconButton>
            </Tooltip>
        </Box>
    );
}

/**
 * Loading skeleton for TagTree
 */
function TagTreeSkeleton() {
    return (
        <Box sx={{ padding: '16px' }}>
            {Array.from({ length: 5 }).map((_, i) => (
                <Box key={i} sx={{ display: 'flex', alignItems: 'center', mb: '8px' }}>
                    <Skeleton variant="rectangular" width={20} height={20} sx={{ mr: '8px' }} />
                    <Skeleton variant="text" width={`${Math.random() * 200 + 100}px`} height={20} />
                </Box>
            ))}
        </Box>
    );
}

/**
 * Empty state for TagTree
 */
function TagTreeEmpty() {
    return (
        <Box
            sx={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '48px 16px',
                textAlign: 'center',
            }}
        >
            <TagIcon sx={{ fontSize: '48px', color: 'grey.400', mb: '16px' }} />
            <Typography variant="h6" color="text.secondary" gutterBottom>
                No Tags Found
            </Typography>
            <Typography variant="body2" color="text.secondary">
                Create your first tag to organize your content
            </Typography>
        </Box>
    );
}

/**
 * Transform tag hierarchy to react-arborist tree data
 */
function transformTagsToTreeData(tags: Tag[]): TreeTag[] {
    return tags.map(tag => ({
        id: tag.tagId.toString(),
        name: tag.name,
        data: tag,
        children: tag.children && tag.children.length > 0 ? transformTagsToTreeData(tag.children) : undefined,
    }));
}

/**
 * Main TagTree component using react-arborist
 */
export function TagTree({ onTagClick, includeShared = true }: TagTreeProps) {
    const { data: tags, isLoading, error } = useTagTree(includeShared);
    const { searchText } = useTagUI();
    const [draggedNode, setDraggedNode] = useState<NodeApi<TreeTag> | null>(null);

    // Transform and filter tags based on search text
    const treeData = useMemo(() => {
        if (!tags) return [];

        const filterTree = (nodes: Tag[]): Tag[] => {
            return nodes
                .filter(tag => {
                    // Search filter
                    if (searchText) {
                        const matchesSearch = 
                            tag.name.toLowerCase().includes(searchText.toLowerCase());
                        
                        // Include if this tag matches OR any descendant matches
                        const hasMatchingDescendant = tag.children && tag.children.length > 0 ? 
                            filterTree(tag.children).length > 0 : false;
                        
                        return matchesSearch || hasMatchingDescendant;
                    }
                    
                    return true;
                })
                .map(tag => ({
                    ...tag,
                    children: tag.children && tag.children.length > 0 ? filterTree(tag.children) : [],
                }));
        };

        const filteredTags = filterTree(tags);
        return transformTagsToTreeData(filteredTags);
    }, [tags, searchText]);

    // Handle drag and drop
    const handleMove = (args: { dragIds: string[]; parentId: string | null; index: number }) => {
        console.log('Moving tags:', args);
        // TODO: Implement tag hierarchy update via API
    };

    // Loading state
    if (isLoading) {
        return <TagTreeSkeleton />;
    }

    // Error state
    if (error) {
        return (
            <Alert severity="error" sx={{ m: 2 }}>
                Failed to load tags: {error instanceof Error ? error.message : 'Unknown error occurred'}
            </Alert>
        );
    }

    // Empty state
    if (!treeData || treeData.length === 0) {
        return <TagTreeEmpty />;
    }

    // Main tree render with react-arborist
    return (
        <Box sx={{ padding: '16px', height: '100%' }}>
            <Tree<TreeTag>
                data={treeData}
                openByDefault={true}
                width="100%"
                height={600}
                indent={24}
                rowHeight={40}
                overscanCount={8}
                onMove={handleMove}
                disableMultiSelection={false}
                selection="" // Disable internal selection to prevent auto-scrolling
            >
                {({ node, style, dragHandle }) => (
                    <TagNode 
                        node={node} 
                        style={style} 
                        dragHandle={dragHandle}
                    />
                )}
            </Tree>
        </Box>
    );
}