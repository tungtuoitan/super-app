import {TagIcon} from "lucide-react";



export function WorkspaceTreeEmpty() {
    return (
        <div className="flex flex-col items-center justify-center p-12 text-center mt-20">
            <TagIcon className="w-12 h-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold text-muted-foreground mb-2">
                No Folders Found
            </h3>
            <p className="text-sm text-muted-foreground">
                Create your first folder to organize your content
            </p>
        </div>
    );
}