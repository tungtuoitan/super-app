
import { constants } from "@/utils/constants";
import { useWsDetailHelper } from "./useWsDetail.helper";
import { useWsGridHelper } from "./useWsGrid.helper";
import type { BaseTab } from "@/shell";
import {SaveActions} from "@/shared";

export function useWsSaveActions(): SaveActions {
    const { upsertWorkspace } = useWsDetailHelper();
    const { loadWorkspaces } = useWsGridHelper();

    const handles = (tabType: string) => tabType === constants.vscode.tab.tabTypes.workspace;

    const onSave = async (tab: BaseTab) => {
        await upsertWorkspace(tab.id);
        loadWorkspaces();
    }

    return { handles, onSave };
}
