/**
 * Global Context Menu System
 * Provides right-click context menu functionality across the entire application
 * Using @szhsin/react-menu for better performance and accessibility
 */

import React, { createContext, useContext, useState, useCallback } from 'react';
import { ControlledMenu, MenuItem, MenuDivider } from '@szhsin/react-menu';
import { Add as AddIcon, Edit as EditIcon, Delete as DeleteIcon, Info as InfoIcon } from '@mui/icons-material';
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
}

const ContextMenuContext = createContext<ContextMenuContextValue | null>(null);

interface ContextMenuProviderProps {
    children: React.ReactNode;
    onCreateTag?: (parentTag?: any) => void;
}

export function ContextMenuProvider({ children, onCreateTag }: ContextMenuProviderProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [anchorPoint, setAnchorPoint] = useState<ContextMenuPosition>({ x: 0, y: 0 });
    const [contextType, setContextType] = useState<'default' | 'tag' | 'note'>('default');
    const [contextData, setContextData] = useState<any>(null);

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
        console.log('Edit item clicked');
        closeContextMenu();
        // TODO: Implement edit functionality
    }, [closeContextMenu]);

    const handleDeleteItem = useCallback(() => {
        console.log('Delete item clicked');
        closeContextMenu();
        // TODO: Implement delete functionality
    }, [closeContextMenu]);

    const handleViewInfo = useCallback(() => {
        console.log('View info clicked');
        closeContextMenu();
        // TODO: Implement view info functionality
    }, [closeContextMenu]);

    const renderMenuItems = () => {
        switch (contextType) {
            case 'tag':
                return (
                    <>
                        <MenuItem onClick={handleCreateTag}>
                            <AddIcon style={{ fontSize: 16, marginRight: 8 }} />
                            Add Tag
                        </MenuItem>
                        <MenuDivider />
                        <MenuItem onClick={handleEditItem}>
                            <EditIcon style={{ fontSize: 16, marginRight: 8 }} />
                            Edit Tag
                        </MenuItem>
                        <MenuItem onClick={handleDeleteItem}>
                            <DeleteIcon style={{ fontSize: 16, marginRight: 8 }} />
                            Delete Tag
                        </MenuItem>
                    </>
                );
            
            case 'note':
                return (
                    <>
                        <MenuItem onClick={handleEditItem}>
                            <EditIcon style={{ fontSize: 16, marginRight: 8 }} />
                            Edit Note
                        </MenuItem>
                        <MenuItem onClick={handleViewInfo}>
                            <InfoIcon style={{ fontSize: 16, marginRight: 8 }} />
                            View Details
                        </MenuItem>
                        <MenuDivider />
                        <MenuItem onClick={handleDeleteItem}>
                            <DeleteIcon style={{ fontSize: 16, marginRight: 8 }} />
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
                            <InfoIcon style={{ fontSize: 16, marginRight: 8 }} />
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