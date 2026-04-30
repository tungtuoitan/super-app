/**
 * useGlobalShortcut — priority-based keyboard shortcut registry.
 *
 * ONE capture-phase listener on `window` routes to the highest-priority
 * handler that matches.  No more stopImmediatePropagation() wars.
 *
 * Usage:
 *   useGlobalShortcut("ctrl+s", { id: "k-node-save", priority: 100, enabled: isEditing }, () => { save(); return true; });
 *
 * Priority convention:
 *   100  inline / modal editing  (NodeCard, TaskSection)
 *    50  editor toolbar           (general save)
 *     0  fallback / default
 */

import { useEffect, useRef } from "react";

// ── types ────────────────────────────────────────────────────────────────────

interface ShortcutEntry {
    id: string;
    priority: number;
    callback: () => boolean | void;   // return true (or void) = handled; false = skip
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

        // Sort by priority desc — highest-priority handler runs first
        const sorted = [...entries].sort((a, b) => b.priority - a.priority);
        for (const entry of sorted) {
            const result = entry.callback();
            if (result !== false) {
                // Handled — stop browser default + all other listeners
                e.preventDefault();
                e.stopImmediatePropagation();
                return;
            }
        }
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
    priority?: number;      // default 50
    enabled?: boolean;       // default true
}

/**
 * Register a global keyboard shortcut with priority routing.
 *
 * @param combo     e.g. "ctrl+s", "ctrl+shift+s", "alt+s", "escape"
 * @param opts      { id, priority?, enabled? }
 * @param callback  return true (or void) = handled; return false = skip, let lower-priority handle
 */
export function useGlobalShortcut(
    combo: string,
    opts: ShortcutOptions,
    callback: () => boolean | void,
) {
    const cbRef = useRef(callback);
    cbRef.current = callback;

    const { id, priority = 50, enabled = true } = opts;

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
