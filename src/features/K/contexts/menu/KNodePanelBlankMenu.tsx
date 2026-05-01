import {useMenuContext, useMenuContextHelper} from "@/shared";
import { MenuItem } from "@szhsin/react-menu";
import { Plus } from "lucide-react";

export function KNodePanelBlankMenu() {
    const { contextData } = useMenuContext();
    const { setIsMenuContextOpen } = useMenuContextHelper();

    const handleNewCard = () => {
        setIsMenuContextOpen(false);
        window.dispatchEvent(new CustomEvent("k-node-inline-create", {
            detail: { knowledgeId: contextData?.knowledgeId, parentId: contextData?.id ?? null },
        }));
    };

    return (
        <MenuItem onClick={handleNewCard}>
            <Plus className="w-4 h-4 mr-2" />
            New Card
        </MenuItem>
    );
}
