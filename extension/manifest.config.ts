import { defineManifest } from "@crxjs/vite-plugin";
import pkg from "./package.json";

export default defineManifest({
    manifest_version: 3,
    name: "SuperApp Capture",
    version: pkg.version,
    description: "Capture page screenshots or images and upload to SuperApp.",
    permissions: ["identity", "activeTab", "scripting", "storage", "tabs", "notifications"],
    host_permissions: [
        "https://accounts.google.com/*",
        "http://localhost:*/*",
        "https://*/*",
    ],
    background: {
        service_worker: "src/background.ts",
        type: "module",
    },
    action: {
        default_popup: "src/popup/popup.html",
        default_title: "SuperApp Capture",
    },
    content_scripts: [
        {
            matches: ["<all_urls>"],
            js: ["src/content.ts"],
            run_at: "document_idle",
        },
        {
            matches: [
                "https://www.facebook.com/*",
                "https://facebook.com/*",
                "https://www.instagram.com/*",
                "https://instagram.com/*",
                "https://www.youtube.com/*",
                "https://youtube.com/*",
            ],
            js: ["src/review/review-content.ts"],
            run_at: "document_idle",
        },
    ],
    commands: {
        "capture-page": {
            suggested_key: { default: "Ctrl+Shift+S", windows: "Ctrl+Shift+S" },
            description: "Capture visible page area and upload to SuperApp",
        },
        "capture-image": {
            suggested_key: { default: "Ctrl+Shift+I", windows: "Ctrl+Shift+I" },
            description: "Pick an image to capture and upload",
        },
    },
});
