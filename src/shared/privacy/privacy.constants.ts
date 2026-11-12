export const privacyConstants = {
    /** Set on <html> by usePrivacyDom.headless: "hidden" | "visible". index.css reads these exact names/values. */
    rootAttribute: "data-privacy",
    rootValues: { hidden: "hidden", visible: "visible" },
    /** Spread onto the element whose text must shrink while hidden: <div {...privacyConstants.zoneProps}>. index.css reads `data-private`. */
    zoneProps: { "data-private": "" },
    /** Panic key: hide or show every privacy zone at once, from anywhere in the app */
    shortcut: "ctrl+alt+h",
    shortcutId: "privacy-toggle",
    labels: { show: "Show text", hide: "Hide text" },
    /** Revealed text goes back to small after this long, so it is never left readable by accident */
    autoHideMs: 5 * 60 * 1000,
} as const;
