import { isSignedIn } from "./lib/auth";
import { showToastInTab } from "./lib/toast";
import { dataUrlToBlob, uploadImage } from "./lib/upload";
import { REVIEW_TOKEN_KEY } from "./review/reviewApi";

const BASE = "https://www.tungle.uk";
const KNOWLEDGE_ID = 1;

function getJwtExpiryMs(token: string): number | null {
    try {
        const payload = JSON.parse(atob(token.split(".")[1]));
        return typeof payload.exp === "number" ? payload.exp * 1000 : null;
    } catch {
        return null;
    }
}

async function refreshReviewToken(): Promise<string | null> {
    try {
        console.log("[SA-Review-BG] refreshing token via browser session...");
        const res = await fetch(`${BASE}/api/auth/refresh`, {
            method: "POST",
            credentials: "include",
        });
        if (!res.ok) { console.warn("[SA-Review-BG] refresh failed:", res.status); return null; }
        const data = await res.json();
        const token: string | null = data.user?.token ?? null;
        if (token) {
            await chrome.storage.local.set({ [REVIEW_TOKEN_KEY]: token });
            console.log("[SA-Review-BG] token refreshed, expires:", new Date(getJwtExpiryMs(token) ?? 0).toISOString());
        }
        return token;
    } catch (e) {
        console.error("[SA-Review-BG] refresh error:", e);
        return null;
    }
}

async function getValidReviewToken(): Promise<string | null> {
    const r = await chrome.storage.local.get(REVIEW_TOKEN_KEY);
    const token = (r[REVIEW_TOKEN_KEY] as string) ?? null;
    if (!token) return null;
    const expiryMs = getJwtExpiryMs(token);
    // Refresh if token expires within 2 minutes
    if (!expiryMs || expiryMs - Date.now() < 120_000) {
        console.log("[SA-Review-BG] token expiring soon (or no expiry), auto-refreshing...");
        return refreshReviewToken();
    }
    return token;
}

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

// Handle K Review fetch/submit — runs in service worker to avoid CORS
chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
    if (msg?.type === "SA_REVIEW_FETCH") {
        getValidReviewToken().then(token => {
            console.log("[SA-Review-BG] FETCH token present:", !!token, token ? token.slice(0, 20) + "..." : "none");
            if (!token) { sendResponse([]); return; }
            const url = `${BASE}/api/k/${KNOWLEDGE_ID}/knowledge-review-all-session`;
            console.log("[SA-Review-BG] fetching:", url);
            fetch(url, { headers: { Authorization: `Bearer ${token}` } })
                .then(r => {
                    console.log("[SA-Review-BG] response status:", r.status);
                    return r.ok ? r.json() : [];
                })
                .then(json => {
                    console.log("[SA-Review-BG] raw json:", json);
                    const list = Array.isArray(json) ? json : (json.object ?? json.data ?? []);
                    console.log("[SA-Review-BG] sending", list.length, "questions");
                    sendResponse(list);
                })
                .catch(e => { console.error("[SA-Review-BG] fetch error:", e); sendResponse([]); });
        });
        return true; // keep channel open for async response
    }

    if (msg?.type === "SA_REVIEW_SUBMIT") {
        getValidReviewToken().then(token => {
            console.log("[SA-Review-BG] SUBMIT token present:", !!token, "questionId:", msg.questionId, "score:", msg.selfScore);
            if (!token) { sendResponse({}); return; }
            fetch(`${BASE}/api/k/${KNOWLEDGE_ID}/daily-submit`, {
                method: "POST",
                headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
                body: JSON.stringify({
                    answers: [{
                        questionId: msg.questionId,
                        answerText: null,
                        responseTimeMs: msg.responseTimeMs,
                        selfScore: msg.selfScore,
                    }],
                }),
            })
                .then(r => r.json().then(j => { console.log("[SA-Review-BG] SUBMIT response:", r.status, j); sendResponse({}); }))
                .catch(e => { console.error("[SA-Review-BG] SUBMIT error:", e); sendResponse({}); });
        });
        return true;
    }

    if (msg?.type === "SA_REVIEW_MARK_DRAFT") {
        getValidReviewToken().then(token => {
            if (!token) { sendResponse({}); return; }
            fetch(`${BASE}/api/k/${KNOWLEDGE_ID}/questions/${msg.questionId}/mark-draft`, {
                method: "PATCH",
                headers: { Authorization: `Bearer ${token}` },
            })
                .then(r => { console.log("[SA-Review-BG] MARK_DRAFT response:", r.status); sendResponse({}); })
                .catch(e => { console.error("[SA-Review-BG] MARK_DRAFT error:", e); sendResponse({}); });
        });
        return true;
    }
});

