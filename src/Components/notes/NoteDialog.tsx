/**
 * Note Dialog Component
 * Simple dialog to display note details when clicked from the grid
 * Migrated to ClickUp theme with shadcn/ui components
 */

import React from 'react';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/Components/ui/dialog';
import { Button } from '@/Components/ui/button';
import { Badge } from '@/Components/ui/badge';
import type { Tag } from '@/features/tags/types/tag.types';
import {useNoteUI} from './NoteUIContext';

/**
 * NoteDialog component for displaying note details
 * Uses the NoteUI context to manage dialog state
 */
export function NoteDialog() {
    const { selectedNote, isDialogOpen, closeDialog } = useNoteUI();

    if (!selectedNote) {
        return null;
    }

    return (
        <Dialog open={isDialogOpen} onOpenChange={(open) => !open && closeDialog()}>
            xxxxxxxxxx
            <DialogContent className="max-w-2xl">
                <DialogHeader>
                    <DialogTitle className="text-2xl">{selectedNote.name}</DialogTitle>
                    <div className="flex gap-2 mt-2">
                        {selectedNote.type && (
                            <Badge variant="outline" className="border-primary text-primary">
                                {selectedNote.type}
                            </Badge>
                        )}
                        <Badge
                            variant={selectedNote.isArchived ? 'secondary' : 'default'}
                            className={selectedNote.isArchived ? '' : 'bg-primary'}
                        >
                            {selectedNote.isArchived ? 'Archived' : 'Active'}
                        </Badge>
                    </div>
                </DialogHeader>

                <div className="space-y-4 py-4">
                    {selectedNote.description && (
                        <div className="space-y-2">
                            <h3 className="text-sm font-semibold text-foreground">Description</h3>
                            <p className="text-sm text-muted-foreground leading-relaxed">
                                {selectedNote.description}
                            </p>
                        </div>
                    )}

                    <div className="space-y-2 text-sm">
                        <div className="flex items-center gap-2">
                            <span className="font-semibold text-foreground">Created:</span>
                            <span className="text-muted-foreground">
                                {selectedNote.createdAt.toLocaleString()}
                            </span>
                        </div>
                        <div className="flex items-center gap-2">
                            <span className="font-semibold text-foreground">Updated:</span>
                            <span className="text-muted-foreground">
                                {selectedNote.updatedAt?.toLocaleString() || 'N/A'}
                            </span>
                        </div>
                        <div className="flex items-center gap-2">
                            <span className="font-semibold text-foreground">Created by:</span>
                            <span className="text-muted-foreground">{selectedNote.createdBy}</span>
                        </div>
                        {selectedNote.tags && selectedNote.tags.length > 0 && (
                            <div className="space-y-1.5">
                                <span className="font-semibold text-foreground">Tags:</span>
                                <div className="flex gap-1.5 flex-wrap">
                                    {Array.isArray(selectedNote.tags)
                                        ? selectedNote.tags.map((tag: Tag, index: number) => (
                                              <Badge
                                                  key={tag.id || tag.tagId || index}
                                                  variant="outline"
                                                  className="border-primary/40 text-primary"
                                              >
                                                  {tag.name}
                                              </Badge>
                                          ))
                                        : null}
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={closeDialog}>
                        Close
                    </Button>
                    <Button onClick={closeDialog} className="bg-primary hover:bg-primary/90">
                        Edit Note
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}