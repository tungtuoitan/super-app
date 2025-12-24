import React from 'react';
import { ControlledMenu, MenuItem, MenuDivider } from '@szhsin/react-menu';
import { Info as InfoIcon } from 'lucide-react';
import { useContextMenuStore } from '@/store/contextMenu/ContextMenu.store';
import { WorkspaceFolderNodeMenu } from './menus/WorkspaceFolderNodeMenu';
import { WorkspaceChildNodeMenu } from './menus/WorkspaceChildNodeMenu';
import { NoteGridMenu } from './menus/NoteGridMenu';
import { WsGridMenu } from './menus/WsGridMenu';
import { constants } from '@/utils/constants';
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
        isContextMenuOpen,
        anchorPoint,
        contextType,
        setIsContextMenuOpen,
    } = useContextMenuStore();


    /**
     * Render menu items based on context type
     */
    const renderMenuItems = () => {
        switch (contextType) {
            case constants.workspace.itemTypes.folder:
                return <WorkspaceFolderNodeMenu />;
            
            case constants.workspace.itemTypes.note:
            case constants.workspace.itemTypes.file:
                return <WorkspaceChildNodeMenu />;

            case 'note-grid':
                return <NoteGridMenu />;
            
            case 'workspace-grid':
                return <WsGridMenu />;
            
            default:
                return (
                    <>
                        <MenuItem disabled>
                            Context Menu
                        </MenuItem>
                        <MenuDivider />
                        <MenuItem disabled>
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
                state={isContextMenuOpen ? 'open' : 'closed'}
                anchorPoint={anchorPoint}
                onClose={() => setIsContextMenuOpen(false)}
                menuClassName="context-menu"
                transition
            >
                {renderMenuItems()}
            </ControlledMenu>
        </>
    );
}

