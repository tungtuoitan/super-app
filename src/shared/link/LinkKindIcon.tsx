import { Github, HardDrive, Link2 } from "lucide-react";
import { linkConstants } from "./link.constants";
import { _getLinkKind } from "./link.utils";

/** Icon by link host: GitHub, Google Drive/Docs, any other web page. */
export function LinkKindIcon({ url, className }: { url?: string | null; className?: string }) {
    const kind = _getLinkKind(url);
    if (kind === linkConstants.kinds.github) return <Github className={className} />;
    if (kind === linkConstants.kinds.drive) return <HardDrive className={className} />;
    return <Link2 className={className} />;
}
