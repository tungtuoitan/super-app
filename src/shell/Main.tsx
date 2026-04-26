import { BrowserRouter } from "react-router-dom";
import { SnackbarProvider } from "notistack";
import { DndProvider } from "react-dnd";
import { HTML5Backend } from "react-dnd-html5-backend";

import { AuthStoreProvider } from "@/shell/store/Auth.store";
import { WorkspaceProviders } from "@/features/workspace/store/WorkspaceProviders";
import { KProviders } from "@/features/K/store/KProviders";
import { NoteProviders } from "@/features/note/store/NoteProviders";
import { WsProviders } from "@/features/ws/store/WsProviders";
import { ProjectProviders } from "@/features/project/store/ProjectProviders";
import { TaskProvider } from "@/features/task/store/useTask.store";
import { MultiTimelineProvider } from "@/features/multiProject/store/useMultiTimeline.store";
import { LifeLogProvider } from "@/features/lifeLog/store/useLifeLog.store";
import { WikiProvider } from "@/features/Wiki/store/useWiki.store";
import { ShellProviders } from "@/shell/store/ShellProviders";
import { OrchestratorContextMenu } from "@/shared/contexts";
import { ConfirmationPopoverProvider } from "@/store/ConfirmationPopover.store";
import { ConfirmationPopoverContainer } from "@/shell/components/ConfirmationPopoverContainer";
import MainNav from "./components/main/MainNav";
import { GeneralProvider, CommandPaletteProvider, ConsoleProvider, ActivityBarProvider, AuthCallbackProvider } from "@/store/index";
import { NavProvider } from "@/contexts/NavigationContext";
import { AuthGuard } from "@/shell/auth/AuthGuard";
import { OrchestratorContextMenuStoreProvider } from "@/store/ContextMenu.store";
import { GridControlProvider } from "@/store/useGridControl.store";
import { CurrentProjectProvider } from "@/store/useCurrentProject.store";
import { MobileProvider } from "@/store/Mobile.store";
import { DebugLoggerProvider } from "@/store/DebugLogger.store";

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
                <MobileProvider>
                    <DebugLoggerProvider>
                        <AuthCallbackProvider>
                            <ActivityBarProvider>
                                <ConsoleProvider>
                                    <SnackbarProvider autoHideDuration={3000}>
                                        <DndProvider backend={HTML5Backend}>
                                            <AuthStoreProvider>
                                                    <GeneralProvider>
                                                        <CommandPaletteProvider>
                                                            <OrchestratorContextMenuStoreProvider>
                                                                <ConfirmationPopoverProvider>
                                                                    <AuthGuard>
                                                                        <GridControlProvider>
                                                                            {/* Main application content */}

                                                                            <WorkspaceProviders>
                                                                                <KProviders>
                                                                                    <WsProviders>
                                                                                        <ProjectProviders>
                                                                                            <TaskProvider>
                                                                                                <MultiTimelineProvider>
                                                                                                    <LifeLogProvider>
                                                                                                        <WikiProvider>
                                                                                                            <NoteProviders>
                                                                                                                <ShellProviders>
                                                                                                                    <CurrentProjectProvider>
                                                                                                                        <OrchestratorContextMenu>
                                                                                                                            <MainNav />
                                                                                                                        </OrchestratorContextMenu>
                                                                                                                    </CurrentProjectProvider>
                                                                                                                </ShellProviders>
                                                                                                            </NoteProviders>
                                                                                                        </WikiProvider>
                                                                                                    </LifeLogProvider>
                                                                                                </MultiTimelineProvider>
                                                                                            </TaskProvider>
                                                                                        </ProjectProviders>
                                                                                    </WsProviders>
                                                                                </KProviders>
                                                                            </WorkspaceProviders>
                                                                        </GridControlProvider>
                                                                    </AuthGuard>
                                                                    <ConfirmationPopoverContainer />
                                                                </ConfirmationPopoverProvider>
                                                            </OrchestratorContextMenuStoreProvider>
                                                        </CommandPaletteProvider>
                                                    </GeneralProvider>
                                            </AuthStoreProvider>
                                        </DndProvider>
                                    </SnackbarProvider>
                                </ConsoleProvider>
                            </ActivityBarProvider>
                        </AuthCallbackProvider>
                    </DebugLoggerProvider>
                </MobileProvider>
            </NavProvider>
        </BrowserRouter>
    );
}
