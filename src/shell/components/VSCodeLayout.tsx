import { useEffect, useRef } from "react";
import { Panel, PanelGroup, type ImperativePanelHandle } from "react-resizable-panels";
import { ActivityBar } from "./ActivityBar";
import { VSCodeResizeHandle } from "./VSCodeResizeHandle";
import { VSSideBar } from "./VSSideBar";
import { VSPanel } from "./VSPanel/VSPanel";
import { VSEditorArea } from "./VSEditorArea";
import { useActivityBarStore } from "@/store/index";
import { useGridAutoRegisterHelper } from "@/shell/hooks/useGridAutoRegister.helper";
import { useLocation } from "react-router-dom";
import { useMobileStore } from "@/store/Mobile.store";
import { CheckIsMobile } from "@/shell/HeadlessComponents/CheckIsMobile";
import { constants } from "@/utils/constants";
import { GridControlBar } from "@/shared/components/GridControlBar";
import { useGridControlStore } from "@/store/useGridControl.store";
import { moduleRegistry } from "@/shell/moduleRegistry";

interface VSCodeLayoutProps {
    className?: string;
}

export function VSCodeLayout({ className }: VSCodeLayoutProps) {
    const location = useLocation();
    const { isMobile } = useMobileStore();
    const { setIsPanelVisible } = useActivityBarStore();
    const mobileEditorRef = useRef<ImperativePanelHandle>(null);
    const { moduleName } = useGridControlStore();

    const { registerGrid } = useGridAutoRegisterHelper();

    useEffect(() => {
        registerGrid();
    }, [location.pathname]);

    // Expand editor panel when any lifelog tab opens (mobile)
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
                <ActivityBar horizontal />

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
                                <MobileSidebarContent moduleName={moduleName} />
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
            style={{ backgroundColor: "rgb(30, 30, 30)", color: "#cccccc" }}
        >
            <CheckIsMobile />
            <div className="flex-1 flex overflow-hidden">
                <ActivityBar />

                <PanelGroup direction="horizontal" autoSaveId="notes-layout-horizontal" className="flex-1">
                    <>
                        <VSSideBar moduleName={moduleName} />
                        <VSCodeResizeHandle direction="horizontal" id="sidebar-resize" />
                    </>

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
        </div>
    );
}

/** Mobile sidebar reads SidebarView from registry — same as VSSideBar desktop */
function MobileSidebarContent({ moduleName }: { moduleName: string }) {
    const module = moduleRegistry.getById(moduleName);
    const SidebarView = module?.SidebarView;
    return (
        <div className="h-full overflow-hidden">
            {SidebarView ? <SidebarView /> : null}
        </div>
    );
}
