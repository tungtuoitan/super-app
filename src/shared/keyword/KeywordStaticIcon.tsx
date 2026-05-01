import { Layers, Folder, FileText, Link, Hash, Cuboid, SquareCheckBig, ScrollText } from "lucide-react";
import type { KeywordType } from "./keyword.types";

interface KeywordStaticIconProps {
    type: KeywordType | string;
    className?: string;
}

const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
    workspace: Layers,
    folder: Folder,
    note: FileText,
    file: FileText,
    project: Cuboid,
    task: SquareCheckBig,
    external: Link,
    log: ScrollText,
    track: ScrollText,
};

export function KeywordStaticIcon({ type, className = "w-4 h-4 flex-shrink-0" }: KeywordStaticIconProps) {
    const IconComponent = ICON_MAP[type] ?? Hash;
    return <IconComponent className={className} />;
}
