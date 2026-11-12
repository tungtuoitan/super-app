/**
 * Hides the text again a few minutes after it was revealed (privacyConstants.autoHideMs), so it is never
 * left readable by accident. Showing it again starts a fresh countdown. Mounted once by PrivacyShortcut.
 */

import { useEffect } from "react";
import { privacyConstants } from "./privacy.constants";
import { usePrivacyActions, usePrivacyIsHidden } from "./usePrivacy.selector";

export const usePrivacyAutoHideHeadless = () => {
    const isHidden = usePrivacyIsHidden();
    const { concealed } = usePrivacyActions();

    useEffect(() => {
        if (isHidden) return;
        const timer = setTimeout(concealed, privacyConstants.autoHideMs);
        return () => clearTimeout(timer);
    }, [isHidden, concealed]);
};
