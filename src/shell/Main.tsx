import { BrowserRouter } from "react-router-dom";
import { SnackbarProvider } from "notistack";
import { DndProvider } from "react-dnd";
import { HTML5Backend } from "react-dnd-html5-backend";
import { WorkspaceProviders } from "@/features/workspace/store/WorkspaceProviders";
import { KProviders } from "@/features/K/store/KProviders";
import { NoteProviders } from "@/features/note/store/NoteProviders";
import { WsProviders } from "@/features/workspace/store/ws/WsProviders";
import { ProjectProviders } from "@/features/project/store/ProjectProviders";
import { MpTaskProvider } from "@/features/multiProject/store/useMpTask.store";
import { TaskDetailProvider } from "@/features/taskDetail/store/useTaskDetail.store";
import { TaskDetailSectionProvider } from "@/features/taskDetail/store/useTaskDetailSection.store";
import { TaskSectionProvider } from "@/features/taskDetail/store/useTaskSection.store";
import { MultiTimelineProvider } from "@/features/multiProject/store/useMultiTimeline.store";
import { LifeLogProvider } from "@/features/lifeLog/store/useLifeLog.store";
import { WikiProvider } from "@/features/Wiki/store/useWiki.store";
import { OrchestratorContextMenu } from "@/shared/index";
import { ConfirmationPopoverProvider } from "@/shared/store/ConfirmationPopover.store";
import { ConfirmationPopoverContainer } from "@/shell/components/ConfirmationPopoverContainer";
import MainNav from "./components/main/MainNav";
import { NavProvider } from "@/contexts/NavigationContext";
import { AuthGuard } from "@/shell/auth/AuthGuard";
import { OrchestratorContextMenuStoreProvider } from "@/shared/menuContexts/ContextMenu.store";
import { GridControlProvider } from "@/shared/store/useGridControl.store";
import { MobileProvider } from "@/shared/store/Mobile.store";
import { DebugLoggerProvider } from "@/shared/store/DebugLogger.store";
import { ShellProvider } from "./store/ShellProvider";
import {GeneralProvider} from "@/shared/store/General.store";
import {CommandPaletteProvider} from "./store/useCommandPalette.store";
import {PTaskProvider} from "@/features/project/store/usePTask.store";

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
