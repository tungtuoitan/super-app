/**
 * Confirm Close Tab Dialog
 * Shows confirmation when closing tab with unsaved changes
 */

import React from "react";
import { AlertTriangle } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/shared/components/ui/dialog";
import { Button } from "@/shared";

interface ConfirmCloseDialogProps {
    open: boolean;
    tabTitle: string;
    onConfirm: () => void;
    onCancel: () => void;
}

export function ConfirmCloseDialog({ open, tabTitle, onConfirm, onCancel }: ConfirmCloseDialogProps) {
    return (
        <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onCancel()}>
            <DialogContent className="bg-card text-foreground border sm:max-w-md">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <AlertTriangle className="w-5 h-5 text-yellow-500" />
                        <span>Unsaved Changes</span>
                    </DialogTitle>
                    <DialogDescription className="text-left">
                        <p className="text-base text-foreground">
                            Do you want to close <strong>"{tabTitle}"</strong> without saving changes?
                        </p>
                        <p className="mt-2 text-sm text-muted-foreground">Your changes will be lost if you don't save them.</p>
                    </DialogDescription>
                </DialogHeader>
                <DialogFooter className="gap-2">
                    <Button onClick={onCancel} variant="ghost">
                        Cancel
                    </Button>
                    <Button onClick={onConfirm} variant="destructive">
                        Close Without Saving
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
