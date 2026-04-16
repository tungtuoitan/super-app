import { BrowserRouter } from "react-router-dom";
import { SnackbarProvider } from "notistack";
import { DndProvider } from "react-dnd";
import { HTML5Backend } from "react-dnd-html5-backend";

import { AuthStoreProvider, useAuthStore } from "@/store/Auth.store";
import { WorkspaceProvider } from "@/features/workspace/store/Workspace.store";
import { FolderDialogProvider } from "@/features/workspace/store/FolderDialog.store";
import { NoteGridPopupProvider, NoteDetailProvider, NoteGridProvider } from "@/features/note";
import { MovingTreeProvider } from "@/features/workspace/store/MovingTree.store";
import { OrchestratorContextMenu } from "@/shared/contexts";
import { ConfirmationPopoverProvider } from "@/store/ConfirmationPopover.store";
import { ConfirmationPopoverContainer } from "@/shell/components/ConfirmationPopoverContainer";
import MainNav from "./components/MainNav"; 
import { DialogProvider, EditorTabProvider, EditorProvider, GeneralProvider, CommandPaletteProvider, ConsoleProvider } from "@/store/index";
import { EditorToolbarProvider } from "@/store/editor/EditorToolbar.store";
import { NavProvider } from "@/contexts/NavigationContext";
import { WsProvider } from "@/features/ws/store/useWs.store";
import { WsDetailProvider } from "@/features/ws/store/useWsDetail.store";
import { ProjectProvider } from "@/features/project/store/useProject.store";
import { ProjectDetailProvider } from "@/features/project/store/useProjectDetail.store";
import { TaskGridProvider } from "@/features/task/store/useTaskGrid.store";
import { TaskDetailProvider } from "@/features/task/store/useTaskDetail.store";
import { TaskChecklistProvider } from "@/features/task/store/useTaskChecklist.store";
import { TaskProcessProvider } from "@/features/task/store/useTaskProcess.store";
import { TaskDetailSectionProvider } from "@/features/task/store/useTaskDetailSection.store";
import { TaskSectionProvider } from "@/features/task/store/useTaskSection.store";
import { TaskTimelineProvider } from "@/features/task/store/useTaskTimeline.store";
import { MultiTimelineProvider } from "@/features/multiProject/store/useMultiTimeline.store";
import { TaskCommentProvider } from "@/features/task/store/useTaskComment.store";
import { ActivityBarProvider } from "@/store/index";
import { AuthCallbackProvider } from "@/store/index";
import { AuthGuard } from "@/shell/auth/AuthGuard";
import { OrchestratorContextMenuStoreProvider } from "@/store/ContextMenu.store";
import { GridControlProvider } from "@/store/useGridControl.store";
import { CurrentProjectProvider } from "@/store/useCurrentProject.store";
import { NavigationHistoryProvider } from "@/store/editor/NavigationHistory.store";
import { MobileProvider } from "@/store/Mobile.store";
import { DebugLoggerProvider } from "@/store/DebugLogger.store";
import { LifeLogProvider } from "@/features/lifeLog/store/useLifeLog.store";
import {KProvider} from "@/features/K/store/K.store";
import {KFolderDialogProvider} from "@/features/K/store/KNodeDialog.store";
import {KMovingTreeProvider} from "@/features/K/store/KMovingTree.store";

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
                                                                                                                                <TaskSectionProvider>
                                                                                                                                <TaskCommentProvider>
                                                                                                                                    <TaskTimelineProvider>
                                                                                                                                        <MultiTimelineProvider>
                                                                                                                                <LifeLogProvider>
                                                                                                                                <NoteDetailProvider>
                                                                                                                                    <NoteGridProvider>
                                                                                                                                        <EditorTabProvider>
                                                                                                                                                <EditorProvider>
                                                                                                                                                    <EditorToolbarProvider>
                                                                                                                                                        <DialogProvider>
                                                                                                                                                            <OrchestratorContextMenuStoreProvider>
                                                                                                                                                                <ConfirmationPopoverProvider>
                                                                                                                                                                    <OrchestratorContextMenu>
                                                                                                                                                                        <AuthGuard>
                                                                                                                                                                            <GridControlProvider>
                                                                                                                                                                                <CurrentProjectProvider>
                                                                                                                                                                                <MainNav />
                                                                                                                                                                            </CurrentProjectProvider>
                                                                                                                                                                            </GridControlProvider>
                                                                                                                                                                        </AuthGuard>
                                                                                                                                                                    </OrchestratorContextMenu>
                                                                                                                                                                    <ConfirmationPopoverContainer />
                                                                                                                                                                </ConfirmationPopoverProvider>
                                                                                                                                                            </OrchestratorContextMenuStoreProvider>
                                                                                                                                                        </DialogProvider>
                                                                                                                                                    </EditorToolbarProvider>
                                                                                                                                                </EditorProvider>
                                                                                                                                        </EditorTabProvider>
                                                                                                                                    </NoteGridProvider>
                                                                                                                                </NoteDetailProvider>
                                                                                                                            </LifeLogProvider>
                                                                                                                            </MultiTimelineProvider>
                                                                                                                                    </TaskTimelineProvider>
                                                                                                                                </TaskCommentProvider>
                                                                                                                                </TaskSectionProvider>
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
