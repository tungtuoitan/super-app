import { Layers, Folder, FileText, Link, Hash, Cuboid, SquareCheckBig, ScrollText } from "lucide-react";
import type { KeywordType } from "@/shared";
import { keywordNavigatorRegistry } from "./keywordNavigator.registry";

interface KeywordIconRendererProps {
    type: KeywordType | string;
    icon?: string;
    color?: string;
    className?: string;
}

const STATIC_ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
    workspace: Layers,
    folder: Folder,
    note: FileText,
    file: FileText,
    project: Cuboid,
    task: SquareCheckBig,
    external: Link,
};

export function KeywordIconRenderer({ type, icon, color, className = "w-4 h-4 flex-shrink-0" }: KeywordIconRendererProps) {
    const registered = keywordNavigatorRegistry.renderIcon(type, icon, color, className);
    if (registered !== null) return <>{registered}</>;

    if (type === "log" && !icon && !color) return <ScrollText className={className} />;

    const IconComponent = STATIC_ICON_MAP[type] ?? Hash;
    return <IconComponent className={className} />;
}
