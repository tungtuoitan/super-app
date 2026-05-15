/**
 * Module-level registry for the active markdown editor's save/cancel handlers.
 * KMarkdownEditorTab registers here on mount; useKSaveActions reads here on save.
 */

let _save: (() => Promise<void>) | null = null;
let _cancel: (() => void) | null = null;

export const kMarkdownActions = {
    register: (save: () => Promise<void>, cancel: () => void) => {
        _save = save;
        _cancel = cancel;
    },
    unregister: () => {
        _save = null;
        _cancel = null;
    },
    getSave:   () => _save,
    getCancel: () => _cancel,
    isActive:  () => _save !== null,
};
