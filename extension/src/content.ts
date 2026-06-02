/**
 * Content script — image-pick mode.
 * Activated by a message from the background worker. The next image the user
 * clicks is captured and sent back as an ArrayBuffer for upload.
 */

interface PickModeMessage {
    type: "ENTER_PICK_MODE";
}

interface CapturedImageMessage {
    type: "CAPTURED_IMAGE";
    bytes: ArrayBuffer;
    mime: string;
    filename: string;
}

const STYLE_ID = "__superapp_pick_style__";
let pickActive = false;
let lastHovered: HTMLElement | null = null;

function injectPickStyle(): void {
    if (document.getElementById(STYLE_ID)) return;
    const style = document.createElement("style");
    style.id = STYLE_ID;
    style.textContent = `
        html.superapp-pick-mode, html.superapp-pick-mode * { cursor: crosshair !important; }
        .superapp-pick-target { outline: 2px solid #16a34a !important; outline-offset: 2px !important; }
    `;
    document.documentElement.appendChild(style);
}

function setPickMode(active: boolean): void {
    pickActive = active;
    if (active) {
        injectPickStyle();
        document.documentElement.classList.add("superapp-pick-mode");
    } else {
        document.documentElement.classList.remove("superapp-pick-mode");
        if (lastHovered) {
            lastHovered.classList.remove("superapp-pick-target");
            lastHovered = null;
        }
    }
}

function findImageAt(target: EventTarget | null): HTMLImageElement | null {
    if (!(target instanceof Element)) return null;
    if (target instanceof HTMLImageElement) return target;
    return target.closest("img") as HTMLImageElement | null;
}

async function imageElementToBlob(img: HTMLImageElement): Promise<{ blob: Blob; mime: string }> {
    const src = img.currentSrc || img.src;

    // Try direct fetch first — works for same-origin and CORS-enabled images.
    try {
        const r = await fetch(src, { credentials: "omit" });
        if (r.ok) {
            const blob = await r.blob();
            return { blob, mime: blob.type || "image/png" };
        }
    } catch {
        /* fall through to canvas fallback */
    }

    // Canvas fallback — only works if the image is not CORS-tainted.
    const canvas = document.createElement("canvas");
    canvas.width = img.naturalWidth || img.width;
    canvas.height = img.naturalHeight || img.height;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Cannot create canvas context");
    ctx.drawImage(img, 0, 0);
    const blob = await new Promise<Blob | null>((resolve) =>
        canvas.toBlob((b) => resolve(b), "image/png"),
    );
    if (!blob) throw new Error("CORS-restricted image cannot be captured");
    return { blob, mime: "image/png" };
}

function inferFilename(img: HTMLImageElement, mime: string): string {
    const ext = mime.split("/")[1]?.split(";")[0] || "png";
    const src = img.currentSrc || img.src;
    try {
        const last = new URL(src, location.href).pathname.split("/").pop() || "";
        if (last.includes(".")) return last;
    } catch {
        /* ignore */
    }
    return `image-${Date.now()}.${ext}`;
}

async function handlePickClick(e: MouseEvent): Promise<void> {
    if (!pickActive) return;
    const img = findImageAt(e.target);
    if (!img) return;

    e.preventDefault();
    e.stopPropagation();
    setPickMode(false);

    try {
        const { blob, mime } = await imageElementToBlob(img);
        const filename = inferFilename(img, mime);
        const bytes = await blob.arrayBuffer();
        const msg: CapturedImageMessage = { type: "CAPTURED_IMAGE", bytes, mime, filename };
        chrome.runtime.sendMessage(msg);
    } catch (err) {
        chrome.runtime.sendMessage({
            type: "CAPTURE_FAILED",
            error: err instanceof Error ? err.message : String(err),
        });
    }
}

function handlePickHover(e: MouseEvent): void {
    if (!pickActive) return;
    const img = findImageAt(e.target);
    if (lastHovered && lastHovered !== img) {
        lastHovered.classList.remove("superapp-pick-target");
        lastHovered = null;
    }
    if (img && img !== lastHovered) {
        img.classList.add("superapp-pick-target");
        lastHovered = img;
    }
}

function handlePickKey(e: KeyboardEvent): void {
    if (pickActive && e.key === "Escape") {
        setPickMode(false);
        chrome.runtime.sendMessage({ type: "CAPTURE_CANCELLED" });
    }
}

// Use capture phase so we run before the page's own click handlers.
document.addEventListener("click", handlePickClick, true);
document.addEventListener("mouseover", handlePickHover, true);
document.addEventListener("keydown", handlePickKey, true);

chrome.runtime.onMessage.addListener((msg: PickModeMessage) => {
    if (msg?.type === "ENTER_PICK_MODE") setPickMode(true);
});
