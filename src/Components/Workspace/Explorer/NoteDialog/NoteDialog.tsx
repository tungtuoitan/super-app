/**
 * NoteDialog - Dialog for creating new notes in workspace
 * Similar pattern to FolderDialog but simpler (no color picker, no complex validation)
 */

import React, { useState, useEffect } from "react";
import { Loader2 } from "lucide-react";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/Components/ui/dialog";
import { Button } from "@/Components/ui/button";
import { Input } from "@/Components/ui/input";
import { Label } from "@/Components/ui/label";
import { Textarea } from "@/Components/ui/textarea";
import { useKeyboardShortcut } from "@/shared/hooks";
import { parseApiError } from "@/utils/api-error.utils";

interface NoteDialogProps {
    isOpen: boolean;
    parentFolderName?: string;
    onClose: () => void;
    onSubmit: (noteName: string, description: string) => Promise<void>;
}

export function NoteDialog({ isOpen, parentFolderName, onClose, onSubmit }: NoteDialogProps) {
    const [noteName, setNoteName] = useState("");
    const [description, setDescription] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState("");

    // Reset form when dialog opens
    useEffect(() => {
        if (isOpen) {
            setNoteName("");
            setDescription("");
            setError("");
            setIsSubmitting(false);
        }
    }, [isOpen]);

    const handleClose = () => {
        if (!isSubmitting) {
            onClose();
        }
    };

    const handleSubmit = async () => {
        // Validation
        if (!noteName.trim()) {
            setError("Note name is required");
            return;
        }

        setIsSubmitting(true);
        setError("");

        try {
            await onSubmit(noteName.trim(), description.trim());
            handleClose();
        } catch (err) {
            const errorMessage = await parseApiError(err);
            setError(errorMessage);
        } finally {
            setIsSubmitting(false);
        }
    };

    // Keyboard Shortcuts
    useKeyboardShortcut({
        key: "Enter",
        enabled: isOpen && !isSubmitting && !!noteName.trim(),
        callback: handleSubmit,
    });

    useKeyboardShortcut({
        key: "Escape",
        enabled: isOpen && !isSubmitting,
        callback: handleClose,
    });

    return (
        <Dialog open={isOpen} onOpenChange={(newOpen) => !newOpen && handleClose()}>
            <DialogContent className="sm:max-w-[550px] rounded-xl">
                <DialogHeader>
                    <DialogTitle className="text-xl font-semibold">{parentFolderName ? `Create Note in "${parentFolderName}"` : "Create New Note"}</DialogTitle>
                </DialogHeader>

                <div className="space-y-6">
                    <div className="space-y-2">
                        <Label htmlFor="note-name">Note Name *</Label>
                        <Input
                            id="note-name"
                            value={noteName}
                            onChange={(e) => setNoteName(e.target.value)}
                            placeholder="Enter note name"
                            autoFocus
                            className={error ? "border-destructive" : ""}
                        />
                        {error && <p className="text-sm text-destructive">{error}</p>}
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="note-description">Description</Label>
                        <Textarea id="note-description" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Optional description" rows={4} />
                    </div>
                </div>

                <DialogFooter className="gap-2">
                    <Button variant="outline" onClick={handleClose} disabled={isSubmitting}>
                        Cancel
                    </Button>
                    <Button onClick={handleSubmit} disabled={isSubmitting || !noteName.trim()}>
                        {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        {isSubmitting ? "Creating..." : "Create Note"}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
