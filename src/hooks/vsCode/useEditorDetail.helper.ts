/**
 * Editor Actions Helper
 * Handles save/create/cancel actions for note editor
 */

import { useSnackbar } from 'notistack';
import { useNoteDetailHelper } from '../note/useNoteDetail.helper';
import { useNoteDetailStore } from '@/store/note/useNoteDetail.store';

export const useEditorDetailHelper = () => {
    const { resetChanges } = useNoteDetailHelper();
    const { enqueueSnackbar } = useSnackbar(); 

    /**
     * Cancel/discard changes
     */
    const cancelChanges = () => {
        resetChanges();
        enqueueSnackbar('Changes discarded', { variant: 'info' });
    }

    return {
        cancelChanges,
    };
};
