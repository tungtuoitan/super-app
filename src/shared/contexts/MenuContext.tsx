import React from 'react';
import { ControlledMenu, MenuItem, MenuDivider } from '@szhsin/react-menu';
import { 
    Plus as AddIcon, 
    Edit as EditIcon, 
    Trash2 as DeleteIcon, 
    Info as InfoIcon,
    File as FileIcon,
    FileText as NoteIcon,
    AlertTriangle as HardDeleteIcon
} from 'lucide-react';
import { ConfirmationPopover } from '@/shared/components/feedback/ConfirmationPopover';
import { useConfirmationPopover } from '@/shared/hooks/useConfirmationPopover';
import { useContextMenuStore } from '@/store/contextMenu/ContextMenuStore';
import { useContextMenuHelper } from '@/hooks/useContextMenuHelper';
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
    } = useContextMenuStore();
    
    // Business logic
    const {
        closeContextMenu,
        handleCreateFolder,
        handleEditItem,
        handleAddFile,
        handleAddNote,
        handleDeleteItem,
        handleViewInfo,
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
     * Wrapper for handleCreateFolder to pass contextData
     */
    const onCreateTagClick = () => {
        handleCreateFolder(contextData);
    };

    /**
     * Wrapper for handleEditItem to pass contextData
     */
    const onEditItemClick = () => {
        handleEditItem(contextData);
    };

    /**
     * Wrapper for handleDeleteItem with confirmation
     * @param isHardDelete - If true, permanently delete (hard delete)
     */
    const onDeleteItemClick = (event: any, isHardDelete: boolean = false) => {
        if (contextType === 'folder' && contextData) {
            // Check if this is a workspace root node (negative ID)
            if (contextData.tagId < 0) {
                console.warn('⚠️ Cannot delete workspace root node');
                closeContextMenu();
                return;
            }

            closeContextMenu();

            // Extract anchor element from menu event
            const nativeEvent = event.syntheticEvent || event;
            const anchorElement = nativeEvent?.target as HTMLElement;

            const selectedCount = selectedFolderIds.length;
            const isMultipleSelected = selectedCount > 1;

            let message: string;

            if (isHardDelete) {
                // Hard delete warning messages
                if (isMultipleSelected) {
                    message = `⚠️ HARD DELETE WARNING\n\nThis will PERMANENTLY delete ${selectedCount} selected folders and ALL their contents (notes, files, subfolders).\n\n❌ This action CANNOT be undone.\n❌ All data will be LOST FOREVER.`;
                } else {
                    const countChildren = (tag: any): number => {
                        if (!tag.children || tag.children.length === 0) return 0;
                        return tag.children.length + tag.children.reduce((sum: number, child: any) => sum + countChildren(child), 0);
                    };

                    const childCount = countChildren(contextData);
                    message = childCount > 0
                        ? `⚠️ HARD DELETE WARNING\n\nThis will PERMANENTLY delete "${contextData.name}" and ${childCount} child folder(s) with ALL their contents.\n\n❌ This action CANNOT be undone.\n❌ All notes, files, and subfolders will be LOST FOREVER.`
                        : `⚠️ HARD DELETE WARNING\n\nThis will PERMANENTLY delete "${contextData.name}" and ALL its contents.\n\n❌ This action CANNOT be undone.\n❌ All data will be LOST FOREVER.`;
                }
            } else {
                // Soft delete messages (current behavior)
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
            }

            deleteConfirmation.show({
                anchorEl: anchorElement,
                message,
                onConfirm: () => {
                    handleDeleteItem(contextData, contextType, isHardDelete);
                }
            });
        } else if (contextType === 'note' && contextData) {
            // Handle note deletion with confirmation
            closeContextMenu();

            // Extract anchor element from menu event
            const nativeEvent = event.syntheticEvent || event;
            const anchorElement = nativeEvent?.target as HTMLElement;

            let message: string;
            if (isHardDelete) {
                message = `⚠️ HARD DELETE WARNING\n\nThis will PERMANENTLY delete "${contextData.name}".\n\n❌ This action CANNOT be undone.\n❌ All note content will be LOST FOREVER.`;
            } else {
                message = `Are you sure you want to delete "${contextData.name}"?\n\nThis action cannot be undone.`;
            }

            deleteConfirmation.show({
                anchorEl: anchorElement,
                message,
                onConfirm: () => {
                    handleDeleteItem(contextData, contextType, isHardDelete);
                }
            });
        } else if (contextType === 'file' && contextData) {
            // Handle file deletion with confirmation
            closeContextMenu();

            // Extract anchor element from menu event
            const nativeEvent = event.syntheticEvent || event;
            const anchorElement = nativeEvent?.target as HTMLElement;

            let message: string;
            if (isHardDelete) {
                message = `⚠️ HARD DELETE WARNING\n\nThis will PERMANENTLY delete "${contextData.name}".\n\n❌ This action CANNOT be undone.\n❌ The file will be LOST FOREVER.`;
            } else {
                message = `Are you sure you want to delete "${contextData.name}"?\n\nThis action cannot be undone.`;
            }

            deleteConfirmation.show({
                anchorEl: anchorElement,
                message,
                onConfirm: () => {
                    handleDeleteItem(contextData, contextType, isHardDelete);
                }
            });
        } else {
            handleDeleteItem(contextData, contextType, isHardDelete);
        }
    };

    /**
     * Render menu items based on context type
     */
    const renderMenuItems = () => {
        switch (contextType) {
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
                        <MenuItem onClick={() => handleAddNote(contextData)}>
                            <NoteIcon className="w-4 h-4 mr-2" />
                            Add Note
                        </MenuItem>
                        
                        <MenuDivider />
                        
                        {/* Edit - disabled if multiple items selected */}
                        <MenuItem onClick={onEditItemClick} disabled={isMultipleSelected}>
                            <EditIcon className="w-4 h-4 mr-2" />
                            Edit
                        </MenuItem>
                        
                        {/* Delete */}
                        {!isWorkspaceRoot && (
                            <>
                                <MenuItem onClick={(e) => onDeleteItemClick(e, false)}>
                                    <DeleteIcon className="w-4 h-4 mr-2" />
                                    Delete
                                </MenuItem>
                                <MenuItem 
                                    onClick={(e) => onDeleteItemClick(e, true)}
                                    className="text-red-600 hover:bg-red-50"
                                >
                                    <HardDeleteIcon className="w-4 h-4 mr-2" />
                                    Hard Delete
                                </MenuItem>
                            </>
                        )}
                    </>
                );
            
            case 'note':
                return (
                    <>
                        <MenuItem onClick={onEditItemClick}>
                            <EditIcon className="w-4 h-4 mr-2" />
                            Edit
                        </MenuItem>
                        <MenuItem onClick={handleViewInfo}>
                            <InfoIcon className="w-4 h-4 mr-2" />
                            View Details
                        </MenuItem>
                        <MenuDivider />
                        <MenuItem onClick={(e) => onDeleteItemClick(e, false)}>
                            <DeleteIcon className="w-4 h-4 mr-2" />
                            Delete
                        </MenuItem>
                        <MenuItem
                            onClick={(e) => onDeleteItemClick(e, true)}
                            className="text-red-600 hover:bg-red-50"
                        >
                            <HardDeleteIcon className="w-4 h-4 mr-2" />
                            Hard Delete
                        </MenuItem>
                    </>
                );

            case 'file':
                return (
                    <>
                        <MenuItem onClick={handleViewInfo}>
                            <InfoIcon className="w-4 h-4 mr-2" />
                            View Details
                        </MenuItem>
                        <MenuItem onClick={handleViewInfo} disabled>
                            <FileIcon className="w-4 h-4 mr-2" />
                            Download
                        </MenuItem>
                        <MenuDivider />
                        <MenuItem onClick={(e) => onDeleteItemClick(e, false)}>
                            <DeleteIcon className="w-4 h-4 mr-2" />
                            Delete
                        </MenuItem>
                        <MenuItem
                            onClick={(e) => onDeleteItemClick(e, true)}
                            className="text-red-600 hover:bg-red-50"
                        >
                            <HardDeleteIcon className="w-4 h-4 mr-2" />
                            Hard Delete
                        </MenuItem>
                    </>
                );

            case 'note-grid':
                const noteGridSelectedCount = contextData?.selectedIds?.length || 0;
                const noteGridIsMultiple = noteGridSelectedCount > 1;
                
                return (
                    <>
                        <MenuItem onClick={() => {
                            if (contextData?.onAddNote) {
                                closeContextMenu();
                                contextData.onAddNote();
                            }
                        }}>
                            <AddIcon className="w-4 h-4 mr-2" />
                            Add
                        </MenuItem>
                        
                        <MenuDivider />
                        
                        <MenuItem onClick={(event) => {
                            if (contextData?.onDelete) {
                                closeContextMenu();

                                // Extract anchor element from menu event
                                const nativeEvent = event.syntheticEvent || event;
                                const anchorElement = nativeEvent?.target as HTMLElement;

                                const message = noteGridIsMultiple
                                    ? `Are you sure you want to delete ${noteGridSelectedCount} selected notes?\n\nThis action cannot be undone.`
                                    : `Are you sure you want to delete this note?\n\nThis action cannot be undone.`;

                                deleteConfirmation.show({
                                    anchorEl: anchorElement,
                                    message,
                                    onConfirm: () => {
                                        contextData.onDelete(false);
                                    }
                                });
                            }
                        }}>
                            <DeleteIcon className="w-4 h-4 mr-2" />
                            Delete
                        </MenuItem>
                        <MenuItem 
                            onClick={(event) => {
                                if (contextData?.onDelete) {
                                    closeContextMenu();

                                    // Extract anchor element from menu event
                                    const nativeEvent = event.syntheticEvent || event;
                                    const anchorElement = nativeEvent?.target as HTMLElement;

                                    const message = noteGridIsMultiple
                                        ? `⚠️ HARD DELETE WARNING\n\nThis will PERMANENTLY delete ${noteGridSelectedCount} selected notes.\n\n❌ This action CANNOT be undone.\n❌ All note content will be LOST FOREVER.`
                                        : `⚠️ HARD DELETE WARNING\n\nThis will PERMANENTLY delete this note.\n\n❌ This action CANNOT be undone.\n❌ All note content will be LOST FOREVER.`;

                                    deleteConfirmation.show({
                                        anchorEl: anchorElement,
                                        message,
                                        onConfirm: () => {
                                            contextData.onDelete(true);
                                        }
                                    });
                                }
                            }}
                            className="text-red-600 hover:bg-red-50"
                        >
                            <HardDeleteIcon className="w-4 h-4 mr-2" />
                            Hard Delete
                        </MenuItem>
                    </>
                );
            
            case 'workspace-grid':
                // Calculate selected count: if row clicked but not selected, count is 1
                // Otherwise use the selectedIds from contextData
                const wsGridSelectedCount = contextData?.selectedIds?.length || 0;
                const wsGridIsMultiple = wsGridSelectedCount > 1;
                const wsGridHasSelection = wsGridSelectedCount > 0;
                
                return (
                    <>
                        <MenuItem onClick={() => {
                            if (contextData?.onAddWorkspace) {
                                closeContextMenu();
                                contextData.onAddWorkspace();
                            }
                        }}>
                            <AddIcon className="w-4 h-4 mr-2" />
                            Add Workspace
                        </MenuItem>
                        
                        <MenuDivider />
                        
                        {/* Soft Delete */}
                        <MenuItem 
                            onClick={(event) => {
                                if (contextData?.onDelete) {
                                    closeContextMenu();

                                    // Extract anchor element from menu event
                                    const nativeEvent = event.syntheticEvent || event;
                                    const anchorElement = nativeEvent?.target as HTMLElement;

                                    const message = wsGridIsMultiple
                                        ? `Are you sure you want to delete ${wsGridSelectedCount} selected workspaces?\n\n⚠️ This will also delete ALL folders, notes, and files in these workspaces.\n\nThis action cannot be undone.`
                                        : `Are you sure you want to delete this workspace?\n\n⚠️ This will also delete ALL folders, notes, and files in this workspace.\n\nThis action cannot be undone.`;

                                    deleteConfirmation.show({
                                        anchorEl: anchorElement,
                                        message,
                                        onConfirm: () => {
                                            contextData.onDelete(false);
                                        }
                                    });
                                }
                            }}
                            disabled={!wsGridHasSelection}
                        >
                            <DeleteIcon className="w-4 h-4 mr-2" />
                            Delete
                        </MenuItem>
                        
                        {/* Hard Delete */}
                        <MenuItem 
                            onClick={(event) => {
                                if (contextData?.onDelete) {
                                    closeContextMenu();

                                    // Extract anchor element from menu event
                                    const nativeEvent = event.syntheticEvent || event;
                                    const anchorElement = nativeEvent?.target as HTMLElement;

                                    const message = wsGridIsMultiple
                                        ? `⚠️ HARD DELETE WARNING\n\nThis will PERMANENTLY delete ${wsGridSelectedCount} selected workspaces and ALL their contents (folders, notes, files).\n\n❌ This action CANNOT be undone.\n❌ All data will be LOST FOREVER.`
                                        : `⚠️ HARD DELETE WARNING\n\nThis will PERMANENTLY delete this workspace and ALL its contents (folders, notes, files).\n\n❌ This action CANNOT be undone.\n❌ All data will be LOST FOREVER.`;

                                    deleteConfirmation.show({
                                        anchorEl: anchorElement,
                                        message,
                                        onConfirm: () => {
                                            // Hard delete flag
                                            if (contextData?.onDelete) {
                                                contextData.onDelete(true);
                                            }
                                        }
                                    });
                                }
                            }}
                            className="text-red-600 hover:bg-red-50"
                            disabled={!wsGridHasSelection}
                        >
                            <HardDeleteIcon className="w-4 h-4 mr-2" />
                            Hard Delete
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
        </>
    );
}

