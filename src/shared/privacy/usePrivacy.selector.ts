import { usePrivacyStore } from "./usePrivacy.store";

export const usePrivacyIsHidden = () => usePrivacyStore((state) => state.isHidden);
export const usePrivacyActions = () => usePrivacyStore((state) => state.actions);
