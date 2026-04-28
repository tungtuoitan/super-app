import { BrowserRouter } from "react-router-dom";
import { SnackbarProvider } from "notistack";
import { DndProvider } from "react-dnd";
import { HTML5Backend } from "react-dnd-html5-backend";
import { WorkspaceProviders } from "@/features/workspace/store/WorkspaceProviders";
import { KProviders } from "@/features/K/store/KProviders";
import { NoteProviders } from "@/features/note/store/NoteProviders";
import { WsProviders } from "@/features/workspace/store/ws/WsProviders";
import { ProjectProviders } from "@/features/project/store/ProjectProviders";
import { PTaskProvider } from "@/features/project/task/store/usePTask.store";
import { MpTaskProvider } from "@/features/multiProject/store/useMpTask.store";
import { TaskDetailProvider } from "@/features/taskDetail/store/useTaskDetail.store";
import { TaskDetailSectionProvider } from "@/features/taskDetail/store/useTaskDetailSection.store";
import { TaskSectionProvider } from "@/features/taskDetail/store/useTaskSection.store";
import { MultiTimelineProvider } from "@/features/multiProject/store/useMultiTimeline.store";
import { LifeLogProvider } from "@/features/lifeLog/store/useLifeLog.store";
import { WikiProvider } from "@/features/Wiki/store/useWiki.store";
import { OrchestratorContextMenu } from "@/shared/menuContexts";
import { ConfirmationPopoverProvider } from "@/shared/store/ConfirmationPopover.store";
import { ConfirmationPopoverContainer } from "@/shell/components/ConfirmationPopoverContainer";
import MainNav from "./components/main/MainNav";
import { GeneralProvider, CommandPaletteProvider } from "@/store/index";
import { NavProvider } from "@/contexts/NavigationContext";
import { AuthGuard } from "@/shell/auth/AuthGuard";
import { OrchestratorContextMenuStoreProvider } from "@/shared/menuContexts/ContextMenu.store";
import { GridControlProvider } from "@/shared/store/useGridControl.store";
import { CurrentProjectProvider } from "@/store/useCurrentProject.store";
import { MobileProvider } from "@/shared/store/Mobile.store";
import { DebugLoggerProvider } from "@/shared/store/DebugLogger.store";
import { ShellProvider } from "./store/ShellProvider";

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
                <ShellProvider>
                    <MobileProvider>
                        <DebugLoggerProvider>
                            <SnackbarProvider autoHideDuration={3000}>
                                <DndProvider backend={HTML5Backend}>
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
                                                                            <PTaskProvider>
                                                                                <MpTaskProvider>
                                                                                    <TaskDetailProvider>
                                                                                        <TaskDetailSectionProvider>
                                                                                            <TaskSectionProvider>
                                                                                                <MultiTimelineProvider>
                                                                                                    <LifeLogProvider>
                                                                                                        <WikiProvider>
                                                                                                            <NoteProviders>
                                                                                                                <CurrentProjectProvider>
                                                                                                                    <OrchestratorContextMenu>
                                                                                                                        <MainNav />
                                                                                                                    </OrchestratorContextMenu>
                                                                                                                </CurrentProjectProvider>
                                                                                                            </NoteProviders>
                                                                                                        </WikiProvider>
                                                                                                    </LifeLogProvider>
                                                                                                </MultiTimelineProvider>
                                                                                            </TaskSectionProvider>
                                                                                        </TaskDetailSectionProvider>
                                                                                    </TaskDetailProvider>
                                                                                </MpTaskProvider>
                                                                            </PTaskProvider>
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
                                </DndProvider>
                            </SnackbarProvider>
                        </DebugLoggerProvider>
                    </MobileProvider>
                </ShellProvider>
            </NavProvider>
        </BrowserRouter>
    );
}
