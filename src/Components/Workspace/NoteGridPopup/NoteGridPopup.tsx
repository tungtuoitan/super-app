/**
 * NoteGridPopup - Dialog for adding existing notes to workspace folder
 * Reuses NoteGrid component completely with GridControlBar
 */

import React, { useEffect, useMemo } from "react";
import { Loader2, FileText } from "lucide-react";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/Components/ui/dialog";
import { Button } from "@/Components/ui/button";
import { useNoteGridPopupStore } from "@/store/workspace/NoteGridPopup.store";
import { useNoteGridPopupHelper } from "@/hooks/workspace/useNoteGridPopup.helper";
import { useNoteGridStore } from "@/store/note/useNoteGrid.store";
import { useWorkspaceStore } from "@/store/workspace/Workspace.store";
import { useKeyboardShortcut } from "@/shared/hooks";
import { NoteGrid } from "@/Components/Note/NoteGrid";
import { GridControlBar } from "@/Components/shared/GridControlBar";
import { isNote } from "@/types/workspace-v2.types";
import {useGridControlStore} from "@/store/grid/useGridControl.store";
import {constants} from "@/utils/constants";

export function NoteGridPopup() {
    const {
        isNoteGridPopupOpen,
        targetFolder,
        isSubmitting,
    } = useNoteGridPopupStore();
        const { setModuleName, setFilterViewKey, setSearchQuery } = useGridControlStore();
    

    const {
        closeNoteGridPopup,
        addNotesToFolder,
    } = useNoteGridPopupHelper();

    const { notes, noteGridRowSelection } = useNoteGridStore();
    const { currentWorkspace } = useWorkspaceStore();

    // Count selected notes
    const selectedCount = useMemo(() => {
        return Object.keys(noteGridRowSelection).filter(key => noteGridRowSelection[key]).length;
    }, [noteGridRowSelection]);

    // useEffect(() => {
    //     setFilterViewKey(constants.filters.views.noteGrid)
    // }, [])

    // Get existing note IDs in workspace (for info display)
    const existingNoteIds = useMemo(() => {
        if (!currentWorkspace?.flatData) return new Set<number>();
        
        const noteIds = currentWorkspace.flatData
            .filter(item => isNote(item))
            .map(item => item.entityId);
        
        return new Set(noteIds);
    }, [currentWorkspace]);

    // Count available notes (not in workspace and not deleted)
    const availableNotesCount = useMemo(() => {
        return notes.filter(note => 
            !existingNoteIds.has(note.id) && !note.deletedAt
        ).length;
    }, [notes, existingNoteIds]);

    // Get disabled row IDs (already in workspace or deleted)
    const disabledRowIds = useMemo(() => {
        const disabled = new Set<number>();
        notes.forEach(note => {
            if (existingNoteIds.has(note.id) || note.deletedAt) {
                disabled.add(note.id);
            }
        });
        return disabled;
    }, [notes, existingNoteIds]);

    // Keyboard Shortcuts
    useKeyboardShortcut({
        key: "Enter",
        enabled: isNoteGridPopupOpen && !isSubmitting && selectedCount > 0,
        callback: addNotesToFolder,
    });

    useKeyboardShortcut({
        key: "Escape",
        enabled: isNoteGridPopupOpen && !isSubmitting,
        callback: closeNoteGridPopup,
    });

    // Handle dialog close
    const handleClose = () => {
        if (!isSubmitting) {
            closeNoteGridPopup();
        }
    };

    const folderName = targetFolder?.name || "workspace root";

    return (
        <Dialog open={isNoteGridPopupOpen} onOpenChange={(newOpen) => !newOpen && handleClose()}>
            <DialogContent className="sm:max-w-[1000px] sm:max-w-[1000px] h-[70vh] rounded-xl flex flex-col p-0_ border-gray-600">
                <DialogHeader className="mx-6 pt-6 pb-4 border-b">
                    <div className="flex items-center justify-between">
                        <DialogTitle className="text-xl font-semibold flex items-center gap-2 ">
                            <FileText className="w-5 h-5" />
                            Add Existing Notes to "{folderName}"
                        </DialogTitle>
                        <GridControlBar />
                    </div>
                </DialogHeader>

                {/* Reuse NoteGrid component - with visible pagination */}
                <div className="flex-1 overflow-hidden px-6 flex flex-col">
                    <NoteGrid disabledRowIds={disabledRowIds} />
                </div>

                <DialogFooter className="mx-6 py-4 gap-2 flex-row items-center">
                    <div className="flex-1 text-sm text-muted-foreground">
                        {selectedCount > 0 
                            ? `${selectedCount} note(s) selected`
                            : `${availableNotesCount} available notes (${notes.length - availableNotesCount} already in workspace or deleted)`
                        }
                    </div>
                    <Button variant="outline" onClick={handleClose} disabled={isSubmitting}>
                        Cancel
                    </Button>
                    <Button
                        onClick={addNotesToFolder}
                        disabled={isSubmitting || selectedCount === 0}
                    >
                        {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        {isSubmitting
                            ? "Adding..."
                            : `Add to ${folderName}`}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
