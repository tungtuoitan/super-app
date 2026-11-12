/**
 * Privacy store — ONE app-wide switch. While hidden, every element marked as a privacy zone
 * (privacyConstants.zoneProps) shows its text too small for anyone nearby to read.
 * Starts hidden on every load and is never persisted, so a fresh start is always safe; revealed text
 * hides again by itself (usePrivacyAutoHide.headless).
 * Components read it through usePrivacy.selector; the DOM mirror lives in usePrivacyDom.headless.
 */

import { create } from "zustand";

interface PrivacyActions {
    toggled: () => void;
    concealed: () => void;
}

interface PrivacyStoreData {
    isHidden: boolean;
    actions: PrivacyActions;
}

export const usePrivacyStore = create<PrivacyStoreData>((set) => ({
    isHidden: true,
    actions: {
        toggled: () => set((state) => ({ isHidden: !state.isHidden })),
        concealed: () => set({ isHidden: true }),
    },
}));
