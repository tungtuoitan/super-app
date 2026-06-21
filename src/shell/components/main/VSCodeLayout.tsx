import { useEffect, useRef } from "react";
import { Panel, PanelGroup, type ImperativePanelHandle } from "react-resizable-panels";
import { ActivityBar } from "./ActivityBar";
import { VSCodeResizeHandle } from "../VSCodeResizeHandle";
import { VSSideBar } from "./VSSideBar";
import { VSPanel } from "./VSPanel/VSPanel";
import { VSEditorArea } from "./VSEditorArea";
import { useLocation } from "react-router-dom";
import { useDeviceStore, useDebugLog } from "@/shared";
import { useDetectDevice } from "@/shared";
import {useSideBarStore} from "@/shell/store/SideBar.store";
import {RightSideBar} from "./RightSideBar";
import {useActivityBarStore} from "@/shell/store/ActivityBar.store";
import {useModuleRegisterHelper} from "@/shell/hooks/useModuleRegister.helper";
import { GlobalModuleInit } from "../GlobalModuleInit";
import {moduleRegistry} from "@/shell/moduleRegistry";

interface VSCodeLayoutProps {
    className?: string;
}

export function VSCodeLayout({ className }: VSCodeLayoutProps) {
    const location = useLocation();
    const { isMobile } = useDeviceStore();
    const { setIsPanelVisible } = useActivityBarStore();
    const mobileEditorRef = useRef<ImperativePanelHandle>(null);
    const { moduleName } = useSideBarStore();
    useDetectDevice()

    const { registerGrid } = useModuleRegisterHelper();

    // ── Drag-lag diagnostic ───────────────────────────────────────────────────
    const debugLog = useDebugLog();
    const renderCountRef = useRef(0);
    const lastLayoutTsRef = useRef(0);
    const layoutTickCountRef = useRef(0);
    renderCountRef.current += 1;
    if (isMobile) {
        debugLog.log("vscode-layout", "render", {
            count: renderCountRef.current,
            moduleName,
        });
    }

    const handleMobileLayout = (sizes: number[]) => {
        const now = performance.now();
        layoutTickCountRef.current += 1;
        const dt = lastLayoutTsRef.current ? Math.round(now - lastLayoutTsRef.current) : 0;
        lastLayoutTsRef.current = now;
        debugLog.log("vscode-layout", "onLayout", {
            sizes: sizes.map(s => Math.round(s)),
            tick: layoutTickCountRef.current,
            dtMs: dt,
        });
    };

    useEffect(() => {
        registerGrid();
    }, [moduleName]);

    const { mobileTabJustOpened, setMobileTabJustOpened, mobileReviewActive } = useSideBarStore();

    // Expand editor panel when a feature opens a tab on mobile
    useEffect(() => {
        if (!isMobile || !mobileTabJustOpened) return;
        const panel = mobileEditorRef.current;
        const sizeBefore = panel?.getSize() ?? null;
        debugLog.log("VSCodeLayout", "mobileTabJustOpened-resize", { sizeBefore: sizeBefore ?? undefined, willResize: !!panel && (panel.getSize() < 50), refReady: !!panel });
        if (panel && panel.getSize() < 50) panel.resize(75);
        setMobileTabJustOpened(false);
    }, [isMobile, mobileTabJustOpened]);

    // Expand/restore editor panel when a K review session starts/ends on mobile
    useEffect(() => {
        if (!isMobile) return;
        const panel = mobileEditorRef.current;
        const sizeBefore = panel?.getSize() ?? null;
        const targetSize = mobileReviewActive ? 200 : 22;
        debugLog.log("VSCodeLayout", "mobileReviewActive-resize", { mobileReviewActive, targetSize, sizeBefore: sizeBefore ?? undefined, refReady: !!panel });
        panel?.resize(targetSize);
    }, [isMobile, mobileReviewActive]);

    if (isMobile) {
        return (
            <>
                <GlobalModuleInit />
                <div
                    className={`w-full h-full flex flex-col overflow-hidden ${className || ""}`}
                    style={{ backgroundColor: "rgb(30, 30, 30)", color: "#cccccc" }}
                >
                    <ActivityBar horizontal />

                    <PanelGroup
                        direction="vertical"
                        autoSaveId="mobile-layout-vertical"
                        className="flex-1"
                        onLayout={handleMobileLayout}
                    >
                        <Panel id="mobile-sidebar" defaultSize={40} minSize={15}>
                            <div className="h-full overflow-hidden bg-editor-sidebar flex flex-col" style={{ contain: "layout style size" }}>
                                {/* <div className="h-[35px] flex items-center justify-between px-3 border-b border-editor-border text-[11px] font-semibold uppercase text-muted-foreground flex-shrink-0">
                                    <span>{moduleName}</span>
                                    {moduleRegistry.getById(moduleName)?.hideRightSideBarFilter && (
                                        <RightSideBar hideFilter />
                                    )}
                                </div> */}
                                <div className="flex-1 overflow-hidden">
                                    <MobileSidebarContent moduleName={moduleName} />
                                </div>
                            </div>
                        </Panel>
                        <VSCodeResizeHandle direction="vertical" id="mobile-split-resize" />
                        <Panel id="mobile-editor" ref={mobileEditorRef} defaultSize={60} minSize={15}>
                            <div className="h-full w-full" style={{ contain: "layout style size" }}>
                                <VSEditorArea />
                            </div>
                        </Panel>
                    </PanelGroup>
                </div>
            </>
        );
    }

    return (
        <>
        <GlobalModuleInit />
        <div
            className={`w-full h-full flex flex-col overflow-hidden ${className || ""}`}
            style={{ backgroundColor: "rgb(30, 30, 30)", color: "#cccccc" }}
        >
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
        </>
    );
}

/** Mobile sidebar reads SidebarView from registry â€” same as VSSideBar desktop */
function MobileSidebarContent({ moduleName }: { moduleName: string }) {
    const module = moduleRegistry.getById(moduleName);
    const SidebarView = module?.SidebarView;
    return (
        <div className="h-full overflow-hidden">
            {SidebarView ? <SidebarView /> : null}
        </div>
    );
}



