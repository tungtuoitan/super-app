import { MenuItem } from "@szhsin/react-menu";
import { ClipboardCopy } from "lucide-react";
import { useOrchestratorContextMenuStore } from "@/store/ContextMenu.store";

export function RichTextEditorMenu() {
    const { contextData, setIsContextMenuOpen } = useOrchestratorContextMenuStore();

    const handleCopyPlainText = () => {
        contextData?.onCopyPlainText?.();
        setIsContextMenuOpen(false);
    };

    return (
        <MenuItem onClick={handleCopyPlainText}>
            <ClipboardCopy className="w-4 h-4 mr-2" />
            Copy as plain text
        </MenuItem>
    );
}
