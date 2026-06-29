import React from "react";
import { createRoot } from "react-dom/client";
import { fetchQuestions } from "./reviewApi";
import { ReviewOverlay } from "./ReviewOverlay";

const HOST_ID = "__sa_review_host__";

function isReviewSite(): boolean {
    const h = location.hostname;
    return (
        h.includes("facebook.com") ||
        h.includes("instagram.com") ||
        h.includes("youtube.com")
    );
}

function unmount() {
    document.getElementById(HOST_ID)?.remove();
}

let _scrollBlocker: ((e: Event) => void) | null = null;
let _keyBlocker: ((e: KeyboardEvent) => void) | null = null;
let _videoPauseTimer: ReturnType<typeof setInterval> | null = null;

const SCROLL_KEYS = new Set(["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "PageUp", "PageDown", "Home", "End", " "]);

function lockScroll() {
    unlockScroll();
    _scrollBlocker = (e: Event) => { e.preventDefault(); e.stopPropagation(); };
    _keyBlocker = (e: KeyboardEvent) => { if (SCROLL_KEYS.has(e.key)) { e.preventDefault(); e.stopPropagation(); } };
    window.addEventListener("wheel",     _scrollBlocker, { passive: false, capture: true });
    window.addEventListener("touchmove", _scrollBlocker, { passive: false, capture: true });
    window.addEventListener("keydown",   _keyBlocker,    { capture: true });
}

function unlockScroll() {
    if (_scrollBlocker) {
        window.removeEventListener("wheel",     _scrollBlocker, { capture: true });
        window.removeEventListener("touchmove", _scrollBlocker, { capture: true });
        _scrollBlocker = null;
    }
    if (_keyBlocker) {
        window.removeEventListener("keydown", _keyBlocker, { capture: true });
        _keyBlocker = null;
    }
}

function startPauseLoop() {
    if (_videoPauseTimer !== null) return; // already running
    _videoPauseTimer = setInterval(() => {
        document.querySelectorAll<HTMLVideoElement>("video").forEach(v => {
            if (!v.paused) { try { v.pause(); } catch { /* ignore */ } }
        });
    }, 600);
}

function stopPauseLoop() {
    if (_videoPauseTimer !== null) { clearInterval(_videoPauseTimer); _videoPauseTimer = null; }
}

async function mount() {
    if (!isReviewSite()) return;
    if (document.getElementById(HOST_ID)) return;

    const questions = await fetchQuestions();
    if (!questions.length) return;

    lockScroll();
    // Don't auto-pause videos on mount — only pause during active question, not break

    const host = document.createElement("div");
    host.id = HOST_ID;
    document.body.appendChild(host);

    const shadow = host.attachShadow({ mode: "open" });
    const container = document.createElement("div");
    shadow.appendChild(container);

    const root = createRoot(container);
    root.render(
        React.createElement(ReviewOverlay, {
            questions,
            onClose: () => {
                stopPauseLoop();
                unlockScroll();
                root.unmount();
                unmount();
            },
            onBreakChange: (isBreak: boolean) => {
                if (isBreak) {
                    // Break: stop pause loop so user can watch video freely
                    stopPauseLoop();
                    unlockScroll();
                } else {
                    // Question active: pause videos + lock scroll
                    startPauseLoop();
                    lockScroll();
                }
            },
        }),
    );
}

if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", mount);
} else {
    mount();
}
