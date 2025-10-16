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
 * Helper function to get all visible tag IDs in tree order
 */
function getAllVisibleTagIds(treeData: TreeTag[]): number[] {
    const result: number[] = [];
    
    function traverse(nodes: TreeTag[]) {
        for (const node of nodes) {
            result.push(node.data.tagId);
            if (node.children && node.children.length > 0) {
                traverse(node.children);
            }
        }
    }
    
    traverse(treeData);
    return result;
}

/**
 * Node component for react-arborist tree
 */
function TagNode({ node, style, dragHandle, treeData }: { 
    node: NodeApi<TreeTag>; 
    style: React.CSSProperties;
    dragHandle?: any; // Let's use any for now to avoid type conflicts
    treeData: TreeTag[];
}) {
    const { 
        selectedTagIds, 
        setSelectedTagIds, 
        lastSelectedTagId, 
        setLastSelectedTagId,
        isTagSelected 
    } = useTagUI();
    const { showContextMenu } = useContextMenu();
    
    const tag = node.data.data;
    const hasChildren = node.data.children && node.data.children.length > 0;
    const isSelected = isTagSelected(tag.tagId);

    const handleMainClick = (e: React.MouseEvent) => {
        e.stopPropagation();
        e.preventDefault(); // Prevent tree activation that causes scrolling
        
        // Focus the tree container for keyboard navigation
        const treeContainer = document.querySelector('[data-tag-tree]') as HTMLElement;
        treeContainer?.focus();
        
        if (e.ctrlKey || e.metaKey) {
            // Ctrl+Click: Toggle selection (like VS Code)
            if (isSelected) {
                setSelectedTagIds(prev => prev.filter(id => id !== tag.tagId));
            } else {
                setSelectedTagIds(prev => [...prev, tag.tagId]);
            }
            setLastSelectedTagId(tag.tagId);
        } else if (e.shiftKey && lastSelectedTagId) {
            // Shift+Click: Range selection (like VS Code)
            const allVisibleTags = getAllVisibleTagIds(treeData);
            const lastIndex = allVisibleTags.indexOf(lastSelectedTagId);
            const currentIndex = allVisibleTags.indexOf(tag.tagId);
            
            if (lastIndex !== -1 && currentIndex !== -1) {
                const startIndex = Math.min(lastIndex, currentIndex);
                const endIndex = Math.max(lastIndex, currentIndex);
                const rangeSelection = allVisibleTags.slice(startIndex, endIndex + 1);
                setSelectedTagIds(rangeSelection);
            } else {
                setSelectedTagIds([tag.tagId]);
            }
            setLastSelectedTagId(tag.tagId);
        } else {
            // Regular click: Single selection (like VS Code)
            setSelectedTagIds([tag.tagId]);
            setLastSelectedTagId(tag.tagId);
        }
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
                width: '100%',
                paddingY: '4px',
                paddingRight: '8px',
                cursor: 'pointer',
                borderRadius: '4px',
                backgroundColor: isSelected ? 'primary.main' : 'transparent',
                color: isSelected ? 'primary.contrastText' : 'inherit',
                '&:hover': {
                    backgroundColor: isSelected ? 'primary.dark' : 'action.hover',
                },
                transition: 'all 0.2s',
                // VS Code-like selection styling
                ...(isSelected && {
                    boxShadow: 'inset 3px 0 0 currentColor',
                }),
            }}
        >
            {/* Drag Handle - Only show if dragHandle is available */}
            {dragHandle && (
                <div
                    ref={(el) => {
                        // Only handle dragHandle if it exists and is a function
                        // This prevents the React DnD error by ensuring we only pass DOM elements
                        try {
                            if (dragHandle && typeof dragHandle === 'function' && el) {
                                dragHandle(el);
                            }
                        } catch (error) {
                            console.warn('Error setting dragHandle:', error);
                            // Safely ignore dragHandle errors to prevent React DnD crashes
                        }
                    }}
                    onClick={(e) => e.stopPropagation()} // Prevent click from bubbling
                    style={{ 
                        display: 'flex',
                        alignItems: 'center',
                        marginRight: '4px',
                        cursor: 'grab',
                    }}
                    onMouseDown={(e) => {
                        e.currentTarget.style.cursor = 'grabbing';
                    }}
                    onMouseUp={(e) => {
                        e.currentTarget.style.cursor = 'grab';
                    }}
                >
                    <DragIcon 
                        fontSize="small" 
                        sx={{ 
                            color: isSelected ? 'primary.contrastText' : 'action.disabled',
                            opacity: isSelected ? 0.7 : 1,
                        }} 
                    />
                </div>
            )}

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
                    color: isSelected ? 'primary.contrastText' : 'inherit',
                }}
            >
                {hasChildren ? (
                    node.isOpen ? <ExpandMoreIcon fontSize="small" /> : <ChevronRightIcon fontSize="small" />
                ) : null}
            </IconButton>

            {/* Tag Icon */}
            <Box sx={{ marginRight: '8px', display: 'flex', alignItems: 'center' }}>
                {hasChildren ? (
                    node.isOpen ? 
                        <FolderOpenIcon 
                            fontSize="small" 
                            sx={{ color: isSelected ? 'primary.contrastText' : 'inherit' }}
                        /> : 
                        <FolderIcon 
                            fontSize="small" 
                            sx={{ color: isSelected ? 'primary.contrastText' : 'inherit' }}
                        />
                ) : (
                    <TagIcon 
                        fontSize="small" 
                        sx={{ 
                            color: isSelected ? 'primary.contrastText' : (tag.color || 'action.active')
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
                            color: isSelected ? 'primary.contrastText' : 'text.primary',
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
                            sx={{ 
                                display: 'block', 
                                textAlign: 'left',
                                color: isSelected ? 'primary.contrastText' : 'text.secondary',
                                opacity: isSelected ? 0.8 : 1,
                            }}
                            noWrap
                        >
                            {tag.description}
                        </Typography>
                    )}
                </Box>
            </Box>


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
 * Selection info component
 */
function SelectionInfo({ selectedCount, totalCount }: { selectedCount: number; totalCount: number }) {
    if (selectedCount === 0) return null;
    
    return (
        <Box sx={{ 
            padding: '8px 16px',
            backgroundColor: 'primary.light',
            color: 'primary.contrastText',
            borderRadius: '4px',
            marginBottom: '8px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
        }}>
            <Typography variant="caption">
                {selectedCount} of {totalCount} tags selected
            </Typography>
            <Typography variant="caption" sx={{ opacity: 0.8 }}>
                Ctrl+Click to toggle • Shift+Click for range • Ctrl+A to select all
            </Typography>
        </Box>
    );
}

/**
 * Main TagTree component using react-arborist
 */
export function TagTree({ onTagClick, includeShared = true }: TagTreeProps) {
    const { data: tags, isLoading, error } = useTagTree(includeShared);
    const { 
        searchText, 
        selectedTagIds, 
        setSelectedTagIds, 
        setLastSelectedTagId,
        clearSelection 
    } = useTagUI();
    const [draggedNode, setDraggedNode] = useState<NodeApi<TreeTag> | null>(null);
    const treeContainerRef = React.useRef<HTMLDivElement>(null);

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

    // Get all visible tag IDs for keyboard navigation
    const allVisibleTagIds = useMemo(() => {
        return getAllVisibleTagIds(treeData);
    }, [treeData]);

    // Keyboard navigation (VS Code-like)
    React.useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.target !== document.body && !(e.target as Element).closest('[data-tag-tree]')) {
                return; // Only handle when tree is focused
            }

            const currentSelection = selectedTagIds;
            const lastSelected = currentSelection.length > 0 ? currentSelection[currentSelection.length - 1] : null;
            const currentIndex = lastSelected ? allVisibleTagIds.indexOf(lastSelected) : -1;

            switch (e.key) {
                case 'ArrowUp':
                    e.preventDefault();
                    if (currentIndex > 0) {
                        const newTagId = allVisibleTagIds[currentIndex - 1];
                        if (e.shiftKey && currentSelection.length > 0) {
                            // Extend selection upward
                            const firstSelected = currentSelection[0];
                            const firstIndex = allVisibleTagIds.indexOf(firstSelected);
                            const startIndex = Math.min(firstIndex, currentIndex - 1);
                            const endIndex = Math.max(firstIndex, currentIndex - 1);
                            const rangeSelection = allVisibleTagIds.slice(startIndex, endIndex + 1);
                            setSelectedTagIds(rangeSelection);
                        } else {
                            setSelectedTagIds([newTagId]);
                        }
                        setLastSelectedTagId(newTagId);
                    }
                    break;

                case 'ArrowDown':
                    e.preventDefault();
                    if (currentIndex < allVisibleTagIds.length - 1) {
                        const newTagId = allVisibleTagIds[currentIndex + 1];
                        if (e.shiftKey && currentSelection.length > 0) {
                            // Extend selection downward
                            const firstSelected = currentSelection[0];
                            const firstIndex = allVisibleTagIds.indexOf(firstSelected);
                            const startIndex = Math.min(firstIndex, currentIndex + 1);
                            const endIndex = Math.max(firstIndex, currentIndex + 1);
                            const rangeSelection = allVisibleTagIds.slice(startIndex, endIndex + 1);
                            setSelectedTagIds(rangeSelection);
                        } else {
                            setSelectedTagIds([newTagId]);
                        }
                        setLastSelectedTagId(newTagId);
                    }
                    break;

                case 'a':
                    if (e.ctrlKey || e.metaKey) {
                        e.preventDefault();
                        // Ctrl+A: Select all
                        setSelectedTagIds(allVisibleTagIds);
                        setLastSelectedTagId(allVisibleTagIds[allVisibleTagIds.length - 1]);
                    }
                    break;

                case 'Escape':
                    // Clear selection
                    clearSelection();
                    setLastSelectedTagId(null);
                    break;
            }
        };

        document.addEventListener('keydown', handleKeyDown);
        return () => document.removeEventListener('keydown', handleKeyDown);
    }, [selectedTagIds, allVisibleTagIds, setSelectedTagIds, setLastSelectedTagId, clearSelection]);

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
        <Box 
            ref={treeContainerRef}
            data-tag-tree 
            tabIndex={0}
            sx={{ 
                padding: '16px', 
                height: '100%',
                '&:focus': {
                    outline: 'none',
                },
                '&:focus-within': {
                    backgroundColor: 'action.hover',
                    transition: 'background-color 0.2s',
                },
            }}
        >
            <SelectionInfo 
                selectedCount={selectedTagIds.length} 
                totalCount={allVisibleTagIds.length} 
            />
            <Tree<TreeTag>
                data={treeData}
                openByDefault={true}
                width="100%"
                height={600}
                indent={24}
                rowHeight={40}
                overscanCount={8}
                // onMove={handleMove} // Temporarily disable drag & drop to fix React DnD error
                disableMultiSelection={false}
                disableEdit={true}  // Disable editing to prevent DnD issues
                selection="" // Disable internal selection to prevent auto-scrolling
            >
                {({ node, style, dragHandle }) => {
                    // Wrap in div to ensure native DOM element for DnD
                    return (
                        <div style={style}>
                            <TagNode 
                                node={node} 
                                style={{ height: '100%' }}
                                dragHandle={undefined} // Disable dragHandle temporarily
                                treeData={treeData}
                            />
                        </div>
                    );
                }}
            </Tree>
        </Box>
    );
}