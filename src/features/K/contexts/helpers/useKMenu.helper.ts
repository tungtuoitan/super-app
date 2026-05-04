import { workspaceConstants } from "@/features/workspace/workspace.constants";
import { useMenuContextHelper } from "@/shared";
import { NodeItemType } from "../../store/useKNodeDialog.store";
import { useKNodeDialogHelper } from "../../hooks/useKNodeDialog.helper";
import { useKMenuDeleteHelper } from "./useKMenuDelete.helper";

export const useKMenuHelper = () => {
    const { setIsMenuContextOpen } = useMenuContextHelper();
    const { openNodeDialog } = useKNodeDialogHelper();
    const { dhr_items } = useKMenuDeleteHelper();

    const createFolder = (itemType: NodeItemType, parentTag?: any) => {
        setIsMenuContextOpen(false);
        openNodeDialog("create", itemType, null, parentTag);
    };

    const editFolder = (itemData: any) => {
        setIsMenuContextOpen(false);
        if (itemData) {
            const itemType: NodeItemType = itemData.type || workspaceConstants.itemTypes.folder;
            openNodeDialog("edit", itemType, itemData, null);
        }
    };

    return { createFolder, editFolder, dhr_items };
};
