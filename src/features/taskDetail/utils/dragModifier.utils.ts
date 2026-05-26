/**
 * Drag Modifier State
 * Tracks Shift key while a DnD drag is in progress.
 * react-dnd's monitor does not expose modifier keys, so we track at module scope.
 */

let isShiftHeld = false;
let listenersAttached = false;

function onKeyDown(e: KeyboardEvent) {
    if (e.key === "Shift") isShiftHeld = true;
}

function onKeyUp(e: KeyboardEvent) {
    if (e.key === "Shift") isShiftHeld = false;
}

function onBlur() {
    isShiftHeld = false;
}

export function ensureDragModifierListeners(): void {
    if (listenersAttached || typeof window === "undefined") return;
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    window.addEventListener("blur", onBlur);
    listenersAttached = true;
}

export function getIsShiftHeld(): boolean {
    return isShiftHeld;
}
