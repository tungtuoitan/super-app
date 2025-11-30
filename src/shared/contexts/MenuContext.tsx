/**
 * Global Context Menu System
 * Provides right-click context menu functionality across the entire application
 * Using @szhsin/react-menu for better performance and accessibility
 * 
 * Pattern: UI-only provider, logic in store + helper
 */

import React from 'react';
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
import { useContextMenuStore } from '@/store/contextMenu/ContextMenuStore';
import { useContextMenuHelper } from '@/hooks/useContextMenuHelper';
import { useFolderHelper } from '@/hooks/explorer/useFolderHelper';
import { useFolderStore } from '@/store/folderUI/FolderStore';
import { EditWorkspaceItemDialog } from '@/Components/tags/EditWorkspaceItemDialog';
import '@szhsin/react-menu/dist/index.css';
import '@szhsin/react-menu/dist/transitions/slide.css';

interface ContextMenuProviderProps {
    children: React.ReactNode;
}

/**
 * Context Menu Provider
 * Pure UI component that renders menu, popover, and dialogs
 * All logic delegated to store and helper
 */
export function ContextMenu({ children }: ContextMenuProviderProps) {
    // Store state
    const {
        isOpen,
        anchorPoint,
        contextType,
        contextData,
        isEditDialogOpen,
        editItemData,
    } = useContextMenuStore();
    
    // Business logic
    const {
        closeContextMenu,
        handleCreateTag,
        handleEditItem,
        handleAddFile,
        handleAddNote,
        handleDeleteItem,
        handleViewInfo,
        closeEditDialog,
        selectedFolderIds,
    } = useContextMenuHelper();

    // Confirmation popover for delete actions
    const deleteConfirmation = useConfirmationPopover({
        confirmText: 'Delete',
        cancelText: 'Cancel',
        confirmColor: 'destructive',
        buttonVariant: 'default',
        zIndex: 20000 // Higher than menu z-index
    });

    /**
     * Wrapper for handleCreateTag to pass contextData
     */
    const onCreateTagClick = () => {
        handleCreateTag(contextData);
    };

    /**
     * Wrapper for handleEditItem to pass contextData
     */
    const onEditItemClick = () => {
        handleEditItem(contextData);
    };

    /**
     * Wrapper for handleDeleteItem with confirmation
     */
    const onDeleteItemClick = (event: any) => {
        if (contextType === 'tag' && contextData) {
            // Check if this is a workspace root node (negative ID)
            if (contextData.tagId < 0) {
                console.warn('⚠️ Cannot delete workspace root node');
                closeContextMenu();
                return;
            }

            closeContextMenu();

            const nativeEvent = event.syntheticEvent || event;
            const selectedCount = selectedFolderIds.length;
            const isMultipleSelected = selectedCount > 1;

            let message: string;

            if (isMultipleSelected) {
                message = `Are you sure you want to delete ${selectedCount} selected folders?\n\nThis action cannot be undone.`;
            } else {
                const countChildren = (tag: any): number => {
                    if (!tag.children || tag.children.length === 0) return 0;
                    return tag.children.length + tag.children.reduce((sum: number, child: any) => sum + countChildren(child), 0);
                };

                const childCount = countChildren(contextData);
                message = childCount > 0
                    ? `Are you sure you want to delete "${contextData.name}"?\n\nThis will also delete ${childCount} child folder(s).`
                    : `Are you sure you want to delete "${contextData.name}"?`;
            }

            deleteConfirmation.show({
                event: nativeEvent,
                message,
                onConfirm: () => {
                    handleDeleteItem(contextData, contextType);
                }
            });
        } else {
            handleDeleteItem(contextData, contextType);
        }
    };

    /**
     * Render menu items based on context type
     */
    const renderMenuItems = () => {
        switch (contextType) {
            case 'tag':
            case 'folder':
                const isWorkspaceRoot = contextData && contextData.tagId < 0;
                const selectedCount = selectedFolderIds.length;
                const isMultipleSelected = selectedCount > 1;

                return (
                    <>
                        {/* Add submenu */}
                        <MenuItem onClick={onCreateTagClick}>
                            <AddIcon className="w-4 h-4 mr-2" />
                            Add Folder
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
                        <MenuItem onClick={onEditItemClick} disabled={isMultipleSelected}>
                            <EditIcon className="w-4 h-4 mr-2" />
                            Edit {isMultipleSelected ? 'Folders' : 'Folder'}
                        </MenuItem>
                        
                        {/* Delete - show count if multiple selected */}
                        {!isWorkspaceRoot && (
                            <MenuItem onClick={onDeleteItemClick}>
                                <DeleteIcon className="w-4 h-4 mr-2" />
                                Delete {isMultipleSelected ? `${selectedCount} Folders` : 'Folder'}
                            </MenuItem>
                        )}
                    </>
                );
            
            case 'note':
                return (
                    <>
                        <MenuItem onClick={onEditItemClick}>
                            <EditIcon className="w-4 h-4 mr-2" />
                            Edit Note
                        </MenuItem>
                        <MenuItem onClick={handleViewInfo}>
                            <InfoIcon className="w-4 h-4 mr-2" />
                            View Details
                        </MenuItem>
                        <MenuDivider />
                        <MenuItem onClick={onDeleteItemClick}>
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
        <>
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
                    onClose={closeEditDialog}
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
        </>
    );
}

