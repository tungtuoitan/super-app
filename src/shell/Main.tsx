import { BrowserRouter } from "react-router-dom";
import { SnackbarProvider } from "notistack";
import { DndProvider } from "react-dnd";
import { HTML5Backend } from "react-dnd-html5-backend";
import { WorkspaceProviders } from "@/features/workspace";
import { KProviders } from "@/features/K";
import { NoteProviders } from "@/features/note";
import { WsProviders } from "@/features/workspace";
import { ProjectProviders } from "@/features/project";
import { MpTaskProvider } from "@/features/multiProject";
import { TaskDetailProvider } from "@/features/taskDetail";
import { TaskDetailSectionProvider } from "@/features/taskDetail";
import { TaskSectionProvider } from "@/features/taskDetail";
import { MultiTimelineProvider } from "@/features/multiProject";
import { LifeLogProvider } from "@/features/lifeLog";
import { WikiProvider } from "@/features/Wiki/";
import { OrchestratorContextMenu } from "@/shared";
import { ConfirmationPopoverProvider } from "@/shared";
import { ConfirmationPopoverContainer } from "@/shell";
import MainNav from "./components/main/MainNav";
import { NavProvider } from "@/contexts/NavigationContext";

import { OrchestratorContextMenuStoreProvider } from "@/shared";
import { GridControlProvider } from "@/shared";
import { DeviceProvider } from "@/shared";
import { DebugLoggerProvider } from "@/shared";
import { ShellProvider } from "./store/ShellProvider";
import { StandardRegistryProvider } from "@/shared";
import { CommandPaletteProvider } from "./commandPallete/useCommandPalette.store";
import { PTaskProvider } from "@/features/project";
import { AuthCallbackProvider } from "@/shared";
import { AuthStoreProvider } from "@/shared";
import { AuthGuard } from "@/shared";
import {ConsoleProvider} from "@/shared";

/**
 * Main application layout component.
 *
 * Provider hierarchy groups:
 * - Infrastructure: BrowserRouter, Nav, Mobile, DebugLogger, Auth, Console
 * - App shell: General, CommandPalette, NavigationHistory
 * - Feature stores: Workspace, K, Ws, Project, Task, Note, Editor
 * - UI layer: Dialog, ContextMenu, ConfirmationPopover, AuthGuard
 *
 * IMPORTANT: DndProvider MUST stay here — both react-arborist and
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
                                                <OrchestratorContextMenuStoreProvider>
                                                    <ConfirmationPopoverProvider>
                                                        <AuthCallbackProvider>
                                                            <AuthStoreProvider>
                                                                <AuthGuard>
                                                                    <GridControlProvider>
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
                                                                                                                <LifeLogProvider>
                                                                                                                    <WikiProvider>
                                                                                                                        <NoteProviders>
                                                                                                                            <OrchestratorContextMenu>
                                                                                                                                <MainNav />
                                                                                                                            </OrchestratorContextMenu>
                                                                                                                        </NoteProviders>
                                                                                                                    </WikiProvider>
                                                                                                                </LifeLogProvider>
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
                                                                    </GridControlProvider>
                                                                </AuthGuard>
                                                            </AuthStoreProvider>
                                                        </AuthCallbackProvider>
                                                        <ConfirmationPopoverContainer />
                                                    </ConfirmationPopoverProvider>
                                                </OrchestratorContextMenuStoreProvider>
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
