import { useAuthStore, useConsoleHelper } from "@/shared";
import { useKStore } from "../../store/useK.store";
import { useKLoader } from "./useK.loader";
import { KService } from "../../service/k.service";
import { KItemAction } from "../../types/k.type";
import type { KItemV2 } from "../../types/kV2.type";

export const useKNodeInlineRename = () => {
    const _console = useConsoleHelper();
    const { $user } = useAuthStore();
    const { currentK } = useKStore();
    const { loadTree } = useKLoader();

    const renameNode = async (nodeItem: KItemV2, newName: string): Promise<boolean> => {
        const trimmed = newName.trim();
        if (!trimmed || !currentK?.id) return false;

        try {
            await KService._upsertWorkspaceItems($user.userToken, currentK.id, [{
                action: KItemAction.Update,
                id: nodeItem.id,
                nodeData: {
                    name: trimmed,
                    description: nodeItem.description ?? undefined,
                    color: nodeItem.color ?? undefined,
                    icon: nodeItem.icon ?? undefined,
                },
            }]);
            await loadTree();
            return true;
        } catch (error: any) {
            _console.error(error?.message || "Failed to rename");
            return false;
        }
    };

    return { renameNode };
};
