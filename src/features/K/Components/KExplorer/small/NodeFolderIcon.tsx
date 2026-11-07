import { ICON_MAP, IconKey } from "@/shared";

interface NodeFolderIconProps {
    nodeIcon: IconKey;
    hasDeletedAncestor: boolean;
    isDirectlyDeleted: boolean;
    nodeColor?: string | null;
}

export function NodeFolderIcon({ nodeIcon, hasDeletedAncestor, isDirectlyDeleted, nodeColor }: NodeFolderIconProps) {
    const CustomIcon = ICON_MAP[nodeIcon];
    if (!CustomIcon) return null;
    const isDeleted = hasDeletedAncestor || isDirectlyDeleted;
    return (
        <CustomIcon
            className="w-4 h-4"
            style={{ color: isDeleted ? "hsl(var(--muted-foreground))" : (nodeColor || "#90A4AE") }}
            strokeWidth={2}
        />
    );
}
