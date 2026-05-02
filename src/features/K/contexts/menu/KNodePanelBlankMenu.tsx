import {useMenuContext, useMenuContextHelper} from "@/shared";
import { MenuItem } from "@szhsin/react-menu";
import { Plus } from "lucide-react";
import { dispatchKNodeInlineCreate } from "../../utils/kEvents.utils";

export function KNodePanelBlankMenu() {
    const { contextData } = useMenuContext();
    const { setIsMenuContextOpen } = useMenuContextHelper();

    const handleNewCard = () => {
        setIsMenuContextOpen(false);
        dispatchKNodeInlineCreate({ knowledgeId: contextData?.knowledgeId, parentId: contextData?.id ?? null });
    };

    return (
        <MenuItem onClick={handleNewCard}>
            <Plus className="w-4 h-4 mr-2" />
            New Card
        </MenuItem>
    );
}
