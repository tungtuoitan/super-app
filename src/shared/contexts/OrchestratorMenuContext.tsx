import React from "react";
import { ControlledMenu, MenuItem, MenuDivider } from "@szhsin/react-menu";
import { Info as InfoIcon } from "lucide-react";
import { WorkspaceFolderNodeMenu } from "./menus/WorkspaceFolderNodeMenu";
import { WorkspaceChildNodeMenu } from "./menus/WorkspaceChildNodeMenu";
import { NoteGridMenu } from "./menus/NoteGridMenu";
import { WsGridMenu } from "./menus/WsGridMenu";
import { ProjectGridMenu } from "./menus/ProjectGridMenu";
import { TaskGridMenu } from "./menus/TaskGridMenu";
import { TaskFlowMenu } from "./menus/TaskFlowMenu";
import { TabBarMenu } from "./menus/TabBarMenu";
import { LogListMenu } from "./menus/LogListMenu";
import { TrackPanelMenu } from "./menus/TrackPanelMenu";
import { KKnowledgeMenu } from "./menus/KKnowledgeMenu";
import { WorkspaceSelectorMenu } from "./menus/WorkspaceSelectorMenu";
import { constants } from "@/utils/constants";
import "@szhsin/react-menu/dist/index.css";
import "@szhsin/react-menu/dist/transitions/slide.css";
import { useOrchestratorContextMenuStore } from "@/store/contextMenu/ContextMenu.store";
import {KNodeMenu} from "../../Components/K/contexts/menu/KNodeMenu";
import { KNodePanelBlankMenu } from "./menus/KNodePanelBlankMenu";
import { KNodePanelCardMenu } from "../../Components/K/contexts/menu/KNodePanelCardMenu";

interface ContextMenuProviderProps {
    children: React.ReactNode;
}

/**
 * Context Menu Provider
 * Pure UI component that renders menu, popover, and dialogs
 * All logic delegated to store and helper
 */
export function OrchestratorContextMenu({ children }: ContextMenuProviderProps) {
    // Store state
    const { isContextMenuOpen, anchorPoint, contextType, setIsContextMenuOpen } = useOrchestratorContextMenuStore();

    /**
     * Render menu items based on context type
     */
    const renderMenuItems = () => {
        switch (contextType) {
            case constants.contextMenu.contextMenuTypes.folder:
                return <WorkspaceFolderNodeMenu />;

            case constants.contextMenu.contextMenuTypes.note:
            case constants.contextMenu.contextMenuTypes.file:
                return <WorkspaceChildNodeMenu />;

            case constants.contextMenu.contextMenuTypes.kNode:
                return <KNodeMenu />;

            case constants.contextMenu.contextMenuTypes.kNodePanelBlank:
                return <KNodePanelBlankMenu />;

            case constants.contextMenu.contextMenuTypes.kNodePanelCard:
                return <KNodePanelCardMenu />;

            case "note-grid":
                return <NoteGridMenu />;

            case "workspace-grid":
                return <WsGridMenu />;

            case "project-grid":
                return <ProjectGridMenu />;

            case "task-grid":
                return <TaskGridMenu />;

            case constants.contextMenu.contextMenuTypes.taskFlow:
                return <TaskFlowMenu />;

            case "tab":
                return <TabBarMenu />;

            case constants.contextMenu.contextMenuTypes.lifeLogLog:
                return <LogListMenu />;

            case constants.contextMenu.contextMenuTypes.lifeLogTrack:
                return <TrackPanelMenu />;

            case constants.contextMenu.contextMenuTypes.kKnowledgeSelector:
                return <KKnowledgeMenu />;

            default:
                return (
                    <>
                        <MenuItem disabled>Context Menu</MenuItem>
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
                state={isContextMenuOpen ? "open" : "closed"}
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
