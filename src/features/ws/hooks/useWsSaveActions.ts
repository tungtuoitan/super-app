import { useCallback } from "react";
import { constants } from "@/utils/constants";
import { useWsDetailHelper } from "./useWsDetail.helper";
import { useWsGridHelper } from "./useWsGrid.helper";
import type { SaveActions } from "@/shell/hooks/useSaveActions.types";
import type { BaseTab } from "@/types/editor/tab.types";

export function useWsSaveActions(): SaveActions {
    const { upsertWorkspace } = useWsDetailHelper();
    const { loadWorkspaces } = useWsGridHelper();

    const handles = (tabType: string) => tabType === constants.vscode.tab.tabTypes.workspace;

    const onSave = useCallback(async (tab: BaseTab) => {
        await upsertWorkspace(tab.id);
        loadWorkspaces();
    }, [upsertWorkspace, loadWorkspaces]);

    return { handles, onSave };
}
