/**
 * PrivacyToggle — small button that switches the app-wide privacy mode. Drop it in any toolbar/header.
 */

import { Eye, EyeOff } from "lucide-react";
import { privacyConstants } from "./privacy.constants";
import { usePrivacyActions, usePrivacyIsHidden } from "./usePrivacy.selector";

export function PrivacyToggle() {
    const isHidden = usePrivacyIsHidden();
    const { toggled } = usePrivacyActions();

    return (
        <button
            onClick={toggled}
            title={privacyConstants.shortcut}
            className="flex h-6 items-center gap-1 rounded-md px-2 text-[12px] text-muted-foreground transition-colors duration-100 hover:bg-sa-hover hover:text-foreground"
        >
            {isHidden ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
            {isHidden ? privacyConstants.labels.show : privacyConstants.labels.hide}
        </button>
    );
}
