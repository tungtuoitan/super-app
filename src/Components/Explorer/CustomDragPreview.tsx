
import {
    ChevronDown,
    ChevronRight,
    Tag as TagIcon,
    FolderOpen,
    Folder as FolderIcon,
} from 'lucide-react';
import {getAllFoldersFlattened, TreeFolder} from '@/hooks/explorer/tree.helper';


/**
 * Custom Drag Preview Component (VS Code style)
 * Shows folder name when dragging 1 item, shows count when dragging multiple items
 */
export function CustomDragPreview({ offset, mouse, id, dragIds, isDragging, treeData }: {
    offset: { x: number; y: number } | null;
    mouse: { x: number; y: number } | null;
    id: string | null;
    dragIds: string[];
    isDragging: boolean;
    treeData: TreeFolder[];
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
            const allFolders = getAllFoldersFlattened(treeData);
            const folder = allFolders.find((t: TreeFolder) => t.id === id);
            return folder?.name || 'Moving...';
        }
        
        return 'Moving...';
    };

    const displayText = getDisplayText();

    return (
        <div className="fixed pointer-events-none z-[10000] left-0 top-0 w-full h-full">
            {/* Preview */}
            <div
                style={{
                    transform: `translate(${offset.x}px, ${offset.y}px)`,
                }}
                className={`
                    absolute bg-editor-bg/95 border border-editor-border rounded-md p-2 px-3
                    ${itemCount > 1 ? 'min-w-[60px]' : 'min-w-[200px]'}
                    max-w-[300px] shadow-lg
                `}
            >
                <div className={`flex items-center gap-2 ${itemCount > 1 ? 'justify-center' : 'justify-start'}`}>
                    {/* Icon */}
                    <TagIcon className="w-4 h-4 text-primary" />

                    {/* Text: Show folder name for single item, count for multiple */}
                    <span
                        className={`
                            text-editor-fg truncate
                            ${itemCount > 1 ? 'font-bold text-base' : 'font-medium text-sm'}
                        `}
                    >
                        {displayText}
                    </span>
                </div>
            </div>
        </div>
    );
}
