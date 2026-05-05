import { shellConstants } from "@/shell";
import type { BaseTab } from "@/shell";
import type { SaveActions } from "@/shell";
import { useKLoader } from "./kTree/useK.loader";
import { useKStore } from "../store/useK.store";
import { useEditorTabBarHelper } from "@/shell";
import type { KWsResponse } from "../types/k.type";

export function useKSaveActions(): SaveActions {
    const { createKnowledge, updateKnowledge } = useKLoader();
    const { setSelectedKId } = useKStore();
    const { patchTab } = useEditorTabBarHelper();

    const handles = (tabType: string) => tabType === shellConstants.vscode.tab.tabTypes.kKnowledge;

    const onSave = async (tab: BaseTab) => {
        if (tab.type !== shellConstants.vscode.tab.tabTypes.kKnowledge) return;

        const knowledge = tab.data as KWsResponse;
        if (!knowledge) return;

        const isNew = knowledge.id < 0;
        const payload = {
            name: knowledge.name,
            description: knowledge.description,
            imageBase64: knowledge.imageBase64,
            ...(isNew && { status: "active" }),
        };

        if (isNew) {
            const created = await createKnowledge(payload);
            if (created) {
                patchTab(tab.id, { data: created, data0: created, title: created.name, hasUnsavedChanges: false });
                setSelectedKId(created.id);
            }
        } else {
            await updateKnowledge(knowledge.id, payload);
            patchTab(tab.id, (cur) => ({ data0: cur.data, hasUnsavedChanges: false }));
        }
    };

    return { handles, onSave };
}
