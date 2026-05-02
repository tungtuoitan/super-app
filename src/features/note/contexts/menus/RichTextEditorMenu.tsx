import { MenuItem } from "@szhsin/react-menu";
import { ClipboardCopy } from "lucide-react";
import { useOrchestratorContextMenuStore } from "@/shared";
import type { RichTextEditorMenuData } from "@/shared";

export function RichTextEditorMenu() {
    const { contextData, setIsContextMenuOpen } = useOrchestratorContextMenuStore();
    const data = contextData as RichTextEditorMenuData | null;

    const handleCopyPlainText = () => {
        data?.onCopyPlainText?.();
        setIsContextMenuOpen(false);
    };

    return (
        <MenuItem onClick={handleCopyPlainText}>
            <ClipboardCopy className="w-4 h-4 mr-2" />
            Copy as plain text
        </MenuItem>
    );
}
