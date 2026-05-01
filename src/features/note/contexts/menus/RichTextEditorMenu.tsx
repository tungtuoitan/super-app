import { MenuItem } from "@szhsin/react-menu";
import { ClipboardCopy } from "lucide-react";
import { useMenuContext, useMenuContextHelper } from "@/shared";

export function RichTextEditorMenu() {
    const { contextData } = useMenuContext();
    const { setIsMenuContextOpen } = useMenuContextHelper();

    const handleCopyPlainText = () => {
        contextData?.onCopyPlainText?.();
        setIsMenuContextOpen(false);
    };

    return (
        <MenuItem onClick={handleCopyPlainText}>
            <ClipboardCopy className="w-4 h-4 mr-2" />
            Copy as plain text
        </MenuItem>
    );
}
