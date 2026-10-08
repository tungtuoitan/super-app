/**
 * AppSidebar — unified desktop sidebar (#1514, option A): replaces TopNav + ActivityBar + VSSideBar.
 *   header   logo (toggles Home, as the TopNav logo did) · name · DEV · collapse
 *   search   opens the command palette (same as Ctrl+P)
 *   modules  Home + registry modules (SidebarModuleNav)
 *   section  active module title + search/filter (RightSideBar) + its SidebarView from the registry
 *   footer   account · K sync · panel toggle · settings
 * Collapsing it shows the ActivityBar as an icon rail (see VSCodeLayout).
 */

import { useRef } from "react";
import { Panel, type ImperativePanelHandle } from "react-resizable-panels";
import { PanelLeftClose, Search } from "lucide-react";
import { constants } from "@/shared";
import { envConfig } from "config/env.config";
import { RightSideBar } from "./RightSideBar";
import { SidebarModuleNav } from "../small/SidebarModuleNav";
import { SidebarFooter } from "../small/SidebarFooter";
import { useActivityBarStore } from "@/shell/store/ActivityBar.store";
import { useCommandPaletteStore } from "@/shell/commandPallete/useCommandPalette.store";
import { useCollapsiblePanelSync } from "@/shell/hooks/useCollapsiblePanel.headless";
import { moduleRegistry } from "@/shell/moduleRegistry";

export function AppSidebar({ moduleName }: { moduleName: string }) {
    const { isSideBarVisible, setIsSideBarVisible, isHomeOpen, setIsHomeOpen } = useActivityBarStore();
    const { setIsOpen: setIsCommandPaletteOpen } = useCommandPaletteStore();
    const showDevBadge = envConfig.REACT_APP_ENVIRONMENT?.toLowerCase() !== constants.environments.production.toLowerCase();

    const module = moduleRegistry.getById(moduleName);
    const SidebarView = module?.SidebarView;
    const viewTitle = module?.label ?? moduleName;

    const panelRef = useRef<ImperativePanelHandle>(null);
    const panelReadyRef = useCollapsiblePanelSync(panelRef, isSideBarVisible);

    return (
        <Panel
            ref={panelRef}
            id="sidebar"
            defaultSize={18}
            minSize={12}
            maxSize={35}
            collapsible
            collapsedSize={0}
            onCollapse={() => panelReadyRef.current && setIsSideBarVisible(false)}
            onExpand={() => panelReadyRef.current && setIsSideBarVisible(true)}
        >
            {isSideBarVisible && (
                <aside className="flex h-full flex-col overflow-hidden border-r border-editor-border bg-editor-sidebar">
                    {/* Header */}
                    <div className="flex h-12 shrink-0 items-center gap-2 px-3">
                        <button
                            type="button"
                            onClick={() => setIsHomeOpen((open) => !open)}
                            className="flex min-w-0 flex-1 items-center gap-2 rounded-md text-left"
                            title={isHomeOpen ? "Back to work" : "Home"}
                        >
                            <img src="/logo-32x32-web.png" alt="" className="h-5 w-5 shrink-0 rounded-sm dark:invert" />
                            <span className="truncate text-[13px] font-medium text-foreground">SuperApp</span>
                        </button>
                        {showDevBadge && <span className="rounded-md border border-sa-danger/40 px-1.5 font-mono text-[10px] leading-4 text-sa-danger">DEV</span>}
                        <button
                            type="button"
                            onClick={() => setIsSideBarVisible(false)}
                            aria-label="Collapse sidebar"
                            title="Collapse sidebar"
                            className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground transition-colors duration-100 hover:bg-sa-hover-strong hover:text-foreground"
                        >
                            <PanelLeftClose className="h-4 w-4" strokeWidth={1.75} />
                        </button>
                    </div>

                    {/* Search → command palette */}
                    <div className="shrink-0 px-2 pb-2">
                        <button
                            type="button"
                            onClick={() => setIsCommandPaletteOpen(true)}
                            className="flex h-8 w-full items-center gap-2 rounded-lg border border-sa-border bg-sa-surface px-2.5 text-[13px] text-muted-foreground transition-colors duration-100 hover:border-sa-border-strong hover:text-foreground"
                            title="Search keywords (Ctrl+P)"
                        >
                            <Search className="h-3.5 w-3.5 shrink-0" />
                            <span className="flex-1 text-left">Search…</span>
                            <kbd className="font-mono text-[10px] text-muted-foreground/80">Ctrl P</kbd>
                        </button>
                    </div>

                    <div className="shrink-0">
                        <SidebarModuleNav />
                    </div>

                    {/* Active module section */}
                    <div className="mt-3 flex h-9 shrink-0 items-center gap-3 border-t border-editor-border pl-4 pr-2">
                        <span className="shrink-0 whitespace-nowrap text-[11px] font-medium uppercase tracking-wide text-muted-foreground">{viewTitle}</span>
                        <div className="ml-auto flex min-w-0 justify-end">
                            <RightSideBar hideFilter={module?.hideRightSideBarFilter ?? false} />
                        </div>
                    </div>
                    <div className="min-h-0 flex-1 overflow-hidden">{SidebarView ? <SidebarView /> : null}</div>

                    <SidebarFooter />
                </aside>
            )}
        </Panel>
    );
}
