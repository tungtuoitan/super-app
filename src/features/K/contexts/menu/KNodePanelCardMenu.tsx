import { MenuItem, MenuDivider } from "@szhsin/react-menu";
import { Plus, Trash2, RotateCcw } from "lucide-react";
import { useKMenuHelper } from "../helpers/useKMenu.helper";
import { useKTreeStatusHelper } from "../../hooks/kTree/useKTreeStatus.helper";
import {useMenuContext, useMenuContextHelper} from "@/shared";
import { dispatchKNodeInlineCreate } from "../../utils/kEvents.utils";

export function KNodePanelCardMenu() {
    const { contextData } = useMenuContext();
    const { setIsMenuContextOpen } = useMenuContextHelper();
    const { dhr_items } = useKMenuHelper();
    const _TREESTATUS = useKTreeStatusHelper();

    const _ITEMSTATUS = _TREESTATUS.getItemStatus(contextData);

    const handleNewCard = () => {
        setIsMenuContextOpen(false);
        dispatchKNodeInlineCreate({ knowledgeId: contextData?.knowledgeId, parentId: contextData?.id ?? null });
    };

    return (
        <>
            <MenuItem
                onClick={handleNewCard}
                disabled={_ITEMSTATUS.isDirectlyDeleted || _ITEMSTATUS.hasDeletedAncestor}
            >
                <Plus className="w-4 h-4 mr-2" />
                New Card
            </MenuItem>

            <MenuDivider />

            {_ITEMSTATUS.isDirectlyDeleted ? (
                <MenuItem onClick={(e) => dhr_items(e, false)}>
                    <RotateCcw className="w-4 h-4 mr-2" />
                    Restore
                </MenuItem>
            ) : !_ITEMSTATUS.hasDeletedAncestor && (
                <MenuItem onClick={(e) => dhr_items(e, false)}>
                    <Trash2 className="w-4 h-4 mr-2" />
                    Delete
                </MenuItem>
            )}
        </>
    );
}
