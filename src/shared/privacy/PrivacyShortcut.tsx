/**
 * PrivacyShortcut — mounts the app-wide privacy plumbing once (render it a single time in Main):
 * the panic key and the <html> mirror that index.css reads.
 */

import { useGlobalShortcut } from "../shortcut/useGlobalShortcut";
import { privacyConstants } from "./privacy.constants";
import { usePrivacyActions } from "./usePrivacy.selector";
import { usePrivacyDomHeadless } from "./usePrivacyDom.headless";

export function PrivacyShortcut() {
    const { toggled } = usePrivacyActions();
    usePrivacyDomHeadless();
    useGlobalShortcut(privacyConstants.shortcut, { id: privacyConstants.shortcutId }, toggled);
    return null;
}
