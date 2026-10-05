/**
 * LinkDialog — global add/edit link dialog (task #1477), mounted once in Main.tsx.
 * Opened through useLinkDialogHelper().openLinkDialog({...}).
 */
import { Loader2 } from "lucide-react";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "../components/ui/dialog";
import { Button } from "../components/ui/Button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { useLinkDialogStore } from "./linkDialog.store";
import { useLinkDialogHelper } from "./useLinkDialog.helper";
import { LinkKindIcon } from "./LinkKindIcon";
import { _normalizeUrl } from "./link.utils";

export function LinkDialog() {
    const { isOpen, options, name, setName, url, setUrl, errors, isSubmitting } = useLinkDialogStore();
    const { closeLinkDialog, submitLinkDialog } = useLinkDialogHelper();
    const showUrl = options?.showUrl !== false;

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === "Enter") {
            e.preventDefault();
            submitLinkDialog();
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && !isSubmitting && closeLinkDialog()}>
            <DialogContent className="sm:max-w-[500px] rounded-xl" onKeyDown={handleKeyDown}>
                <DialogHeader>
                    <DialogTitle className="text-lg font-semibold">{options?.title ?? "Link"}</DialogTitle>
                </DialogHeader>

                <div className="space-y-4">
                    {showUrl && (
                        <div className="space-y-1.5">
                            <Label htmlFor="link-dialog-url">URL</Label>
                            <div className="flex items-center gap-2">
                                <LinkKindIcon url={_normalizeUrl(url)} className="h-4 w-4 shrink-0 text-muted-foreground" />
                                <Input
                                    id="link-dialog-url"
                                    autoFocus
                                    placeholder="https://github.com/…  ·  https://drive.google.com/…"
                                    value={url}
                                    onChange={(e) => setUrl(e.target.value)}
                                    disabled={isSubmitting}
                                />
                            </div>
                            {errors.url && <p className="text-xs text-destructive">{errors.url}</p>}
                        </div>
                    )}

                    <div className="space-y-1.5">
                        <Label htmlFor="link-dialog-name">Name{showUrl && <span className="text-muted-foreground font-normal"> (optional)</span>}</Label>
                        <Input
                            id="link-dialog-name"
                            autoFocus={!showUrl}
                            placeholder={showUrl ? "Defaults to the URL's host and path" : ""}
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            disabled={isSubmitting}
                        />
                        {errors.name && <p className="text-xs text-destructive">{errors.name}</p>}
                    </div>
                </div>

                <DialogFooter className="gap-2">
                    <Button variant="outline" onClick={closeLinkDialog} disabled={isSubmitting}>
                        Cancel
                    </Button>
                    <Button onClick={submitLinkDialog} disabled={isSubmitting}>
                        {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        {options?.submitLabel ?? "Save"}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
