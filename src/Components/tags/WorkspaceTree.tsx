/**
 * WorkspaceTree Component - Hierarchical tree view of tags using react-arborist
 * Similar to NoteGrid but displays tags in a tree structure with advanced tree functionality
 */

import React, { useMemo, useState } from 'react';
import { Tree, NodeApi } from 'react-arborist';
import { useDragDropManager } from 'react-dnd';
import {
    ChevronDown,
    ChevronRight,
    Tag as TagIcon,
    FolderOpen,
    Folder,
    Layers,
    Plus,
    RefreshCw,
    ChevronsUp,
    Loader2
} from 'lucide-react';
import { Alert, AlertDescription } from '@/Components/ui/alert';

import { useWorkspaceTagTree, useBatchMoveTag } from './useTags';
import { useTagUI } from './TagUIContext';
import { useContextMenu } from '@/shared/contexts';
import type { Tag } from './tag.types';
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
        <div
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
            style={{ ...style, paddingLeft: `${node.level * 8}px` }}
            onClick={handleMainClick}
            onContextMenu={handleRightClick}
            className={`
                flex items-center h-full w-full py-1 pr-2 cursor-pointer rounded
                transition-all duration-150 ease-in-out
                ${isDragging ? 'opacity-40' : 'opacity-100'}
                ${isSelected
                    ? 'bg-editor-hover text-white border-l-2 border-editor-active'
                    : 'bg-transparent hover:bg-editor-hover'
                }
                ${isWorkspaceRoot ? 'font-semibold' : ''}
                ${isDragging && isSelected
                    ? 'bg-primary/30 outline outline-1 outline-primary/60 -outline-offset-1'
                    : ''
                }
                ${isDropTarget
                    ? 'bg-editor-hover outline outline-1 outline-primary/50 -outline-offset-1'
                    : ''
                }
            `}
        >

            {/* Expand/Collapse Button */}
            <button
                onClick={(e) => {
                    e.stopPropagation();
                    e.preventDefault();
                    node.toggle();
                }}
                className={`p-0.5 ${hasChildren ? 'visible' : 'invisible'} text-editor-fg`}
            >
                {hasChildren ? (
                    node.isOpen ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />
                ) : null}
            </button>

            {/* Tag Icon */}
            <div className="mr-2 flex items-center">
                {/* Workspace root node */}
                {tag.tagId < 0 ? (
                    <Layers
                        className="w-4 h-4"
                        style={{ color: tag.color || '#75beff' }}
                    />
                ) : hasChildren ? (
                    node.isOpen ?
                        <FolderOpen className="w-4 h-4 text-yellow-500" /> :
                        <Folder className="w-4 h-4 text-yellow-500" />
                ) : (
                    <TagIcon
                        className="w-4 h-4"
                        style={{ color: tag.color || '#75beff' }}
                    />
                )}
            </div>

            {/* Tag Info */}
            <div className="flex-1 min-w-0 flex items-center gap-2 h-full">
                <div className="w-full min-w-0 flex items-center gap-2">
                    <span
                        className={`
                            text-sm truncate
                            ${hasChildren ? 'font-semibold' : 'font-normal'}
                            ${isWorkspaceRoot ? 'uppercase tracking-wide' : ''}
                            text-editor-fg
                        `}
                    >
                        {tag.name}
                    </span>
                </div>
            </div>

            {/* Action Buttons (only for workspace root) */}
            {isWorkspaceRoot && (
                <div
                    className="flex gap-0.5 ml-auto opacity-70 hover:opacity-100 transition-opacity"
                    onClick={(e) => e.stopPropagation()} // Prevent node selection when clicking buttons
                >
                    <button
                        title="Add Tag"
                        onClick={(e) => {
                            e.stopPropagation();
                            onNewFolder?.(); // Unified "Add Tag" action
                        }}
                        className="p-1 text-editor-fg hover:bg-editor-hover rounded"
                    >
                        <Plus className="w-4 h-4" />
                    </button>

                    <button
                        title="Refresh"
                        onClick={(e) => {
                            e.stopPropagation();
                            onRefresh?.();
                        }}
                        className="p-1 text-editor-fg hover:bg-editor-hover rounded"
                    >
                        <RefreshCw className="w-4 h-4" />
                    </button>

                    <button
                        title="Collapse All"
                        onClick={(e) => {
                            e.stopPropagation();
                            onCollapseAll?.();
                        }}
                        className="p-1 text-editor-fg hover:bg-editor-hover rounded"
                    >
                        <ChevronsUp className="w-4 h-4" />
                    </button>
                </div>
            )}

        </div>
    );
}

/**
 * Loading skeleton for WorkspaceTree
 */
function WorkspaceTreeSkeleton() {
    return (
        <div className="p-4">
            {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="flex items-center mb-2 animate-pulse">
                    <div className="w-5 h-5 bg-editor-hover rounded mr-2" />
                    <div
                        className="h-5 bg-editor-hover rounded"
                        style={{ width: `${Math.random() * 200 + 100}px` }}
                    />
                </div>
            ))}
        </div>
    );
}

/**
 * Empty state for WorkspaceTree
 */
function WorkspaceTreeEmpty() {
    return (
        <div className="flex flex-col items-center justify-center p-12 text-center">
            <TagIcon className="w-12 h-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold text-muted-foreground mb-2">
                No Tags Found
            </h3>
            <p className="text-sm text-muted-foreground">
                Create your first tag to organize your content
            </p>
        </div>
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
        <div className="p-2 px-4 bg-primary/20 text-primary-foreground rounded mb-2 flex items-center justify-between">
            <span className="text-xs">
                {selectedCount} of {totalCount} tags selected
            </span>
            <span className="text-xs opacity-80">
                Ctrl+Click to toggle • Shift+Click for range • Ctrl+A to select all
            </span>
        </div>
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
        <div className="fixed pointer-events-none z-[10000] left-0 top-0 w-full h-full">
            {/* Preview */}
            <div
                style={{
                    transform: `translate(${offset.x}px, ${offset.y}px)`,
                }}
                className={`
                    absolute bg-editor-bg/95 border border-editor-border rounded-md p-2 px-3
                    ${itemCount > 1 ? 'min-w-[60px]' : 'min-w-[200px]'}
                    max-w-[300px] shadow-lg
                `}
            >
                <div className={`flex items-center gap-2 ${itemCount > 1 ? 'justify-center' : 'justify-start'}`}>
                    {/* Icon */}
                    <TagIcon className="w-4 h-4 text-primary" />

                    {/* Text: Show tag name for single item, count for multiple */}
                    <span
                        className={`
                            text-editor-fg truncate
                            ${itemCount > 1 ? 'font-bold text-base' : 'font-medium text-sm'}
                        `}
                    >
                        {displayText}
                    </span>
                </div>
            </div>
        </div>
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
            <Alert variant="destructive" className="m-4">
                <AlertDescription>
                    Failed to load tags: {error instanceof Error ? error.message : 'Unknown error occurred'}
                </AlertDescription>
            </Alert>
        );
    }

    // Empty state
    if (!treeData || treeData.length === 0) {
        return <WorkspaceTreeEmpty />;
    }

    // Main tree render with react-arborist
    return (
        <div
            ref={treeContainerRef}
            data-workspace-tree
            tabIndex={0}
            className="h-full flex flex-col p-4 relative focus:outline-none focus-within:bg-editor-hover/30 transition-colors"
        >
            {/* Loading overlay when dragging */}
            {(isDragging || batchMoveTagMutation.isPending) && (
                <div className="absolute inset-0 bg-black/5 z-[1000] flex items-center justify-center pointer-events-none">
                    <div className="bg-editor-sidebar p-4 px-6 rounded-lg shadow-lg flex items-center gap-3">
                        <Loader2 className="w-5 h-5 text-primary animate-spin" />
                        <span className="text-sm text-editor-fg">Moving tag...</span>
                    </div>
                </div>
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
        </div>
    );
}
