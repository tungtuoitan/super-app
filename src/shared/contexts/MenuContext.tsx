import React from 'react';
import { ControlledMenu, MenuItem, MenuDivider } from '@szhsin/react-menu';
import { Info as InfoIcon } from 'lucide-react';
import { ConfirmationPopover } from '@/shared/components/feedback/ConfirmationPopover';
import { useContextMenuStore } from '@/store/contextMenu/ContextMenuStore';
import { useWorkspaceFolderMenuHelper } from './helpers/useWorkspaceFolderMenuHelper';
import { useWorkspaceChildMenuHelper } from './helpers/useWorkspaceChildMenuHelper';
import { useNoteGridMenuHelper } from './helpers/useNoteGridMenuHelper';
import { useWsGridMenuHelper } from './helpers/useWsGridMenuHelper';
import { WorkspaceFolderNodeMenu } from './menus/WorkspaceFolderNodeMenu';
import { WorkspaceChildNodeMenu } from './menus/WorkspaceChildNodeMenu';
import { NoteGridMenu } from './menus/NoteGridMenu';
import { WsGridMenu } from './menus/WsGridMenu';
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

    // Get all helper confirmation popovers
    const folderHelper = useWorkspaceFolderMenuHelper();
    const childHelper = useWorkspaceChildMenuHelper();
    const noteGridHelper = useNoteGridMenuHelper();
    const wsGridHelper = useWsGridMenuHelper();

    /**
     * Render menu items based on context type
     */
    const renderMenuItems = () => {
        switch (contextType) {
            case 'folder':
                return <WorkspaceFolderNodeMenu />;
            
            case 'note':
            case 'file':
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

            {/* Confirmation Popovers for all menu types */}
            <ConfirmationPopover {...folderHelper.deleteConfirmation.getPopoverProps()} />
            <ConfirmationPopover {...childHelper.deleteConfirmation.getPopoverProps()} />
            <ConfirmationPopover {...noteGridHelper.deleteConfirmation.getPopoverProps()} />
            <ConfirmationPopover {...wsGridHelper.deleteConfirmation.getPopoverProps()} />
        </>
    );
}

