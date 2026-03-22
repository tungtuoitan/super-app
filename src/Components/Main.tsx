import { BrowserRouter } from "react-router-dom";
import { SnackbarProvider } from "notistack";
import { DndProvider } from "react-dnd";
import { HTML5Backend } from "react-dnd-html5-backend";

import { AuthStoreProvider, useAuthStore } from "@/store/auth/Auth.store";
import { WorkspaceProvider } from "@/store/workspace/Workspace.store";
import { FolderDialogProvider } from "@/store/workspace/FolderDialog.store";
import { NoteGridPopupProvider } from "@/store/workspace/NoteGridPopup.store";
import { MovingTreeProvider } from "@/store/workspace/MovingTree.store";
import { OrchestratorContextMenu } from "@/shared/contexts";
import { ConfirmationPopoverProvider } from "@/store/confirmationPopover/ConfirmationPopover.store";
import { ConfirmationPopoverContainer } from "@/Components/ConfirmationPopover";
import MainNav from "./MainNav/MainNav"; 
import { DialogProvider, EditorTabProvider, EditorProvider, GeneralProvider, CommandPaletteProvider, ConsoleProvider } from "@/store/index";
import { EditorToolbarProvider } from "@/store/editor/EditorToolbar.store";
import { NoteDetailProvider } from "@/store/note/useNoteDetail.store"; 
import { NoteGridProvider } from "@/store/note/useNoteGrid.store";
import { NavProvider } from "@/contexts/NavigationContext";
import { WsProvider } from "@/store/ws/useWs.store";
import { WsDetailProvider } from "@/store/ws/useWsDetail.store";
import { ProjectProvider } from "@/store/project/useProject.store";
import { ProjectDetailProvider } from "@/store/project/useProjectDetail.store";
import { TaskGridProvider } from "@/store/task/useTaskGrid.store";
import { TaskDetailProvider } from "@/store/task/useTaskDetail.store";
import { TaskChecklistProvider } from "@/store/task/useTaskChecklist.store";
import { TaskProcessProvider } from "@/store/task/useTaskProcess.store";
import { TaskDetailSectionProvider } from "@/store/task/useTaskDetailSection.store";
import { TaskTimelineProvider } from "@/store/task/useTaskTimeline.store";
import { MultiTimelineProvider } from "@/store/task/useMultiTimeline.store";
import { TaskCommentProvider } from "@/store/task/useTaskComment.store";
import { ActivityBarProvider } from "@/store/index";
import { AuthCallbackProvider } from "@/store/index";
import { AuthGuard } from "@/Components/Auth/AuthGuard";
import { OrchestratorContextMenuStoreProvider } from "@/store/contextMenu/ContextMenu.store";
import { GridControlProvider } from "@/store/grid/useGridControl.store";
import { NavigationHistoryProvider } from "@/store/editor/NavigationHistory.store";
import { MobileProvider } from "@/store/mobile/Mobile.store";
import { DebugLoggerProvider } from "store/debug/DebugLogger.store";
import { TrackingGraphProvider } from "@/store/tracking/TrackingGraph.store";
import { LifeLogProvider } from "@/store/lifeLog/useLifeLog.store";
import {KProvider} from "./K/store/K.store";
import {KFolderDialogProvider} from "./K/store/KNodeDialog.store";
import {KMovingTreeProvider} from "./K/store/KMovingTree.store";

/**
 * Main application layout component.
 *
 * This component serves as the primary layout wrapper for the entire application,
 * providing essential providers and routing functionality. It sets up:
 * - Browser routing for client-side navigation
 * - Snackbar notifications with auto-hide and custom close button
 * - DnD (Drag and Drop) context for react-arborist and react-mosaic-component
 * - Authentication context for user session management
 * - Global context menu system for right-click functionality
 * - Main navigation structure
 *
 * The component ensures the application fills the available space with proper
 * overflow handling to prevent scrolling issues.
 *
 * IMPORTANT: DndProvider MUST be placed here (centralized) to support both
 * react-arborist and react-mosaic-component using the same DnD context.
 *
 * @returns The main layout component with all necessary providers
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
                                                <NavigationHistoryProvider>
                                                    <GeneralProvider>
                                                        <CommandPaletteProvider>
                                                            <WorkspaceProvider>
                                                                <KProvider>
                                                                    <FolderDialogProvider>
                                                                        <KFolderDialogProvider>
                                                                            <NoteGridPopupProvider>
                                                                                    <MovingTreeProvider>
                                                                                        <KMovingTreeProvider>
                                                                                            <WsProvider>
                                                                                                <WsDetailProvider>
                                                                                                    <ProjectProvider>
                                                                                                        <ProjectDetailProvider>
                                                                                                            <TaskGridProvider>
                                                                                                                <TaskDetailProvider>
                                                                                                                    <TaskChecklistProvider>
                                                                                                                        <TaskProcessProvider>
                                                                                                                            <TaskDetailSectionProvider>
                                                                                                                                <TaskCommentProvider>
                                                                                                                                    <TaskTimelineProvider>
                                                                                                                                        <MultiTimelineProvider>
                                                                                                                                <LifeLogProvider>
                                                                                                                                <NoteDetailProvider>
                                                                                                                                    <NoteGridProvider>
                                                                                                                                        <EditorTabProvider>
                                                                                                                                            <TrackingGraphProvider>
                                                                                                                                                <EditorProvider>
                                                                                                                                                    <EditorToolbarProvider>
                                                                                                                                                        <DialogProvider>
                                                                                                                                                            <OrchestratorContextMenuStoreProvider>
                                                                                                                                                                <ConfirmationPopoverProvider>
                                                                                                                                                                    <OrchestratorContextMenu>
                                                                                                                                                                        <AuthGuard>
                                                                                                                                                                            <GridControlProvider>
                                                                                                                                                                                <MainNav />
                                                                                                                                                                            </GridControlProvider>
                                                                                                                                                                        </AuthGuard>
                                                                                                                                                                    </OrchestratorContextMenu>
                                                                                                                                                                    <ConfirmationPopoverContainer />
                                                                                                                                                                </ConfirmationPopoverProvider>
                                                                                                                                                            </OrchestratorContextMenuStoreProvider>
                                                                                                                                                        </DialogProvider>
                                                                                                                                                    </EditorToolbarProvider>
                                                                                                                                                </EditorProvider>
                                                                                                                                            </TrackingGraphProvider>
                                                                                                                                        </EditorTabProvider>
                                                                                                                                    </NoteGridProvider>
                                                                                                                                </NoteDetailProvider>
                                                                                                                            </LifeLogProvider>
                                                                                                                            </MultiTimelineProvider>
                                                                                                                                    </TaskTimelineProvider>
                                                                                                                                </TaskCommentProvider>
                                                                                                                            </TaskDetailSectionProvider>
                                                                                                                        </TaskProcessProvider>
                                                                                                                    </TaskChecklistProvider>
                                                                                                                </TaskDetailProvider>
                                                                                                            </TaskGridProvider>
                                                                                                        </ProjectDetailProvider>
                                                                                                    </ProjectProvider>
                                                                                                </WsDetailProvider>
                                                                                            </WsProvider>
                                                                                        </KMovingTreeProvider>
                                                                                    </MovingTreeProvider>
                                                                            </NoteGridPopupProvider>
                                                                        </KFolderDialogProvider>
                                                                    </FolderDialogProvider>
                                                                </KProvider>
                                                            </WorkspaceProvider>
                                                        </CommandPaletteProvider>
                                                    </GeneralProvider>
                                                </NavigationHistoryProvider>
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
