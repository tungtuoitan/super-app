import { Panel, PanelGroup } from "react-resizable-panels";
import type { ActivityBarView } from "@/utils/constants";
import { NoteGrid } from "../Note/NoteGrid";
import { VSCodeResizeHandle } from "@/Components/VSCodeLayout/VSCodeResizeHandle";
import { WorkspaceView } from "./WorkspaceView";
import { GridControlBar } from "@/Components/shared/GridControlBar";
import { GridControlProvider } from "@/store/grid/useGridControl.store";
import { constants } from "@/utils/constants";
import { useActivityBarStore } from "@/store/index";
import { WsView } from "./WsView";
import { ProjectView } from "./ProjectView";
import { LifeLogView } from "@/Components/LifeLog/LifeLogView";
import { useMobileStore } from "@/store/mobile/Mobile.store";
import { Console } from "./Console";
import {KView} from "../K/Components/KView";

interface VSSideBarProps {
    activeView: ActivityBarView;
}

/**
 * VSSideBar - Sidebar content for VS Code style layout
 *
 * Now wraps itself in a Panel for direct integration with PanelGroup.
 * This allows the sidebar and main content to be siblings in the panel hierarchy.
 *
 * Views:
 * - Explorer: WorkspaceTree component for workspace navigation
 * - Workspace: Workspace management (currently same as Explorer)
 * - Notes: Notes list interface with search
 *
 * Collapse behavior:
 * - When collapsed, panel size goes to 0 but resize handle remains visible
 * - User can drag the resize handle to expand the panel again (like VSCode)
 */
export function VSSideBar({ activeView }: VSSideBarProps) {
    const { isSideBarVisible, setIsSideBarVisible } = useActivityBarStore();
    const { isMobile } = useMobileStore();

    // On mobile: default 50%, max 50% | On desktop: default 20%, max 40%
    const defaultSize = isMobile ? 70 : 20;
    const maxSize = isMobile ? 70 : 40;

    return (
        <Panel
            id="sidebar"
            defaultSize={defaultSize}
            minSize={5}
            maxSize={maxSize}
            collapsible
            collapsedSize={0}
            onCollapse={() => setIsSideBarVisible(false)}
            onExpand={() => setIsSideBarVisible(true)}
        >
            {/* Only render inner panels when visible to avoid mounting when hidden */}
            {isSideBarVisible && (
                <>
                    {/* Use a vertical PanelGroup to split the sidebar into two stacked panels */}
                    <PanelGroup direction="vertical" className="h-full" autoSaveId="sidebar-vertical">
                        {/* Top panel: original sidebar content */}
                        <Panel defaultSize={70} minSize={20}>
                            <div className="h-full bg-editor-sidebar border-r border-editor-border flex flex-col overflow-hidden">
                                {/* Header */}
                                <div className="h-[35px] flex items-center justify-between px-3 border-b border-editor-border text-[11px] font-semibold uppercase text-muted-foreground flex-shrink-0">
                                    <span>{getViewTitle(activeView)}</span>
                                    <GridControlBar hideFilter={activeView === constants.vscode.viewTypes.lifeLog} />
                                </div>

                                {/* Content */}
                                <div className="flex-1 overflow-hidden">
                                    {activeView === constants.vscode.viewTypes.ws && <WsView />}
                                    {activeView === constants.vscode.viewTypes.workspace && <WorkspaceView />}
                                    {activeView === constants.vscode.viewTypes.k && <KView />}
                                    {activeView === constants.vscode.viewTypes.note && <NotesView />}
                                    {activeView === constants.vscode.viewTypes.project && <ProjectView />}
                                    {activeView === constants.vscode.viewTypes.lifeLog && <LifeLogView />}
                                </div>
                            </div>
                        </Panel>

                        <VSCodeResizeHandle direction="vertical" id="panel2-resize" />

                        {/* Bottom panel: secondary area (e.g., quick actions, details) */}
                        {!isMobile && <Console />}
                    </PanelGroup>
                </>
            )}
        </Panel>
    );
}

/**
 * Notes View - Notes list interface with grid
 * Shows full note grid with all columns
 */
function NotesView() {
    return (
        <div className="h-full flex flex-col overflow-hidden">
            <NoteGrid source={constants.modules.note} />
        </div>
    );
}

/**
 * Get view title for header
 */
function getViewTitle(view: ActivityBarView): string {
    switch (view) {
        case constants.vscode.viewTypes.workspace:
            return constants.vscode.displayNames.workspace;
        case constants.vscode.viewTypes.ws:
            return "Ws";
        case constants.vscode.viewTypes.note:
            return constants.vscode.displayNames.notes;
        case constants.vscode.viewTypes.project:
            return constants.vscode.displayNames.project;
        case constants.vscode.viewTypes.lifeLog:
            return constants.vscode.displayNames.lifeLog;
        default:
            return "View";
    }
}
