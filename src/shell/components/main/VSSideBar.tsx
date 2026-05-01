import { Panel, PanelGroup } from "react-resizable-panels";
import { VSCodeResizeHandle } from "../VSCodeResizeHandle";
import { shellConstants } from "@/shell/shell.constants";
import { useDeviceStore } from "@/shared";
import { Console } from "../../../shared/console/Console";
import { moduleRegistry } from "@/shell";
import {useActivityBarStore} from "@/shell";
import {RightSideBar} from "./RightSideBar";

interface VSSideBarProps {
    moduleName: string;
}

/**
 * VSSideBar â€” sidebar content for VS Code style layout.
 * Reads SidebarView from the module registry â€” no direct feature imports.
 */
export function VSSideBar({ moduleName }: VSSideBarProps) {
    const { isSideBarVisible, setIsSideBarVisible } = useActivityBarStore();
    const { isMobile } = useDeviceStore();

    const defaultSize = isMobile ? 70 : 20;
    const maxSize = isMobile ? 70 : 40;

    const module = moduleRegistry.getById(moduleName);
    const SidebarView = module?.SidebarView;
    const viewTitle = module?.label ?? moduleName;

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
            {isSideBarVisible && (
                <PanelGroup direction="vertical" className="h-full" autoSaveId="sidebar-vertical">
                    <Panel defaultSize={70} minSize={20}>
                        <div className="h-full bg-editor-sidebar border-r border-editor-border flex flex-col overflow-hidden">
                            {/* Header */}
                            <div className="h-[35px] flex items-center justify-between px-3 border-b border-editor-border text-[11px] font-semibold uppercase text-muted-foreground flex-shrink-0">
                                <span>{viewTitle}</span>
                                <RightSideBar hideFilter={moduleName === "LifeLog"} />
                            </div>

                            {/* Content â€” delegated to feature module */}
                            <div className="flex-1 overflow-hidden">
                                {SidebarView ? <SidebarView /> : null}
                            </div>
                        </div>
                    </Panel>

                    <VSCodeResizeHandle direction="vertical" id="panel2-resize" />

                    {!isMobile && <Console />}
                </PanelGroup>
            )}
        </Panel>
    );
}



