/**
 * Mirrors the privacy state to <html data-privacy="..."> so hiding the text is pure CSS (index.css).
 * Mount once for the whole app (PrivacyShortcut does).
 */

import { useEffect } from "react";
import { privacyConstants } from "./privacy.constants";
import { usePrivacyIsHidden } from "./usePrivacy.selector";

export const usePrivacyDomHeadless = () => {
    const isHidden = usePrivacyIsHidden();

    useEffect(() => {
        const { hidden, visible } = privacyConstants.rootValues;
        document.documentElement.setAttribute(privacyConstants.rootAttribute, isHidden ? hidden : visible);
    }, [isHidden]);
};
