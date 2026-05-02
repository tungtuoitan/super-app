import { MenuItem } from "@szhsin/react-menu";
import { Plus } from "lucide-react";
import { useOrchestratorContextMenuStore } from "@/shared";

export function KNodePanelBlankMenu() {
    const { contextData, setIsContextMenuOpen } = useOrchestratorContextMenuStore();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const ctxData = contextData as any;

    const handleNewCard = () => {
        setIsContextMenuOpen(false);
        window.dispatchEvent(new CustomEvent("k-node-inline-create", {
            detail: { knowledgeId: ctxData?.knowledgeId, parentId: ctxData?.id ?? null },
        }));
    };

    return (
        <MenuItem onClick={handleNewCard}>
            <Plus className="w-4 h-4 mr-2" />
            New Card
        </MenuItem>
    );
}
