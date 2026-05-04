/**
 * useGlobalShortcut — priority-based keyboard shortcut registry.
 *
 * ONE capture-phase listener on `window`. When a shortcut fires, only the single
 * highest-priority currently-registered handler runs. All others are ignored.
 *
 * ── Core rules ───────────────────────────────────────────────────────────────
 *
 *  1. Use `enabled` to declare WHEN your handler is active.
 *     When enabled=false the handler is removed from the registry entirely.
 *     The condition in `enabled` must not overlap with any other handler for
 *     the same shortcut at the same priority level.
 *
 *  2. Exactly ONE handler runs per keystroke — the one with the highest priority
 *     among all currently-registered (enabled) handlers.
 *
 *  3. No return value from callback — if you need conditionality, express it
 *     through `enabled`, not inside the callback body.
 *
 * ── Priority convention ───────────────────────────────────────────────────────
 *
 *    0   Default / main handler.
 *        Runs in the normal app state — no special context is active.
 *        Always registered (no `enabled` condition needed).
 *        Example: EditorToolbar ctrl+s — saves the current open tab.
 *
 *   50   Feature-level override.
 *        Active when a specific feature panel or view is in focus.
 *        Overrides the default handler while that feature is active.
 *        Example: a panel that intercepts Escape to close itself.
 *
 *  100   Context-specific override.
 *        Active only when the user is inside a narrow editing context
 *        (inline editor, modal dialog, etc.). Condition is tight and explicit.
 *        Overrides both default and feature-level handlers.
 *        Example: KNodeCard ctrl+s while isEditing=true.
 *
 *        Rule: handlers at the same priority level must have
 *        mutually-exclusive `enabled` conditions — only one should ever
 *        be registered at a time for a given shortcut.
 *
 * ── Usage ─────────────────────────────────────────────────────────────────────
 *
 *   // Default handler (priority 0) — always active, no condition needed
 *   useGlobalShortcut("ctrl+s", { id: "editor-toolbar-save" }, saveCurrentTab);
 *
 *   // Context-specific override (priority 100) — active only while editing
 *   useGlobalShortcut("ctrl+s", { id: "node-save", priority: 100, enabled: isEditing }, saveNode);
 */

import { useEffect, useRef } from "react";

// ── types ────────────────────────────────────────────────────────────────────

interface ShortcutEntry {
    id: string;
    priority: number;
    callback: () => void;
}

interface ParsedCombo {
    key: string;      // lowercase: "s", "escape", "enter", …
    ctrl: boolean;
    shift: boolean;
    alt: boolean;
}

// ── registry (module-level — no React state, no re-renders) ──────────────────

const registry = new Map<string, ShortcutEntry[]>();   // comboKey → handlers[]
let listenerAttached = false;

/** Canonical string for a combo, e.g. "ctrl+shift+s" */
function comboKey(p: ParsedCombo): string {
    const parts: string[] = [];
    if (p.ctrl)  parts.push("ctrl");
    if (p.alt)   parts.push("alt");
    if (p.shift) parts.push("shift");
    parts.push(p.key);
    return parts.join("+");
}

/** Parse "ctrl+shift+s" → ParsedCombo */
function parseCombo(raw: string): ParsedCombo {
    const parts = raw.toLowerCase().split("+").map(s => s.trim());
    return {
        ctrl:  parts.includes("ctrl"),
        shift: parts.includes("shift"),
        alt:   parts.includes("alt"),
        key:   parts.filter(p => !["ctrl", "shift", "alt"].includes(p))[0] ?? "",
    };
}

/** Does the KeyboardEvent match the combo? */
function eventMatchesCombo(e: KeyboardEvent, combo: ParsedCombo): boolean {
    const ctrlOk  = combo.ctrl  ? (e.ctrlKey || e.metaKey) : !(e.ctrlKey || e.metaKey);
    const shiftOk = combo.shift ? e.shiftKey               : !e.shiftKey;
    const altOk   = combo.alt   ? e.altKey                  : !e.altKey;
    return ctrlOk && shiftOk && altOk && e.key.toLowerCase() === combo.key;
}

// ── single global listener ───────────────────────────────────────────────────

function globalHandler(e: KeyboardEvent) {
    for (const [ck, entries] of registry) {
        if (entries.length === 0) continue;
        const combo = parseCombo(ck);
        if (!eventMatchesCombo(e, combo)) continue;

        // Pick the single highest-priority handler — only it runs.
        // preventDefault/stopImmediatePropagation BEFORE callback so browser default
        // is always suppressed even if the callback throws.
        const winner = [...entries].sort((a, b) => b.priority - a.priority)[0];
        e.preventDefault();
        e.stopImmediatePropagation();
        winner.callback();
        return;
    }
}

function ensureListener() {
    if (listenerAttached) return;
    window.addEventListener("keydown", globalHandler, { capture: true });
    listenerAttached = true;
}

// ── register / unregister ────────────────────────────────────────────────────

function registerShortcut(combo: string, entry: ShortcutEntry) {
    ensureListener();
    const ck = comboKey(parseCombo(combo));
    let list = registry.get(ck);
    if (!list) { list = []; registry.set(ck, list); }
    // Replace existing entry with same id (idempotent re-register)
    const idx = list.findIndex(e => e.id === entry.id);
    if (idx !== -1) list.splice(idx, 1);
    list.push(entry);
}

function unregisterShortcut(combo: string, id: string) {
    const ck = comboKey(parseCombo(combo));
    const list = registry.get(ck);
    if (!list) return;
    const idx = list.findIndex(e => e.id === id);
    if (idx !== -1) list.splice(idx, 1);
}

// ── React hook ───────────────────────────────────────────────────────────────

interface ShortcutOptions {
    id: string;
    /**
     * Higher number wins. Only one handler (the highest-priority enabled one) runs per keystroke.
     *   0  = default / main handler     — always registered, no condition (default)
     *  50  = feature-level override     — active while a specific panel/view is focused
     * 100  = context-specific override  — active inside a narrow editing context (inline editor, dialog)
     */
    priority?: number;
    /**
     * When false, the handler is removed from the registry entirely.
     * Use this to express WHEN your handler is active — conditions at the same priority
     * level must be mutually exclusive across all handlers for the same shortcut.
     */
    enabled?: boolean;
}

/**
 * Register a global keyboard shortcut.
 * Only the single highest-priority enabled handler runs per keystroke.
 *
 * @param combo    e.g. "ctrl+s", "ctrl+shift+s", "escape", "enter", "delete"
 * @param opts     { id, priority? = 0, enabled? = true }
 * @param callback called when this shortcut fires and no higher-priority handler is registered
 */
export function useGlobalShortcut(
    combo: string,
    opts: ShortcutOptions,
    callback: () => void,
) {
    const cbRef = useRef(callback);
    cbRef.current = callback;

    const { id, priority = 0, enabled = true } = opts;

    useEffect(() => {
        if (!enabled) return;
        const entry: ShortcutEntry = {
            id,
            priority,
            callback: () => cbRef.current(),
        };
        registerShortcut(combo, entry);
        return () => unregisterShortcut(combo, id);
    }, [combo, id, priority, enabled]);
}
