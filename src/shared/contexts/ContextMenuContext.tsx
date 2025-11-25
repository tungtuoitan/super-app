/**
 * Global Context Menu System
 * Provides right-click context menu functionality across the entire application
 * Using @szhsin/react-menu for better performance and accessibility
 */

import React, { createContext, useContext, useState, useCallback } from 'react';
import { ControlledMenu, MenuItem, MenuDivider } from '@szhsin/react-menu';
import { 
    Plus as AddIcon, 
    Edit as EditIcon, 
    Trash2 as DeleteIcon, 
    Info as InfoIcon,
    File as FileIcon,
    FileText as NoteIcon
} from 'lucide-react';
import { ConfirmationPopover } from '@/shared/components/feedback/ConfirmationPopover';
import { useConfirmationPopover } from '@/shared/hooks/useConfirmationPopover';
import { useTagUI } from '@/contexts/TagUIContext';
import { EditWorkspaceItemDialog } from '@/Components/Tags/EditWorkspaceItemDialog';
import '@szhsin/react-menu/dist/index.css';
import '@szhsin/react-menu/dist/transitions/slide.css';

interface ContextMenuPosition {
    x: number;
    y: number;
}

interface ContextMenuContextValue {
    showContextMenu: (event: React.MouseEvent, type?: 'default' | 'tag' | 'note', contextData?: any) => void;
    closeContextMenu: () => void;
    isOpen: boolean;
    onCreateTag?: (parentTag?: any) => void;
    onDeleteTag?: (tag: any) => void;
}

const ContextMenuContext = createContext<ContextMenuContextValue | null>(null);

interface ContextMenuProviderProps {
    children: React.ReactNode;
    onCreateTag?: (parentTag?: any) => void;
    onDeleteTag?: (tag: any) => void;
}

export function ContextMenuProvider({ children, onCreateTag, onDeleteTag }: ContextMenuProviderProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [anchorPoint, setAnchorPoint] = useState<ContextMenuPosition>({ x: 0, y: 0 });
    const [contextType, setContextType] = useState<'default' | 'tag' | 'note'>('default');
    const [contextData, setContextData] = useState<any>(null);

    // Edit dialog state
    const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
    const [editItemData, setEditItemData] = useState<any>(null);

    // Get selected tags from TagUIContext
    const { selectedTagIds } = useTagUI();

    // Confirmation popover for delete actions
    const deleteConfirmation = useConfirmationPopover({
        confirmText: 'Delete',
        cancelText: 'Cancel',
        confirmColor: 'destructive',
        buttonVariant: 'default',
        zIndex: 20000 // Higher than menu z-index
    });

    const showContextMenu = useCallback((event: React.MouseEvent, type: 'default' | 'tag' | 'note' = 'default', data?: any) => {
        event.preventDefault();
        event.stopPropagation();
        
        setAnchorPoint({ x: event.clientX, y: event.clientY });
        setContextType(type);
        setContextData(data || null);
        setIsOpen(true);
    }, []);

    const closeContextMenu = useCallback(() => {
        setIsOpen(false);
    }, []);

    const handleCreateTag = useCallback(() => {
        console.log('📁 Context Menu: Add tag clicked for parent:', contextData);
        closeContextMenu();
        if (onCreateTag) {
            // Pass the tag that was right-clicked as the parent
            onCreateTag(contextData);
        }
    }, [closeContextMenu, onCreateTag, contextData]);

    const handleEditItem = useCallback(() => {
        console.log('✏️ Context Menu: Edit item clicked', contextData);
        closeContextMenu();
        
        // Set edit data and open dialog
        if (contextData) {
            setEditItemData(contextData);
            setIsEditDialogOpen(true);
        }
    }, [closeContextMenu, contextData]);

    const handleAddFile = useCallback(() => {
        console.log('📄 Context Menu: Add file clicked');
        closeContextMenu();
        // TODO: Implement add file functionality
    }, [closeContextMenu]);

    const handleAddNote = useCallback(() => {
        console.log('📝 Context Menu: Add note clicked');
        closeContextMenu();
        // TODO: Implement add note functionality
    }, [closeContextMenu]);

    const handleDeleteItem = useCallback((event: any) => {
        console.log('🗑️ Context Menu: Delete item clicked for:', contextData);

        if (contextType === 'tag' && contextData) {
            // Check if this is a workspace root node (negative ID)
            if (contextData.tagId < 0) {
                console.warn('⚠️ Cannot delete workspace root node');
                closeContextMenu();
                return;
            }

            // Close the context menu first
            closeContextMenu();

            // Get the native event for the confirmation popover
            const nativeEvent = event.syntheticEvent || event;

            const selectedCount = selectedTagIds.length;
            const isMultipleSelected = selectedCount > 1;

            let message: string;

            if (isMultipleSelected) {
                // Multiple tags selected
                message = `Are you sure you want to delete ${selectedCount} selected tags?\n\nThis action cannot be undone.`;
            } else {
                // Single tag - count children recursively
                const countChildren = (tag: any): number => {
                    if (!tag.children || tag.children.length === 0) return 0;
                    return tag.children.length + tag.children.reduce((sum: number, child: any) => sum + countChildren(child), 0);
                };

                const childCount = countChildren(contextData);
                message = childCount > 0
                    ? `Are you sure you want to delete "${contextData.name}"?\n\nThis will also delete ${childCount} child tag(s).`
                    : `Are you sure you want to delete "${contextData.name}"?`;
            }

            // Show confirmation popover
            deleteConfirmation.show({
                event: nativeEvent,
                message,
                onConfirm: () => {
                    if (onDeleteTag) {
                        if (isMultipleSelected) {
                            // Delete all selected tags
                            console.log('🗑️ Deleting multiple tags:', selectedTagIds);
                            // For now, just delete the right-clicked tag
                            // TODO: Implement bulk delete functionality
                            onDeleteTag(contextData);
                        } else {
                            // Delete single tag
                            onDeleteTag(contextData);
                        }
                    }
                }
            });
        } else {
            closeContextMenu();
        }
    }, [closeContextMenu, onDeleteTag, contextType, contextData, deleteConfirmation, selectedTagIds]);

    const handleViewInfo = useCallback(() => {
        console.log('View info clicked');
        closeContextMenu();
        // TODO: Implement view info functionality
    }, [closeContextMenu]);

    const renderMenuItems = () => {
        switch (contextType) {
            case 'tag':
                // Check if this is a workspace root node
                const isWorkspaceRoot = contextData && contextData.tagId < 0;
                const selectedCount = selectedTagIds.length;
                const isMultipleSelected = selectedCount > 1;

                // Determine what we're editing/deleting
                let itemType = 'Tag';
                let itemTypePlural = 'Tags';
                
                // If multiple items selected, use plural
                if (isMultipleSelected) {
                    itemType = itemTypePlural;
                }

                return (
                    <>
                        {/* Add submenu */}
                        <MenuItem onClick={handleCreateTag}>
                            <AddIcon className="w-4 h-4 mr-2" />
                            Add Tag
                        </MenuItem>
                        <MenuItem onClick={handleAddFile} disabled>
                            <FileIcon className="w-4 h-4 mr-2" />
                            Add File
                        </MenuItem>
                        <MenuItem onClick={handleAddNote} disabled>
                            <NoteIcon className="w-4 h-4 mr-2" />
                            Add Note
                        </MenuItem>
                        
                        <MenuDivider />
                        
                        {/* Edit - disabled if multiple items selected */}
                        <MenuItem onClick={handleEditItem} disabled={isMultipleSelected}>
                            <EditIcon className="w-4 h-4 mr-2" />
                            Edit {isMultipleSelected ? 'Tags' : 'Tag'}
                        </MenuItem>
                        
                        {/* Delete - show count if multiple selected */}
                        {!isWorkspaceRoot && (
                            <MenuItem onClick={handleDeleteItem}>
                                <DeleteIcon className="w-4 h-4 mr-2" />
                                Delete {isMultipleSelected ? `${selectedCount} Tags` : 'Tag'}
                            </MenuItem>
                        )}
                    </>
                );
            
            case 'note':
                return (
                    <>
                        <MenuItem onClick={handleEditItem}>
                            <EditIcon className="w-4 h-4 mr-2" />
                            Edit Note
                        </MenuItem>
                        <MenuItem onClick={handleViewInfo}>
                            <InfoIcon className="w-4 h-4 mr-2" />
                            View Details
                        </MenuItem>
                        <MenuDivider />
                        <MenuItem onClick={handleDeleteItem}>
                            <DeleteIcon className="w-4 h-4 mr-2" />
                            Delete Note
                        </MenuItem>
                    </>
                );
            
            default:
                return (
                    <>
                        <MenuItem disabled>
                            Context Menu
                        </MenuItem>
                        <MenuDivider />
                        <MenuItem onClick={handleViewInfo}>
                            <InfoIcon className="w-4 h-4 mr-2" />
                            About
                        </MenuItem>
                    </>
                );
        }
    };

    return (
        <ContextMenuContext.Provider
            value={{
                showContextMenu,
                closeContextMenu,
                isOpen,
                onCreateTag,
                onDeleteTag,
            }}
        >
            {children}
            
            <ControlledMenu
                state={isOpen ? 'open' : 'closed'}
                anchorPoint={anchorPoint}
                onClose={closeContextMenu}
                menuClassName="context-menu"
                transition
            >
                {renderMenuItems()}
            </ControlledMenu>

            {/* Confirmation Popover for delete actions */}
            <ConfirmationPopover {...deleteConfirmation.getPopoverProps()} />

            {/* Edit Workspace Item Dialog */}
            {editItemData && (
                <EditWorkspaceItemDialog
                    open={isEditDialogOpen}
                    onClose={() => {
                        setIsEditDialogOpen(false);
                        setTimeout(() => setEditItemData(null), 200);
                    }}
                    workspaceId={editItemData.workspaceId || 1} // CURRENT_WORKSPACE_ID = 1
                    itemId={editItemData.itemId || editItemData.tagId}
                    currentName={editItemData.name || ''}
                    currentLabel={editItemData.label || ''}
                    currentNotes={editItemData.notes || ''}
                    currentColor={editItemData.color || ''}
                    currentIcon={editItemData.icon || ''}
                    currentSortOrder={editItemData.sortOrder || 0}
                    itemName={editItemData.name || 'Item'}
                />
            )}
        </ContextMenuContext.Provider>
    );
}

export function useContextMenu() {
    const context = useContext(ContextMenuContext);
    if (!context) {
        throw new Error('useContextMenu must be used within ContextMenuProvider');
    }
    return context;
}