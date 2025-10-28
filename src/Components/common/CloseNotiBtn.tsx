import React from 'react';
import { X } from 'lucide-react';
import { SnackbarKey } from 'notistack';

export interface CloseNotiBtnProps {
    /** Snackbar key from notistack */
    snackbarKey: SnackbarKey;
    /** Close snackbar function */
    closeSnackbar: (key: SnackbarKey) => void;
}

/**
 * Custom close button for notistack snackbars
 *
 * @example
 * ```tsx
 * <SnackbarProvider
 *   action={(key) => (
 *     <CloseNotiBtn snackbarKey={key} closeSnackbar={closeSnackbar} />
 *   )}
 * >
 * ```
 */
export function CloseNotiBtn({ snackbarKey, closeSnackbar }: CloseNotiBtnProps) {
    return (
        <button
            className="p-1 rounded hover:bg-white/10 inline-flex items-center justify-center"
            aria-label="close"
            onClick={() => closeSnackbar(snackbarKey)}
        >
            <X className="w-4 h-4" />
        </button>
    );
}

export default CloseNotiBtn;