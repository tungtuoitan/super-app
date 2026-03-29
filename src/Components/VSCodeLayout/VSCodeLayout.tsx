import { useEffect, useRef } from "react";
import { Panel, PanelGroup, type ImperativePanelHandle } from "react-resizable-panels";
import { ActivityBar } from "./ActivityBar";
import { VSCodeResizeHandle } from "./VSCodeResizeHandle";
import { VSSideBar } from "./VSSideBar";
import { VSPanel } from "./VSPanel";
import { StatusBar } from "./StatusBar";
import { VSEditorArea } from "./VSEditorArea";
import { useNavigationStore } from "@/contexts/NavigationContext";
import { useActivityBarStore } from "@/store/index";
import { useGridAutoRegisterHelper } from "@/hooks/vsCode/useGridAutoRegister.helper";
import { useLocation } from "react-router-dom";
import { useMobileStore } from "@/store/mobile/Mobile.store";
import { CheckIsMobile } from "@/hooks/CheckIsMobile";
import { constants, type ActivityBarView } from "@/utils/constants";
import { WsView } from "./WsView";
import { WorkspaceView } from "./WorkspaceView";
import { ProjectView } from "./ProjectView";
import { LifeLogView } from "@/Components/LifeLog/LifeLogView";
import { NoteGrid } from "@/Components/Note/NoteGrid";
import { GridControlBar } from "@/Components/shared/GridControlBar";
import {useGridControlStore} from "@/store/grid/useGridControl.store";

interface VSCodeLayoutProps {
    className?: string;
}

/**
 * VSCodeLayout - VS Code style layout with resizable panels
 *
 * Layout structure:
 * - ActivityBar (left, fixed 48px): View selector (Explorer/Workspace/Notes)
 * - SideBar (resizable 5-40%): FolderTree for Explorer/Workspace views, Notes list for Notes view
 * - EditorArea (resizable): NoteGrid (main notes list)
 *   - Future: Will use react-mosaic for multi-editor drag & drop support
 * - Panel (bottom, resizable 5-60%): NoteDetail and Properties tabs
 * - StatusBar (bottom, fixed): Application status information
 *
 * Navigation:
 * - Routes: /explorer, /workspace, /notes
 * - URL-first: Browser back/forward work automatically
 * - ActiveView synced with URL via NavigationContext
 *
 * Resize features:
 * - Horizontal: SideBar width (Ctrl+B to toggle)
 * - Vertical: Panel height (Ctrl+J to toggle)
 * - Auto-save: Panel sizes persist across sessions
 * - Collapsible: Both SideBar and Panel can collapse to 0%
 * - Re-expandable: Drag resize handle to restore collapsed panels (like VSCode)
 * - Minimum size: 5% before collapse triggers
 *
 * ✨ MIGRATION STATUS: MUI → shadcn/ui + Tailwind
 * - Main layout: ✅ Migrated to Tailwind
 * - Sub-components: ⏳ Still using MUI (will migrate incrementally)
 */
export function VSCodeLayout({ className }: VSCodeLayoutProps) {
    const location = useLocation();
    const { isMobile } = useMobileStore();
    const { isSideBarVisible, setIsSideBarVisible, isPanelVisible, setIsPanelVisible } = useActivityBarStore();
    const mobileEditorRef = useRef<ImperativePanelHandle>(null);
    const { moduleName } = useGridControlStore();

    // Auto-register grid based on current URL
    const { registerGrid } = useGridAutoRegisterHelper();

    useEffect(() => {
        registerGrid();
    }, [location.pathname]);

    // Expand editor panel when any lifelog tab opens (if editor is too small)
    useEffect(() => {
        const handler = () => {
            if (isMobile) {
                const panel = mobileEditorRef.current;
                if (panel && panel.getSize() < 50) panel.resize(75);
            } 
        };
        window.addEventListener("lifelog-tab-opened", handler);
        return () => window.removeEventListener("lifelog-tab-opened", handler);
    }, [isMobile]);

    if (isMobile) {
        return (
            <div
                className={`w-full h-full flex flex-col overflow-hidden ${className || ""}`}
                style={{ backgroundColor: "rgb(30, 30, 30)", color: "#cccccc" }}
            >
                <CheckIsMobile />
                {/* Mobile: ActivityBar on top as horizontal bar */}
                <ActivityBar horizontal />

                {/* Mobile: VSSideBar top, VSEditorArea bottom - resizable */}
                <PanelGroup direction="vertical" autoSaveId="mobile-layout-vertical" className="flex-1">
                    <Panel id="mobile-sidebar" defaultSize={40} minSize={15}>
                        <div className="h-full overflow-hidden bg-editor-sidebar flex flex-col">
                            <div className="h-[35px] flex items-center justify-between px-3 border-b border-editor-border text-[11px] font-semibold uppercase text-muted-foreground flex-shrink-0">
                                <span>{moduleName}</span>
                                {moduleName === constants.modules.lifeLog && (
                                    <GridControlBar hideFilter />
                                )}
                            </div>
                            <div className="flex-1 overflow-hidden">
                                <MobileSideBarContent moduleName={moduleName} />
                            </div>
                        </div>
                    </Panel>
                    <VSCodeResizeHandle direction="vertical" id="mobile-split-resize" />
                    <Panel id="mobile-editor" ref={mobileEditorRef} defaultSize={60} minSize={15}>
                        <VSEditorArea />
                    </Panel>
                </PanelGroup>
            </div>
        );
    }

    return (
        <div
            className={`w-full h-full flex flex-col overflow-hidden ${className || ""}`}
            style={{
                backgroundColor: "rgb(30, 30, 30)",
                color: "#cccccc",
            }}
        >
            <CheckIsMobile />
            {/* Main content area with resizable panels */}
            <div className="flex-1 flex overflow-hidden">
                {/* Activity Bar - Fixed width, no resize */}
                
                <ActivityBar />

                {/* Horizontal PanelGroup: SideBar | Editor+Panel */}
                <PanelGroup direction="horizontal" autoSaveId="notes-layout-horizontal" className="flex-1">
                    {/* Side Bar */}
                    <>
                        <VSSideBar moduleName={moduleName} />
                        <VSCodeResizeHandle direction="horizontal" id="sidebar-resize" />
                    </>

                    {/* Main content: Editor + Panel (Vertical split) */}
                    <Panel id="main-content" minSize={50}>
                        <PanelGroup direction="vertical" autoSaveId="notes-layout-vertical">
                            <Panel id="editor-area" defaultSize={70} minSize={30}>
                                <VSEditorArea />
                            </Panel>
                            <VSCodeResizeHandle direction="vertical" id="panel-resize" />
                            <VSPanel onClose={() => setIsPanelVisible(false)} />
                        </PanelGroup>
                    </Panel>
                </PanelGroup>
            </div>

            {/* Status Bar - Fixed height, no resize */}
            {/* <StatusBar /> */}
        </div>
    );
}

/**
 * Keyboard shortcuts for VSCodeLayout
 *
 * Layout controls:
 * - Ctrl+B: Toggle sidebar (collapse/expand)
 * - Ctrl+J: Toggle panel (collapse/expand)
 *
 * View switching:
 * - Ctrl+Shift+E: Show Explorer view
 * - Ctrl+Shift+T: Show Workspace view
 * - Ctrl+Shift+N: Show Notes view
 *
 * Panel resizing:
 * - Drag resize handles to adjust panel sizes
 * - Double-click resize handle to reset to default size
 * - Panel sizes auto-save and persist across sessions
 */

function MobileSideBarContent({ moduleName   }: { moduleName: string }) {
    return (
        <div className="h-full overflow-hidden">
            {moduleName === constants.modules.ws && <WsView />}
            {moduleName === constants.modules.workspace && <WorkspaceView />}
            {moduleName === constants.modules.note && <NoteGrid source={constants.modules.note} />}
            {moduleName === constants.modules.project && <ProjectView />}
            {moduleName === constants.modules.lifeLog && <LifeLogView />}
        </div>
    );
}
