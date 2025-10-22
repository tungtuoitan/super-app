/**
 * TagTree Component - Hierarchical tree view of tags using react-arborist
 * Similar to NoteGrid but displays tags in a tree structure with advanced tree functionality
 */

import React, { useMemo, useState } from 'react';
import { Tree, NodeApi } from 'react-arborist';
import { useDragDropManager } from 'react-dnd';
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
    WorkspacesOutlined as WorkspaceIcon,
    Add as AddIcon,
    Refresh as RefreshIcon,
    UnfoldLess as CollapseAllIcon
} from '@mui/icons-material';

import { useWorkspaceTagTree, useMoveTag } from '../hooks/useTags';
import { useTagUI } from '../store/TagUIContext';
import { useContextMenu } from '@/shared/contexts';
import type { Tag } from '../types/tag.types';
import { AddTagDialog } from './AddTagDialog';

interface TagTreeProps {
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
            // Regular click: Single selection + toggle expand/collapse if has children (like VS Code)
            setSelectedTagIds([tag.tagId]);
            setLastSelectedTagId(tag.tagId);
            
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
                paddingRight: '8px',
                cursor: 'pointer', // Always pointer cursor like VS Code
                borderRadius: '4px',
                backgroundColor: isSelected ? 'primary.main' : (isWorkspaceRoot ? 'action.hover' : 'transparent'),
                color: isSelected ? 'primary.contrastText' : 'inherit',
                fontWeight: isWorkspaceRoot ? 600 : 'inherit',
                '&:hover': {
                    backgroundColor: isSelected ? 'primary.dark' : (isWorkspaceRoot ? 'action.selected' : 'action.hover'),
                },
                // VS Code-like selection styling
                ...(isSelected && {
                    boxShadow: 'inset 3px 0 0 currentColor',
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
                {/* Workspace root node */}
                {tag.tagId < 0 ? (
                    <WorkspaceIcon 
                        fontSize="small" 
                        sx={{ 
                            color: isSelected ? 'primary.contrastText' : (tag.color || 'primary.main')
                        }} 
                    />
                ) : hasChildren ? (
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
                            color: isSelected ? 'primary.contrastText' : 'text.primary',
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
                                color: isSelected ? 'primary.contrastText' : 'inherit',
                                '&:hover': {
                                    backgroundColor: isSelected ? 'rgba(255,255,255,0.1)' : 'action.hover',
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
                                color: isSelected ? 'primary.contrastText' : 'inherit',
                                '&:hover': {
                                    backgroundColor: isSelected ? 'rgba(255,255,255,0.1)' : 'action.hover',
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
                                color: isSelected ? 'primary.contrastText' : 'inherit',
                                '&:hover': {
                                    backgroundColor: isSelected ? 'rgba(255,255,255,0.1)' : 'action.hover',
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
export function TagTree({ onTagClick, includeShared = true, workspaceId }: TagTreeProps) {
    // Only use workspace tree API - the old /tree endpoint is deprecated
    if (!workspaceId) {
        throw new Error('workspaceId is required. The old /tree endpoint is no longer supported.');
    }
    
    const workspaceTreeQuery = useWorkspaceTagTree(workspaceId);
    const { data, isLoading, error } = workspaceTreeQuery;
    const moveTagMutation = useMoveTag();
    
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
    const [draggedNode, setDraggedNode] = useState<NodeApi<TreeTag> | null>(null);
    const [isDragging, setIsDragging] = useState(false);
    const treeContainerRef = React.useRef<HTMLDivElement>(null);
    const treeRef = React.useRef<any>(null);
    const manager = useDragDropManager();
    
    // Extract workspace info (always in workspace mode now)
    const workspaceInfo = useMemo(() => {
        if (data && 'workspaceId' in data) {
            return {
                name: data.name,
                workspaceId: data.workspaceId,
            };
        }
        return null;
    }, [data]);

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
    const handleMove = async (args: { dragIds: string[]; parentId: string | null; index: number }) => {
        console.log('🔄 Tree Node Move Event:', {
            draggedTagIds: args.dragIds,
            newParentId: args.parentId || 'root',
            newIndex: args.index,
        });

        // Find the dragged tag name for better logging
        const draggedTag = treeData.find(t => t.id === args.dragIds[0]);
        const parentTag = args.parentId ?
            getAllTagsFlattened(treeData).find(t => t.id === args.parentId) : null;

        console.log(`📦 Moving "${draggedTag?.name || 'Unknown'}" to ${parentTag ? `"${parentTag.name}"` : 'root'} at position ${args.index}`);

        try {
            // Set dragging state
            setIsDragging(true);
            
            // Get the tagId from the dragged node
            const tagId = parseInt(args.dragIds[0]);
            
            // Workspace root node has negative ID - don't allow moving it
            if (tagId < 0) {
                console.warn('⚠️ Cannot move workspace root node');
                setIsDragging(false);
                return;
            }
            
            // Get new parent ID (null for root level)
            const newParentId = args.parentId ? parseInt(args.parentId) : undefined;
            
            // Don't allow moving to workspace root
            if (newParentId && newParentId < 0) {
                console.warn('⚠️ Cannot move to workspace root');
                setIsDragging(false);
                return;
            }
            
            // Don't allow moving to itself
            if (tagId === newParentId) {
                console.warn('⚠️ Cannot move tag to itself');
                setIsDragging(false);
                return;
            }
            
            // Optimistic update would go here if needed
            console.log('📤 Calling API to move tag:', { tagId, newParentId, newIndex: args.index });
            
            // Call the mutation
            await moveTagMutation.mutateAsync({
                tagId,
                newParentId,
                newIndex: args.index,
            });
            
            console.log('✅ Tag moved successfully');
        } catch (error) {
            console.error('❌ Failed to move tag:', error);
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
            {(isDragging || moveTagMutation.isPending) && (
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
                disableMultiSelection={false}
                disableEdit={true}
                selection=""
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