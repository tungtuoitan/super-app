/**
 * WorkspaceTree Component - Hierarchical tree view of tags using react-arborist
 * Similar to NoteGrid but displays tags in a tree structure with advanced tree functionality
 */

import React, { useMemo, useState } from 'react';
import { Tree, NodeApi } from 'react-arborist';
import { useDragDropManager } from 'react-dnd';
import {
    Box,
    Typography,
    Skeleton,
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
    WorkspacesOutlined as WorkspaceIcon,
    Add as AddIcon,
    Refresh as RefreshIcon,
    UnfoldLess as CollapseAllIcon
} from '@mui/icons-material';

import { useWorkspaceTagTree, useBatchMoveTag } from '../hooks/useTags';
import { useTagUI } from '../store/TagUIContext';
import { useContextMenu } from '@/shared/contexts';
import type { Tag } from '../types/tag.types';
import { AddTagDialog } from './AddTagDialog';

interface WorkspaceTreeProps {
    onTagClick?: (tag: Tag) => void;
    includeShared?: boolean; // DEPRECATED: No longer used, kept for backward compatibility
    workspaceId: number; // REQUIRED: Workspace ID for workspace-specific tree
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
 * Helper function to check if targetId is a descendant of parentId
 * Used to prevent circular dependencies when moving tags
 */
function isDescendant(targetId: number, potentialParentId: number, treeData: TreeTag[]): boolean {
    // Find the potential parent node
    const parentNode = getAllTagsFlattened(treeData).find(t => t.data.tagId === potentialParentId);

    if (!parentNode) return false;

    // Recursively check if targetId exists in the subtree of parentNode
    function checkSubtree(node: TreeTag): boolean {
        if (node.data.tagId === targetId) {
            return true; // Found targetId in descendants
        }

        if (node.children && node.children.length > 0) {
            return node.children.some(child => checkSubtree(child));
        }

        return false;
    }

    return checkSubtree(parentNode);
}

/**
 * Helper function to find a tag by ID in the tag array
 */
function findTagById(tags: Tag[], targetId: number): Tag | undefined {
    for (const tag of tags) {
        if (tag.tagId === targetId) {
            return tag;
        }
        if (tag.children && tag.children.length > 0) {
            const found = findTagById(tag.children, targetId);
            if (found) return found;
        }
    }
    return undefined;
}

/**
 * Helper function to flatten tree data for lookup
 */
function getAllTagsFlattened(treeData: TreeTag[]): TreeTag[] {
    const result: TreeTag[] = [];

    function traverse(nodes: TreeTag[]) {
        for (const node of nodes) {
            result.push(node);
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
function TagNode({ 
    node, 
    style, 
    dragHandle, 
    treeData, 
    onNewFolder, 
    onRefresh, 
    onCollapseAll
}: { 
    node: NodeApi<TreeTag>; 
    style: React.CSSProperties;
    dragHandle?: any; // Let's use any for now to avoid type conflicts
    treeData: TreeTag[];
    onNewFolder?: () => void;
    onRefresh?: () => void;
    onCollapseAll?: () => void;
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
    const isWorkspaceRoot = tag.tagId < 0; // Workspace root node has negative ID

    // Check if this node is being dragged
    const isDragging = node.state.isDragging;
    
    // Check if this node is a valid drop target (being dragged over)
    const isDropTarget = node.state.willReceiveDrop;

    const handleMainClick = (e: React.MouseEvent) => {
        e.stopPropagation();
        e.preventDefault(); // Prevent tree activation that causes scrolling
        
        // Don't allow selection of workspace root node
        if (isWorkspaceRoot) {
            // Only allow expand/collapse for workspace root
            if (hasChildren) {
                node.toggle();
            }
            return;
        }
        
        // Focus the tree container for keyboard navigation
        const treeContainer = document.querySelector('[data-workspace-tree]') as HTMLElement;
        treeContainer?.focus();
        
        if (e.ctrlKey || e.metaKey) {
            // Ctrl+Click: Toggle selection (like VS Code)
            if (isSelected) {
                setSelectedTagIds(prev => prev.filter(id => id !== tag.tagId));
                // Sync with react-arborist
                node.deselect();
            } else {
                setSelectedTagIds(prev => [...prev, tag.tagId]);
                // Sync with react-arborist (multi-select mode)
                node.selectMulti();
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
                // Sync with react-arborist (select range ending at this node)
                node.selectMulti();
            } else {
                setSelectedTagIds([tag.tagId]);
                node.select();
            }
            setLastSelectedTagId(tag.tagId);
        } else {
            // Regular click: Single selection + toggle expand/collapse if has children (like VS Code)
            setSelectedTagIds([tag.tagId]);
            setLastSelectedTagId(tag.tagId);
            // Sync with react-arborist (single select - clears others)
            node.select();

            // Toggle expand/collapse if node has children
            if (hasChildren) {
                node.toggle();
            }
        }
    };

    const handleRightClick = (e: React.MouseEvent) => {
        e.stopPropagation(); // Prevent bubbling to parent
        e.preventDefault(); // Prevent default context menu
        
        // Don't show context menu for workspace root
        if (isWorkspaceRoot) {
            return;
        }
        
        // Open tag-specific context menu with tag data
        showContextMenu(e, 'tag', tag);
    };
    
    return (
        <Box
            ref={(el) => {
                // Make entire node draggable (VS Code style - no special cursor)
                if (dragHandle && typeof dragHandle === 'function' && el) {
                    try {
                        dragHandle(el);
                    } catch (error) {
                        console.warn('Error setting dragHandle:', error);
                    }
                }
            }}
            style={style}
            onClick={handleMainClick}
            onContextMenu={handleRightClick}
            sx={{
                display: 'flex',
                alignItems: 'center',
                height: '100%',
                width: '100%',
                paddingY: '4px',
                paddingLeft: `${node.level * 8}px`, // VSCode-style indentation: 8px per level
                paddingRight: '8px',
                cursor: 'pointer', // Always pointer cursor like VS Code
                borderRadius: '4px',
                // Dragging state: Semi-transparent for selected items being dragged
                opacity: isDragging ? 0.4 : 1,
                transition: 'opacity 0.2s ease-in-out, background-color 0.15s ease-in-out, outline-color 0.15s ease-in-out, box-shadow 0.15s ease-in-out',
                // Selected: Slightly lighter than hover
                backgroundColor: isSelected ? 'rgba(90, 93, 94, 0.45)' : (isWorkspaceRoot ? 'transparent' : 'transparent'),
                color: isSelected ? '#ffffff' : 'inherit',
                fontWeight: isWorkspaceRoot ? 600 : 'inherit',
                // Hover: Base hover state
                '&:hover': {
                    backgroundColor: isSelected ? 'rgba(90, 93, 94, 0.45)' : (isWorkspaceRoot ? 'rgba(90, 93, 94, 0.31)' : 'rgba(90, 93, 94, 0.31)'),
                },
                // VS Code-like selection styling with outline (no UI shift)
                outline: isSelected ? '1px solid rgba(255, 255, 255, 0.12)' : 'none',
                outlineOffset: '-1px', // Keep outline inside the box
                boxShadow: isSelected ? 'inset 3px 0 0 #007acc' : 'none',
                // Dragging indicator - blue highlight for all selected items
                ...(isDragging && isSelected && {
                    backgroundColor: 'rgba(0, 122, 204, 0.3)',
                    outline: '1px solid rgba(0, 122, 204, 0.6)',
                    outlineOffset: '-1px',
                }),
                // Drop target indicator - hover-like highlight (same as hover state)
                ...(isDropTarget && {
                    backgroundColor: 'rgba(90, 93, 94, 0.31)',
                    outline: '1px solid rgba(0, 122, 204, 0.5)',
                    outlineOffset: '-1px',
                    boxShadow: 'inset 0 0 0 1px rgba(0, 122, 204, 0.3)',
                }),
            }}
        >

            {/* Expand/Collapse Button */}
            <IconButton
                size="small"
                onClick={(e) => {
                    e.stopPropagation();
                    e.preventDefault();
                    node.toggle();
                }}
                sx={{ 
                    // marginRight: '4px',
                    padding: '2px',
                    visibility: hasChildren ? 'visible' : 'hidden',
                    color: '#cccccc', // Keep icon color consistent
                }}
            >
                {hasChildren ? (
                    node.isOpen ? <ExpandMoreIcon fontSize="small" /> : <ChevronRightIcon fontSize="small" />
                ) : null}
            </IconButton>

            {/* Tag Icon */}
            <Box sx={{ marginRight: '8px', display: 'flex', alignItems: 'center' }}>
                {/* Workspace root node */}
                {tag.tagId < 0 ? (
        
        <WorkspaceIcon 
                        fontSize="small" 
                        sx={{ 
                            color: tag.color || '#75beff' // Keep original color
                        }} 
                    />
                ) : hasChildren ? (
                    node.isOpen ? 
                        <FolderOpenIcon 
                            fontSize="small" 
                            sx={{ color: '#dcb67a' }} // Keep folder color
                        /> : 
                        <FolderIcon 
                            fontSize="small" 
                            sx={{ color: '#dcb67a' }} // Keep folder color
                        />
                ) : (
                    <TagIcon 
                        fontSize="small" 
                        sx={{ 
                            color: tag.color || '#75beff' // Keep original tag color
                        }} 
                    />
                )}
            </Box>

            {/* Tag Info - Flexbox with 2 items */}
            <Box sx={{ flex: 1, minWidth: 0, display: 'flex', alignItems: 'center', gap: '8px', height: '100%' }}>
                {/* Item 1: Main tag info (icon, name, indicators) - 30% width */}
                <Box sx={{ 
                    width: '100%', 
                    minWidth: 0,
                    display: 'flex', 
                    // border: '1px solid red',
                    alignItems: 'center', 
                    gap: '8px' 
                }}>
                    <Typography
                        variant="body2"
                        sx={{
                            fontWeight: hasChildren ? 600 : 400,
                            color: '#cccccc', // Keep text color consistent
                            textTransform: isWorkspaceRoot ? 'uppercase' : 'none',
                            letterSpacing: isWorkspaceRoot ? '0.5px' : 'normal',
                        }}
                        noWrap
                    >
                        {tag.name}
                    </Typography>

                </Box>

                {/* Item 2: Description - remaining width */}
                {/* <Box sx={{ flex: 1, minWidth: 0 }}>
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
                </Box> */}
            </Box>

            {/* Action Buttons (only for workspace root) */}
            {isWorkspaceRoot && (
                <Box 
                    sx={{ 
                        display: 'flex', 
                        gap: '2px',
                        marginLeft: 'auto',
                        opacity: 0.7,
                        '&:hover': {
                            opacity: 1,
                        },
                    }}
                    onClick={(e) => e.stopPropagation()} // Prevent node selection when clicking buttons
                >
                    <Tooltip title="Add Tag">
                        <IconButton
                            size="small"
                            onClick={(e) => {
                                e.stopPropagation();
                                onNewFolder?.(); // Unified "Add Tag" action
                            }}
                            sx={{
                                padding: '4px',
                                color: '#cccccc', // Keep icon color consistent
                                '&:hover': {
                                    backgroundColor: 'rgba(90, 93, 94, 0.31)',
                                },
                            }}
                        >
                            <AddIcon fontSize="small" />
                        </IconButton>
                    </Tooltip>

                    <Tooltip title="Refresh">
                        <IconButton
                            size="small"
                            onClick={(e) => {
                                e.stopPropagation();
                                onRefresh?.();
                            }}
                            sx={{
                                padding: '4px',
                                color: '#cccccc', // Keep icon color consistent
                                '&:hover': {
                                    backgroundColor: 'rgba(90, 93, 94, 0.31)',
                                },
                            }}
                        >
                            <RefreshIcon fontSize="small" />
                        </IconButton>
                    </Tooltip>

                    <Tooltip title="Collapse All">
                        <IconButton
                            size="small"
                            onClick={(e) => {
                                e.stopPropagation();
                                onCollapseAll?.();
                            }}
                            sx={{
                                padding: '4px',
                                color: '#cccccc', // Keep icon color consistent
                                '&:hover': {
                                    backgroundColor: 'rgba(90, 93, 94, 0.31)',
                                },
                            }}
                        >
                            <CollapseAllIcon fontSize="small" />
                        </IconButton>
                    </Tooltip>
                </Box>
            )}


        </Box>
    );
}

/**
 * Loading skeleton for WorkspaceTree
 */
function WorkspaceTreeSkeleton() {
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
 * Empty state for WorkspaceTree
 */
function WorkspaceTreeEmpty() {
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
 * NOTE: All nodes must have children array (even if empty) to allow drop into them
 */
function transformTagsToTreeData(tags: Tag[]): TreeTag[] {
    return tags.map(tag => ({
        id: tag.tagId.toString(),
        name: tag.name,
        data: tag,
        // Always provide children array (empty if no children) to enable drop into nodes
        children: tag.children && tag.children.length > 0 ? transformTagsToTreeData(tag.children) : [],
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
 * Custom Drag Preview Component (VS Code style)
 * Shows tag name when dragging 1 item, shows count when dragging multiple items
 */
function CustomDragPreview({ offset, mouse, id, dragIds, isDragging, treeData }: {
    offset: { x: number; y: number } | null;
    mouse: { x: number; y: number } | null;
    id: string | null;
    dragIds: string[];
    isDragging: boolean;
    treeData: TreeTag[];
}) {
    if (!isDragging || !offset) return null;

    // Count of items being dragged
    const itemCount = dragIds?.length || 0;
    
    // Determine display text based on count
    const getDisplayText = (): string => {
        // Multiple items: show count only
        if (itemCount > 1) {
            return `${itemCount}`;
        }
        
        // Single item: show tag name
        if (itemCount === 1 && id) {
            const allTags = getAllTagsFlattened(treeData);
            const tag = allTags.find(t => t.id === id);
            return tag?.name || 'Moving...';
        }
        
        return 'Moving...';
    };

    const displayText = getDisplayText();

    return (
        <Box
            sx={{
                position: 'fixed',
                pointerEvents: 'none',
                zIndex: 10000,
                left: 0,
                top: 0,
                width: '100%',
                height: '100%',
            }}
        >
            {/* Preview */}
            <Box
                sx={{
                    position: 'absolute',
                    transform: `translate(${offset.x}px, ${offset.y}px)`,
                    backgroundColor: 'rgba(30, 30, 30, 0.95)',
                    border: '1px solid rgba(255, 255, 255, 0.2)',
                    borderRadius: '6px',
                    padding: '8px 12px',
                    minWidth: itemCount > 1 ? '60px' : '200px',
                    maxWidth: '300px',
                    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.5)',
                }}
            >
                <Box sx={{ display: 'flex', alignItems: 'center', gap: '8px', justifyContent: itemCount > 1 ? 'center' : 'flex-start' }}>
                    {/* Icon */}
                    <TagIcon sx={{ fontSize: '16px', color: '#75beff' }} />

                    {/* Text: Show tag name for single item, count for multiple */}
                    <Typography
                        variant="body2"
                        sx={{
                            color: '#cccccc',
                            fontWeight: itemCount > 1 ? 700 : 500,
                            fontSize: itemCount > 1 ? '16px' : '14px',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                        }}
                    >
                        {displayText}
                    </Typography>
                </Box>
            </Box>
        </Box>
    );
}

/**
 * Main WorkspaceTree component using react-arborist
 */
export function WorkspaceTree({ workspaceId }: WorkspaceTreeProps) {
    // Only use workspace tree API - the old /tree endpoint is deprecated
    if (!workspaceId) {
        throw new Error('workspaceId is required. The old /tree endpoint is no longer supported.');
    }
    
    const workspaceTreeQuery = useWorkspaceTagTree(workspaceId);
    const { data, isLoading, error } = workspaceTreeQuery;
    const batchMoveTagMutation = useBatchMoveTag();
    
    // Extract tags from workspace or use directly
    const tags = useMemo(() => {
        if (!data) return undefined;
        
        // If workspace data, extract tags
        if ('tags' in data && 'workspaceId' in data) {
            return data.tags;
        }
        
        // Otherwise it's already Tag[]
        return data as Tag[];
    }, [data]);
    
    const {
        searchText,
        selectedTagIds,
        setSelectedTagIds,
        setLastSelectedTagId,
        clearSelection,
        // Use context state for create dialog
        isCreateDialogOpen,
        openCreateDialog,
        closeCreateDialog,
        parentTagForCreate,
    } = useTagUI();
    const [isDragging, setIsDragging] = useState(false);
    const treeContainerRef = React.useRef<HTMLDivElement>(null);
    const treeRef = React.useRef<any>(null);
    const manager = useDragDropManager();
    
    // Workspace info is available in data directly when needed

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
        
        // Always wrap tags under a workspace root node (workspace mode only)
        if (data && 'workspaceId' in data) {
            const workspaceData = data;
            const workspaceRootTag: Tag = {
                tagId: -workspaceData.workspaceId, // Negative ID to distinguish from real tags
                name: workspaceData.name,
                description: workspaceData.description,
                color: workspaceData.color,
                createdAt: workspaceData.createdAt,
                isActive: !workspaceData.isArchived,
                depth: 0,
                id: -workspaceData.workspaceId,
                isArchived: workspaceData.isArchived,
                children: filteredTags,
                isExpanded: true,
            };
            
            return transformTagsToTreeData([workspaceRootTag]);
        }
        
        return transformTagsToTreeData(filteredTags);
    }, [tags, searchText, data]);

    // Get all visible tag IDs for keyboard navigation
    const allVisibleTagIds = useMemo(() => {
        return getAllVisibleTagIds(treeData);
    }, [treeData]);

    // Keyboard navigation (VS Code-like)
    React.useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.target !== document.body && !(e.target as Element).closest('[data-workspace-tree]')) {
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

    // Handle selection changes from react-arborist
    const handleSelectionChange = (nodes: NodeApi<TreeTag>[]) => {
        const selectedIds = nodes.map(node => node.id);
        console.log('🎯 Tree selection changed:', selectedIds);
        const tagIds = selectedIds.map(id => parseInt(id)).filter(id => id > 0); // Filter out workspace nodes
        setSelectedTagIds(tagIds);
        if (tagIds.length > 0) {
            setLastSelectedTagId(tagIds[tagIds.length - 1]);
        }
    };

    // Handle drag and drop - NOW SUPPORTS MULTI-ITEM DRAG
    const handleMove = async (args: { dragIds: string[]; parentId: string | null; index: number }) => {
        console.log('🔄 Tree Node Move Event (Multi-Drag):', {
            draggedTagIds: args.dragIds,
            dragCount: args.dragIds.length,
            newParentId: args.parentId || 'root',
            newIndex: args.index,
        });

        try {
            // Set dragging state
            setIsDragging(true);

            // Convert string IDs to numbers
            let tagIds = args.dragIds.map(id => parseInt(id));

            // VS CODE BEHAVIOR: Filter out descendants of selected nodes
            // If moving both parent P and child t1, only move P (t1 will follow automatically)
            tagIds = tagIds.filter(tagId => {
                // Check if this tag is a descendant of any other selected tag
                const isDescendantOfOtherSelected = tagIds.some(otherTagId => {
                    if (otherTagId === tagId) return false; // Don't compare with itself
                    return isDescendant(tagId, otherTagId, treeData);
                });
                return !isDescendantOfOtherSelected; // Keep only if NOT a descendant
            });

            console.log('📊 Filtered tag IDs (excluding descendants):', {
                original: args.dragIds,
                filtered: tagIds,
                removedCount: args.dragIds.length - tagIds.length
            });

            // If all selected items are descendants of other selected items, nothing to move
            if (tagIds.length === 0) {
                console.log('⚠️ All selected tags are descendants of other selected tags - nothing to move');
                setIsDragging(false);
                return;
            }

            // Parse newParentId: null means workspace root level (valid)
            // Negative ID means workspace node itself (invalid)
            let newParentId: number | undefined = undefined;
            if (args.parentId) {
                const parsedParentId = parseInt(args.parentId);
                // Negative IDs are workspace nodes - convert to null for root level
                if (parsedParentId < 0) {
                    newParentId = undefined; // Root level in workspace
                } else {
                    newParentId = parsedParentId;
                }
            }

            // VALIDATION: Prevent invalid moves (VS Code behavior)

            // 1. Check for workspace root nodes (negative IDs) - cannot move workspace itself
            const hasWorkspaceRoot = tagIds.some(id => id < 0);
            if (hasWorkspaceRoot) {
                console.warn('⚠️ Cannot move workspace root node');
                setIsDragging(false);
                return;
            }

            // 2. VS CODE: Don't allow moving into one of the items being moved
            // If target parent is one of the selected items, abort
            if (newParentId !== undefined && tagIds.includes(newParentId)) {
                console.warn('⚠️ Cannot move items into one of the selected items');
                setIsDragging(false);
                return;
            }

            // 3. VS CODE: Don't allow moving into a child of any selected item
            // If target parent is a descendant of any item being moved, abort
            if (newParentId !== undefined) {
                const isTargetDescendantOfSelected = tagIds.some(draggedId => {
                    return isDescendant(newParentId!, draggedId, treeData);
                });

                if (isTargetDescendantOfSelected) {
                    console.warn('⚠️ Cannot move items into a descendant of selected items');
                    setIsDragging(false);
                    return;
                }
            }

            // 4. VS CODE: Don't allow dropping between items in the same selection
            // Get siblings at target position to check if we're dropping within selection
            const targetParentNode = newParentId !== undefined
                ? getAllTagsFlattened(treeData).find(t => t.data.tagId === newParentId)
                : null;

            // Get siblings (children of target parent, or root level if no parent)
            const targetSiblings = targetParentNode
                ? (targetParentNode.children || [])
                : treeData.filter(t => parseInt(t.id) > 0); // Exclude workspace nodes

            // Check if we're trying to drop between selected items
            if (args.index >= 0 && args.index <= targetSiblings.length) {
                // Get items around the drop position
                const itemBefore = args.index > 0 ? targetSiblings[args.index - 1] : null;
                const itemAfter = args.index < targetSiblings.length ? targetSiblings[args.index] : null;

                const itemBeforeId = itemBefore ? parseInt(itemBefore.id) : null;
                const itemAfterId = itemAfter ? parseInt(itemAfter.id) : null;

                // Check if both surrounding items are in the selection
                const bothInSelection =
                    (itemBeforeId && tagIds.includes(itemBeforeId)) &&
                    (itemAfterId && tagIds.includes(itemAfterId));

                // Check if either surrounding item is in the selection and we're moving to same parent
                const allOriginalIds = args.dragIds.map(id => parseInt(id)); // Use original IDs before filtering
                const isSameParent = targetSiblings.some(sibling =>
                    allOriginalIds.includes(parseInt(sibling.id))
                );

                if (bothInSelection || (isSameParent && (
                    (itemBeforeId && tagIds.includes(itemBeforeId)) ||
                    (itemAfterId && tagIds.includes(itemAfterId))
                ))) {
                    console.warn('⚠️ Cannot drop between items in the same selection');
                    setIsDragging(false);
                    return;
                }
            }

            // BATCH MOVE: Move all selected items using optimized batch API
            console.log(`📤 Batch moving ${tagIds.length} tag(s) to parent ${newParentId || 'root'} at index ${args.index}`);

            await batchMoveTagMutation.mutateAsync({
                tagIds,
                newParentId,
                startIndex: args.index,
            });

            console.log(`✅ Successfully batch moved ${tagIds.length} tag(s)`);

            // VS Code behavior: Re-select the moved items after move completes
            // If single item moved, select it; if multiple items moved, select all of them
            setSelectedTagIds(tagIds);
            if (tagIds.length > 0) {
                setLastSelectedTagId(tagIds[tagIds.length - 1]);
            }
            console.log(`✅ Re-selected moved item(s): ${tagIds.join(', ')}`);

        } catch (error) {
            console.error('❌ Failed to move tag(s):', error);
            // Error will be handled by React Query's onError
            // Tree will revert to previous state on refetch
        } finally {
            setIsDragging(false);
        }
    };
    
    // Handle workspace action buttons
    const handleNewFolder = () => {
        console.log('📁 Add Tag clicked');
        
        // Use currently selected tag as parent (VS Code-like behavior)
        // If a tag is selected, use it as parent
        // Otherwise, default to root level (undefined)
        const parentId = selectedTagIds.length > 0 
            ? selectedTagIds[0] // Use first selected tag as parent
            : undefined; // Root level if nothing selected
            
        // Find the parent tag object if parentId exists
        const parentTag = parentId 
            ? findTagById(tags || [], parentId)
            : undefined;
            
        openCreateDialog(parentTag);
        
        console.log('📁 Parent tag for new item:', parentTag?.name || 'root');
    };
    
    const handleRefresh = () => {
        console.log('🔄 Refresh clicked');
        // Re-fetch the workspace tree data
        workspaceTreeQuery.refetch();
    };
    
    const handleCollapseAll = () => {
        console.log('📂 Collapse All clicked');
        // Close all nodes in the tree
        if (treeRef.current) {
            treeRef.current.closeAll();
        }
    };

    // Loading state
    if (isLoading) {
        return <WorkspaceTreeSkeleton />;
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
        return <WorkspaceTreeEmpty />;
    }

    // Main tree render with react-arborist
    return (
        <Box 
            ref={treeContainerRef}
            data-workspace-tree 
            tabIndex={0}
            sx={{ 
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
                padding: '16px',
                position: 'relative', // For loading overlay
                '&:focus': {
                    outline: 'none',
                },
                '&:focus-within': {
                    backgroundColor: 'action.hover',
                    transition: 'background-color 0.2s',
                },
            }}
        >
            {/* Loading overlay when dragging */}
            {(isDragging || batchMoveTagMutation.isPending) && (
                <Box
                    sx={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        backgroundColor: 'rgba(0, 0, 0, 0.05)',
                        zIndex: 1000,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        pointerEvents: 'none',
                    }}
                >
                    <Box
                        sx={{
                            backgroundColor: 'background.paper',
                            padding: '16px 24px',
                            borderRadius: '8px',
                            boxShadow: 2,
                            display: 'flex',
                            alignItems: 'center',
                            gap: '12px',
                        }}
                    >
                        <Box
                            sx={{
                                width: '20px',
                                height: '20px',
                                border: '3px solid',
                                borderColor: 'primary.main',
                                borderTopColor: 'transparent',
                                borderRadius: '50%',
                                animation: 'spin 1s linear infinite',
                                '@keyframes spin': {
                                    '0%': { transform: 'rotate(0deg)' },
                                    '100%': { transform: 'rotate(360deg)' },
                                },
                            }}
                        />
                        <Typography variant="body2">Moving tag...</Typography>
                    </Box>
                </Box>
            )}

            {/* <SelectionInfo 
                selectedCount={selectedTagIds.length} 
                totalCount={allVisibleTagIds.length} 
            /> */}
            <Tree<TreeTag>
                ref={treeRef}
                data={treeData}
                openByDefault={true}
                width="100%"
                height={600}
                indent={24}
                rowHeight={40}
                overscanCount={8}
                dndManager={manager}
                onMove={handleMove}
                onSelect={handleSelectionChange}
                disableMultiSelection={false}
                disableEdit={true}
                renderDragPreview={(props) => <CustomDragPreview {...props} treeData={treeData} />}
            >
                {({ node, style, dragHandle }) => {
                    // Wrap in div to ensure native DOM element for DnD
                    return (
                        <div style={style}>
                            <TagNode
                                node={node}
                                style={{ height: '100%' }}
                                dragHandle={dragHandle}
                                treeData={treeData}
                                onNewFolder={handleNewFolder}
                                onRefresh={handleRefresh}
                                onCollapseAll={handleCollapseAll}
                            />
                        </div>
                    );
                }}
            </Tree>

            {/* Add Tag Dialog */}
            {workspaceId && (
                <AddTagDialog
                    open={isCreateDialogOpen}
                    onClose={closeCreateDialog}
                    workspaceId={workspaceId}
                    parentTagId={parentTagForCreate?.tagId}
                />
            )}
        </Box>
    );
}
