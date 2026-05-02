import { BrowserRouter } from "react-router-dom";
import { SnackbarProvider } from "notistack";
import { DndProvider } from "react-dnd";
import { HTML5Backend } from "react-dnd-html5-backend";
import { WorkspaceProviders, WorkspaceKeywordPluginInit } from "@/features/workspace";
import { KProviders } from "@/features/K";
import { NoteProviders } from "@/features/note";
import { WsProviders } from "@/features/workspace";
import { ProjectProviders } from "@/features/project";
import { MpTaskProvider } from "@/features/multiProject";
import { TaskDetailProvider } from "@/features/taskDetail";
import { TaskDetailSectionProvider } from "@/features/taskDetail";
import { TaskSectionProvider } from "@/features/taskDetail";
import { MultiTimelineProvider } from "@/features/multiProject";
// LifeLog store is Zustand-based — no Provider needed.
import { WikiProvider } from "@/features/Wiki/";
import { MenuContext } from "@/shared";
import { ConfirmationPopoverProvider } from "@/shared";
import MainNav from "./shell/components/main/MainNav";
import { NavProvider } from "@/contexts/NavigationContext";

import { MenuContextStoreProvider } from "@/shared";
import { DeviceProvider } from "@/shared";
import { DebugLoggerProvider } from "@/shared";
import { ShellProvider } from "./shell/store/ShellProvider";
import { StandardRegistryProvider } from "@/shared";
import { CommandPaletteProvider } from "./shell/commandPallete/useCommandPalette.store";
import { PTaskProvider } from "@/features/project";
import { AuthCallbackProvider } from "@/shared";
import { AuthStoreProvider } from "@/shared";
import { AuthGuard } from "@/shared";
import {ConsoleProvider} from "@/shared";
import {ConfirmationPopoverContainer} from "@/shared";

/**
 * Main application layout component.
 *
 * Provider hierarchy groups:
 * - Infrastructure: BrowserRouter, Nav, Mobile, DebugLogger, Auth, Console
 * - App shell: General, CommandPalette, NavigationHistory
 * - Feature stores: Workspace, K, Ws, Project, Task, Note, Editor
 * - UI layer: Dialog, MenuContext, ConfirmationPopover, AuthGuard
 *
 * IMPORTANT: DndProvider MUST stay here â€” both react-arborist and
 * react-mosaic-component require a shared DnD context.
 */
export function Main() {
    return (
        <BrowserRouter>
            <NavProvider>
                <ConsoleProvider>
                    <ShellProvider>
                        <DeviceProvider>
                            <DebugLoggerProvider>
                                <SnackbarProvider autoHideDuration={3000}>
                                    <DndProvider backend={HTML5Backend}>
                                        <StandardRegistryProvider>
                                            <CommandPaletteProvider>
                                                <MenuContextStoreProvider>
                                                    <ConfirmationPopoverProvider>
                                                        <AuthCallbackProvider>
                                                            <AuthStoreProvider>
                                                                <AuthGuard>
                                                                        {/* Main application content */}
                                                                        <WorkspaceProviders>
                                                                            <KProviders>
                                                                                <WsProviders>
                                                                                    <ProjectProviders>
                                                                                        <PTaskProvider>
                                                                                            <MpTaskProvider>
                                                                                                <TaskDetailProvider>
                                                                                                    <TaskSectionProvider>
                                                                                                        <TaskDetailSectionProvider>
                                                                                                            <MultiTimelineProvider>
                                                                                                                <WikiProvider>
                                                                                                                    <NoteProviders>
                                                                                                                        <MenuContext>
                                                                                                                            <WorkspaceKeywordPluginInit />
                                                                                                                            <MainNav />
                                                                                                                        </MenuContext>
                                                                                                                    </NoteProviders>
                                                                                                                </WikiProvider>
                                                                                                            </MultiTimelineProvider>
                                                                                                        </TaskDetailSectionProvider>
                                                                                                    </TaskSectionProvider>
                                                                                                </TaskDetailProvider>
                                                                                            </MpTaskProvider>
                                                                                        </PTaskProvider>
                                                                                    </ProjectProviders>
                                                                                </WsProviders>
                                                                            </KProviders>
                                                                        </WorkspaceProviders>
                                                                </AuthGuard>
                                                            </AuthStoreProvider>
                                                        </AuthCallbackProvider>
                                                        <ConfirmationPopoverContainer />
                                                    </ConfirmationPopoverProvider>
                                                </MenuContextStoreProvider>
                                            </CommandPaletteProvider>
                                        </StandardRegistryProvider>
                                    </DndProvider>
                                </SnackbarProvider>
                            </DebugLoggerProvider>
                        </DeviceProvider>
                    </ShellProvider>
                </ConsoleProvider>
            </NavProvider>
        </BrowserRouter>
    );
}
