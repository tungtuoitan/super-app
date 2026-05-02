import { useWorkspaceStore } from "../store/workspace.store";
import { workspaceService } from "../service/workspace.service";
import { wsService } from "@/features/workspace/service/ws.service";
import { useAuthStore } from "@/shared";
import { WorkspaceDTO } from "../types/workspace-dto.types";
import { WorkspaceItemV2 } from "@/features/workspace/types/workspace-v2.types";
import { useMovingTreeStore } from "../store/MovingTree.store";
import { useConsoleHelper } from "@/shared";
import { ResultOptions } from "@/shared";

export const useWorkspaceLoader = () => {
    const { $user } = useAuthStore();
    const _console = useConsoleHelper();
    const { allWorkspaces, setAllWorkspaces, currentWorkspace, setSelectedWorkspaceId, selectedWorkspaceId, setCurrentWorkspace, setIsLoadingWorkspaces, setIsLoadingTree } = useWorkspaceStore();
    const { setTargetWorkspaceId } = useMovingTreeStore();

    const loadAllWorkspaces = async () => {
        try {
            setIsLoadingWorkspaces(true);
            const token = $user.userToken;
            const data = await workspaceService._getAllUserWorkspaces(token);
            setAllWorkspaces(data);
            if (data.length > 0 && !currentWorkspace) {
                const defaultWorkspaceId = data[0].id;
                setSelectedWorkspaceId(defaultWorkspaceId);
                if (data.length > 1) {
                    setTargetWorkspaceId(data.length > 0 ? data[1].id : null);
                }
            }
            return data;
        } catch (error) {
            console.error("Failed to load workspaces:", error);
            throw error;
        } finally {
            setIsLoadingWorkspaces(false);
        }
    };

    const loadTree = async (calculatedVirtualItems?: WorkspaceItemV2[], targetWorkspaceId?: number): Promise<WorkspaceDTO | undefined> => {
        const workspaceIdToLoad = targetWorkspaceId ?? selectedWorkspaceId;
        if (workspaceIdToLoad == null) {
            console.warn("workspaceId is null, cant load tree");
            return;
        }

        try {
            setIsLoadingTree(true);
            const token = $user.userToken;
            const result: ResultOptions<WorkspaceDTO> = await workspaceService._getWorkspaceTreeV2(token, workspaceIdToLoad);
            if (result?.success) {
                const existingVirtualItems = (currentWorkspace?.flatData ?? []).filter((item: WorkspaceItemV2) => item?.id < 0);
                const mergedVirtualItems = calculatedVirtualItems ? calculatedVirtualItems : existingVirtualItems;
                const newWorkspace = {
                    ...result.object,
                    flatData: [...result.object?.flatData ?? [], ...mergedVirtualItems],
                } as WorkspaceDTO;
                setCurrentWorkspace(newWorkspace);
                return newWorkspace;
            }
        } catch (error) {
            throw error;
        } finally {
            setTimeout(() => { setIsLoadingTree(false); }, 100);
        }
    };

    const softDeleteWorkspace = async (workspaceId: number) => {
        try {
            const token = $user.userToken;
            const ws = allWorkspaces.find((w) => w.id === workspaceId);
            if (!ws) return;
            const result = await wsService._upsertWsBatch(token, [
                { id: ws.id, name: ws.name, description: ws.description, userId: ws.userId, deletedAt: new Date().toISOString() },
            ]);
            if (result.success) {
                _console.success("Workspace deleted");
                await loadAllWorkspaces();
            }
        } catch (error) {
            _console.error("Failed to delete workspace");
        }
    };

    return { loadAllWorkspaces, loadTree, softDeleteWorkspace };
};
