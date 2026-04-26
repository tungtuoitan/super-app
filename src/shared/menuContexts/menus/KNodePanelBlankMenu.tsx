import { MenuItem } from "@szhsin/react-menu";
import { Plus } from "lucide-react";
import { useOrchestratorContextMenuStore } from "@/store/ContextMenu.store";

/**
 * Blank-space context menu inside KNodeEditorPanel.
 * contextData = rootNode (first card) — new card will be its child.
 */
export function KNodePanelBlankMenu() {
    const { contextData, setIsContextMenuOpen } = useOrchestratorContextMenuStore();

    const handleNewCard = () => {
        setIsContextMenuOpen(false);
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
