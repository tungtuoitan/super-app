import React from "react";
import { createRoot } from "react-dom/client";
import { fetchQuestions } from "./reviewApi";
import { ReviewOverlay } from "./ReviewOverlay";

const HOST_ID = "__sa_review_host__";

function isReviewSite(): boolean {
    const h = window.location.hostname;
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

    const style = document.createElement("style");
    style.textContent = `
        * { box-sizing: border-box; }
        p { margin: 0 0 6px; }
        p:last-child { margin-bottom: 0; }
        code { background: rgba(255,255,255,0.1); border-radius: 4px; padding: 1px 5px; font-family: ui-monospace, SFMono-Regular, monospace; font-size: 0.88em; color: #e4e4e7; }
        pre { background: #09090b; border: 1px solid rgba(255,255,255,0.08); border-radius: 8px; padding: 10px 12px; overflow-x: auto; margin: 4px 0; }
        pre code { background: none; padding: 0; font-size: 12px; color: rgba(244,244,245,0.75); }
        strong { color: #f4f4f5; font-weight: 700; }
        em { color: #a1a1aa; }
        ul, ol { display: inline-block; text-align: left; margin: 4px 0 4px 18px; padding: 0; }
        li { margin: 2px 0; }
        /* shiki */
        .shiki { margin: 0; background: #1e1e1e !important; }
        /* scrollbar */
        * { scrollbar-width: thin; scrollbar-color: rgba(121,121,121,0.4) transparent; }
        *::-webkit-scrollbar { width: 10px; height: 10px; }
        *::-webkit-scrollbar-track { background: transparent; }
        *::-webkit-scrollbar-thumb { background-color: rgba(121,121,121,0.4); border-radius: 10px; border: 2px solid transparent; background-clip: content-box; }
        *::-webkit-scrollbar-thumb:hover { background-color: rgba(100,100,100,0.7); }
        *::-webkit-scrollbar-thumb:active { background-color: rgba(191,191,191,1); }
        *::-webkit-scrollbar-corner { background: transparent; }
    `;
    shadow.appendChild(style);

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
