/**
 * Editor Actions Helper
 * Handles save/create/cancel actions for note editor
 */

import { useSnackbar } from 'notistack';
import { useNoteDetailHelper } from '../note/useNoteDetail.helper';
import { useNoteDetailStore } from '@/store/note/useNoteDetail.store';
import {useEditorTabHelper} from './useEditorTab.helper';

export const useEditorDetailHelper = () => {
    const { noteHasChanges } = useNoteDetailStore();
    const { saveNote, resetChanges } = useNoteDetailHelper();
    const { markTabAsChanged } = useEditorTabHelper();
    const { enqueueSnackbar } = useSnackbar(); 

    /**
     * Cancel/discard changes
     */
    const cancelChanges = () => {
        resetChanges();
        enqueueSnackbar('Changes discarded', { variant: 'info' });
    }

    /**
     * Mark tab as changed based on hasUnsavedChanges state
     */
    const syncTabChangeState = (tabId: string) => {
        markTabAsChanged(tabId, noteHasChanges);
    }

    return {
        saveNote,
        cancelChanges,
        syncTabChangeState,
    };
};
