import { MenuItem, MenuDivider } from "@szhsin/react-menu";
import { Plus, Trash2, RotateCcw } from "lucide-react";
import { useKMenuHelper } from "../helpers/useKMenu.helper";
import { useKTreeStatusHelper } from "../../hooks/kTree/useKTreeStatusHelper";
import {useOrchestratorContextMenuStore} from "@/shared";

export function KNodePanelCardMenu() {
    const { contextData, setIsContextMenuOpen } = useOrchestratorContextMenuStore();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const ctxData = contextData as any;
    const { dhr_items } = useKMenuHelper();
    const _TREESTATUS = useKTreeStatusHelper();

    const _ITEMSTATUS = _TREESTATUS.getItemStatus(ctxData);

    const handleNewCard = () => {
        setIsContextMenuOpen(false);
        window.dispatchEvent(new CustomEvent("k-node-inline-create", {
            detail: { knowledgeId: ctxData?.knowledgeId, parentId: ctxData?.id ?? null },
        }));
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
