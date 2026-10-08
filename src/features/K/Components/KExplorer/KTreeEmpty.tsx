import { TagIcon } from "lucide-react";

export function KTreeEmpty() {
    return (
        <div className="flex flex-col items-center justify-center p-10 text-center mt-16">
            <TagIcon className="w-8 h-8 text-muted-foreground/50 mb-3" strokeWidth={1.5} />
            <h3 className="text-[15px] font-medium text-foreground mb-1">No Folders Found</h3>
            <p className="text-[13px] text-muted-foreground">Create your first folder to organize your content</p>
        </div>
    );
}
 