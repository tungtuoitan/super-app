import { isSignedIn } from "./lib/auth";
import { showToastInTab } from "./lib/toast";
import { dataUrlToBlob, uploadImage } from "./lib/upload";

// TODO RESTORE: set to true to require sign-in again.
const REQUIRE_SIGN_IN = false;

interface CapturedImageMessage {
    type: "CAPTURED_IMAGE";
    bytes: ArrayBuffer;
    mime: string;
    filename: string;
}

interface CaptureFailedMessage {
    type: "CAPTURE_FAILED";
    error: string;
}

interface CaptureCancelledMessage {
    type: "CAPTURE_CANCELLED";
}

type IncomingMessage = CapturedImageMessage | CaptureFailedMessage | CaptureCancelledMessage;

async function getActiveTabId(): Promise<number | undefined> {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    return tab?.id;
}

async function ensureSignedInOrToast(tabId: number | undefined): Promise<boolean> {
    if (!REQUIRE_SIGN_IN) return true;
    if (await isSignedIn()) return true;
    if (tabId !== undefined) {
        await showToastInTab(tabId, "Please sign in via the extension popup", "error");
    }
    return false;
}

async function handleUpload(blob: Blob, filename: string, tabId: number | undefined): Promise<void> {
    if (!(await ensureSignedInOrToast(tabId))) return;
    try {
        const result = await uploadImage(blob, filename);
        if (!result.success) throw new Error(result.message || "Upload returned success=false");
        if (tabId !== undefined) {
            await showToastInTab(tabId, `Uploaded ✓ ${result.data?.fileName ?? filename}`, "success");
        }
    } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        if (tabId !== undefined) await showToastInTab(tabId, `Upload failed: ${msg}`, "error");
    }
}

chrome.commands.onCommand.addListener(async (command) => {
    const tabId = await getActiveTabId();

    if (command === "capture-page") {
        if (!(await ensureSignedInOrToast(tabId))) return;
        try {
            const dataUrl = await chrome.tabs.captureVisibleTab({ format: "png" });
            const blob = dataUrlToBlob(dataUrl);
            await handleUpload(blob, `page-${Date.now()}.png`, tabId);
        } catch (err) {
            const msg = err instanceof Error ? err.message : String(err);
            if (tabId !== undefined) await showToastInTab(tabId, `Capture failed: ${msg}`, "error");
        }
        return;
    }

    if (command === "capture-image") {
        if (!(await ensureSignedInOrToast(tabId))) return;
        if (tabId === undefined) return;
        try {
            await chrome.tabs.sendMessage(tabId, { type: "ENTER_PICK_MODE" });
            await showToastInTab(tabId, "Click an image to capture (Esc to cancel)", "success");
        } catch (err) {
            const msg = err instanceof Error ? err.message : String(err);
            await showToastInTab(tabId, `Cannot enter pick mode: ${msg}`, "error");
        }
    }
});

chrome.runtime.onMessage.addListener((msg: IncomingMessage, sender) => {
    const tabId = sender.tab?.id;

    if (msg?.type === "CAPTURED_IMAGE") {
        const blob = new Blob([msg.bytes], { type: msg.mime });
        void handleUpload(blob, msg.filename, tabId);
        return;
    }

    if (msg?.type === "CAPTURE_FAILED" && tabId !== undefined) {
        void showToastInTab(tabId, `Capture failed: ${msg.error}`, "error");
    }
});
