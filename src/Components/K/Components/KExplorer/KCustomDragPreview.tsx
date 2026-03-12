import { ChevronDown, ChevronRight, Tag as TagIcon, FolderOpen, Folder as FolderIcon } from "lucide-react";
import {KTreeNode, KtreeMiniHelper} from "../../hooks";

/**
 * Custom Drag Preview Component (VS Code style)
 * Shows folder name when dragging 1 item, shows count when dragging multiple items
 */
export function KCustomDragPreview({
    offset,
    mouse,
    id,
    dragIds,
    isDragging,
    treeData,
}: {
    offset: { x: number; y: number } | null;
    mouse: { x: number; y: number } | null;
    id: string | null;
    dragIds: string[];
    isDragging: boolean;
    treeData: KTreeNode[];
}) {
    if (!isDragging || !offset) return null;

    // Count of items being dragged
    const itemCount = dragIds?.length || 0;

    // Determine display text based on count
    const getDisplayText = (): string => {
        // Multiple items: show count only
        if (itemCount > 1) {
            return `${itemCount}`;
        }

        // Single item: show folder name
        if (itemCount === 1 && id) {
            const allFolders = KtreeMiniHelper.$traverse(treeData);
            const folder = allFolders.find((t: KTreeNode) => t.id === id);
            return folder?.name || "Moving...";
        }

        return "Moving...";
    };

    const displayText = getDisplayText();

    // Calculate preview width and position offset for centering
    const previewWidth = itemCount > 1 ? 60 : 200; // Approximate widths
    const centerOffset = previewWidth / 2;
    const rightOffset = 10; // Small offset to the right as requested

    // Use mouse position for accurate centering
    const mouseX = mouse?.x ?? offset?.x ?? 0;
    const mouseY = mouse?.y ?? offset?.y ?? 0;

    return (
        <div className="fixed pointer-events-none z-[10000] left-0 top-0 w-full h-full">
            {/* Preview - centered on mouse with small right offset */}
            <div
                style={{
                    transform: `translate(${mouseX - centerOffset + rightOffset}px, ${mouseY + 10}px)`,
                }}
                className={`
                    absolute bg-editor-bg/95 border border-editor-border rounded-md p-2 px-3 h-8
                    ${itemCount > 1 ? "min-w-[60px]" : "min-w-[200px]"}
                    max-w-[300px] shadow-lg
                `}
            >
                <div className={`flex items-center mt-[-4px] gap-2 ${itemCount > 1 ? "justify-center" : "justify-start"}`}>
                    {/* Icon */}
                    <TagIcon className="w-4 h-4 text-primary" />

                    {/* Text: Show folder name for single item, count for multiple */}
                    <span
                        className={`
                            text-editor-fg truncate
                            ${itemCount > 1 ? "font-bold text-base" : "font-medium text-sm"}
                        `}
                    >
                        {displayText}
                    </span>
                </div>
            </div>
        </div>
    );
}

