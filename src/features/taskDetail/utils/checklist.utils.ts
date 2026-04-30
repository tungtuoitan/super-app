/**
 * Checklist Utilities
 * Parser, validator, and helpers for the per-task checklist system.
 *
 * EDIT FORMAT (user types / pastes):
 *   # Group Name        (level 1)
 *   ## Sub-group Name   (level 2)
 *   ### Detail Name     (level 3)
 *   - Item name
 *   - Optional item-o
 *   - Last sub-item--        (closes current sub-group → next items go to parent)
 *   - Optional + close-o--
 *
 * STORAGE FORMAT (JSON in pro.task.checklist_json):
 *   { "groups": [{ "name": "Group", "items": [...] }] }
 *
 * DEFAULT TEMPLATE: stored in dbo.standard_registries.json_detail as
 *   { "checklistTemplate": "# Group\n- item\n- optional-o" }
 */

import type { StandardRegistry } from "@/shared";
import {ChecklistGroup, ChecklistItem, ChecklistJSON, ChecklistType, EnvCheckState, ValidationResult} from "../types/checklist.types";
import {TESTCASE_ENVIRONMENTS} from "../task.constants";

// ─── Suffix parsing helper ───────────────────────────────────────────────────

/**
 * Strip item suffixes from content string.
 * Order: `--` (outermost), then `-o` or ` (o)` (backward compat).
 * Returns { name, isOptional, isGroupEnd }.
 */
function parseItemSuffixes(content: string): { name: string; isOptional: boolean; isGroupEnd: boolean } {
    let isGroupEnd = false;
    let isOptional = false;

    // Strip -- (group end) from the very end
    if (content.endsWith("--")) {
        isGroupEnd = true;
        content = content.slice(0, -2).trim();
    }

    // Strip -o (optional) — new format
    if (content.endsWith("-o")) {
        isOptional = true;
        content = content.slice(0, -2).trim();
    }
    // Backward compat: (o) — old format
    else if (content.endsWith("(o)")) {
        isOptional = true;
        content = content.slice(0, -3).trim();
    }

    return { name: content, isOptional, isGroupEnd };
}

// ─── Environment helpers ──────────────────────────────────────────────────────

/**
 * Returns the effective check state for an item.
 * If env is provided and item has envStates → reads from envStates[env].
 * Otherwise → reads root isChecked/isSkipped.
 */
export function getItemCheckState(item: ChecklistItem, env?: string): EnvCheckState {
    if (env && item.envStates?.[env]) {
        return item.envStates[env];
    }
    return { isChecked: item.isChecked, isSkipped: item.isSkipped };
}

/**
 * Initialize envStates for all environments from root isChecked/isSkipped.
 * Used when checklistType changes TO testcase.
 */
export function initEnvStates(item: ChecklistItem): Record<string, EnvCheckState> {
    return Object.fromEntries(
        TESTCASE_ENVIRONMENTS.map((env) => [env, { isChecked: item.isChecked, isSkipped: item.isSkipped }])
    );
}

// ─── Validation ───────────────────────────────────────────────────────────────

/**
 * Validate user-typed checklist text.
 * Rules:
 *  - At least one group (#, ##, or ### header)
 *  - Each group must have items or sub-groups
 *  - No unexpected line prefixes
 *  - Item name must not be empty
 */
export function validateChecklistText(text: string): ValidationResult {
    if (!text?.trim()) return { valid: false, errors: ["Checklist cannot be empty."] };

    const lines = text.split("\n");
    const errors: string[] = [];

    // Track groups as a stack to handle sub-group nesting
    const groupStack: { name: string; level: number; hasContent: boolean }[] = [];
    let hasAnyGroup = false;

    const closeGroupsAbove = (level: number) => {
        while (groupStack.length > 0) {
            const top = groupStack[groupStack.length - 1];
            if (top.level >= level) {
                if (!top.hasContent) {
                    errors.push(`Group "${top.name}" has no items or sub-groups.`);
                }
                groupStack.pop();
            } else {
                break;
            }
        }
    };

    lines.forEach((raw, idx) => {
        const line = raw.trim();
        if (!line) return;

        if (line.startsWith("#")) {
            const hashMatch = line.match(/^(#{1,3})\s*/);
            const level = hashMatch ? hashMatch[1].length : 1;

            // Close groups at same or deeper level
            closeGroupsAbove(level);

            // A sub-group counts as content for its parent
            if (groupStack.length > 0) {
                groupStack[groupStack.length - 1].hasContent = true;
            }

            const name = line.replace(/^#{1,3}\s*/, "").trim();
            if (!name) {
                errors.push(`Line ${idx + 1}: Group name cannot be empty.`);
            }
            groupStack.push({ name: name || "(unnamed)", level, hasContent: false });
            hasAnyGroup = true;
        } else if (line.startsWith("-")) {
            if (!hasAnyGroup) {
                errors.push(`Line ${idx + 1}: Items must be inside a group (start with #, ##, or ### Group Name).`);
            }
            const content = line.replace(/^-\s*/, "").trim();
            const { name } = parseItemSuffixes(content);
            if (!name) {
                errors.push(`Line ${idx + 1}: Item name cannot be empty.`);
            }
            if (groupStack.length > 0) {
                groupStack[groupStack.length - 1].hasContent = true;
            }
        } else {
            errors.push(`Line ${idx + 1}: Invalid — use '#/##/### Group Name' or '- Item name'.`);
        }
    });

    // Close remaining groups
    closeGroupsAbove(0);

    if (!hasAnyGroup) {
        errors.push("No groups found. Use '#', '##', or '### Group Name' to define at least one group.");
    }

    return { valid: errors.length === 0, errors };
}

// ─── Text ↔ JSON conversion ───────────────────────────────────────────────────

/**
 * Parse user-typed text into ChecklistJSON.
 * Supports #, ##, ### headings (level 1, 2, 3).
 * Supports -o (optional), -- (close sub-group → items go to parent).
 * If `existing` is provided, checked/skipped/envStates are preserved for matching items.
 */
export function parseTextToChecklist(text: string, existing?: ChecklistJSON): ChecklistJSON {
    // Build lookup for state preservation: "GroupName::ItemName" → state
    const stateMap = new Map<string, { isChecked: boolean; isSkipped: boolean; envStates?: Record<string, EnvCheckState> }>();
    existing?.groups.forEach((g) =>
        g.items.forEach((i) => {
            stateMap.set(`${g.name}::${i.name}`, {
                isChecked: i.isChecked,
                isSkipped: i.isSkipped,
                envStates: i.envStates,
            });
        })
    );

    const groups: ChecklistGroup[] = [];
    // Stack tracks nesting: each entry is a reference to a group in `groups`
    const groupStack: ChecklistGroup[] = [];
    let needsContinuation = false;

    text.split("\n").forEach((raw) => {
        const line = raw.trim();
        if (!line) return;

        if (line.startsWith("#")) {
            needsContinuation = false;
            const hashMatch = line.match(/^(#{1,3})\s*/);
            const level = hashMatch ? hashMatch[1].length : 1;
            const name = line.replace(/^#{1,3}\s*/, "").trim();

            // Pop groups at same or deeper level
            while (groupStack.length > 0 && groupStack[groupStack.length - 1].level! >= level) {
                groupStack.pop();
            }

            const newGroup: ChecklistGroup = { name, level, items: [] };
            groups.push(newGroup);
            groupStack.push(newGroup);
        } else if (line.startsWith("-") && groupStack.length > 0) {
            const content = line.replace(/^-\s*/, "").trim();
            const { name, isOptional, isGroupEnd } = parseItemSuffixes(content);

            // After a -- pop, create a continuation of the parent
            if (needsContinuation) {
                const parent = groupStack[groupStack.length - 1];
                const cont: ChecklistGroup = {
                    name: parent.name,
                    level: parent.level,
                    items: [],
                    isContinuation: true,
                };
                groups.push(cont);
                // Replace parent on stack with continuation (subsequent items go here)
                groupStack[groupStack.length - 1] = cont;
                needsContinuation = false;
            }

            const currentGroup = groupStack[groupStack.length - 1];
            const key = `${currentGroup.name}::${name}`;
            const prev = stateMap.get(key);
            currentGroup.items.push({
                name,
                isOptional,
                isChecked: prev?.isChecked ?? false,
                isSkipped: prev?.isSkipped ?? false,
                envStates: prev?.envStates,
                isGroupEnd,
            });

            // -- closes the current sub-group → pop back to parent
            if (isGroupEnd && groupStack.length > 1) {
                groupStack.pop();
                needsContinuation = true;
            }
        }
    });

    return { checklistType: existing?.checklistType ?? "checklist", groups };
}

/**
 * Convert ChecklistJSON → edit text (no state, just structure).
 * Preserves heading level (#, ##, ###).
 * Continuation groups output items without a header.
 * Used when opening the editor — user sees clean definition.
 */
export function checklistToText(json: ChecklistJSON): string {
    const blocks: string[] = [];

    json.groups.forEach((g) => {
        const lines: string[] = [];

        // Continuation groups skip the header
        if (!g.isContinuation) {
            const hashes = "#".repeat(g.level ?? 1);
            lines.push(`${hashes} ${g.name}`);
        }

        g.items.forEach((item) => {
            let suffix = "";
            if (item.isOptional) suffix += "-o";
            if (item.isGroupEnd) suffix += "--";
            lines.push(`- ${item.name}${suffix}`);
        });

        // Continuation: append to previous block (no blank-line separator)
        if (g.isContinuation && blocks.length > 0) {
            blocks[blocks.length - 1] += "\n" + lines.join("\n");
        } else {
            blocks.push(lines.join("\n"));
        }
    });

    return blocks.join("\n\n");
}

/**
 * Find the character offset in edit-text for a given group/item.
 * Used to position cursor when double-clicking an item to edit.
 * Pass itemIndex = -1 to target the group header line.
 * Cursor placed at end of the matched line.
 */
export function findItemCursorOffset(text: string, targetGi: number, targetIi: number): number {
    const lines = text.split("\n");
    let gi = -1;
    let ii = -1;
    let offset = 0;

    for (const line of lines) {
        if (line.match(/^#{1,3}\s/)) {
            gi++;
            ii = -1;
            if (gi === targetGi && targetIi === -1) return offset + line.length;
        } else if (line.startsWith("- ")) {
            ii++;
            if (gi === targetGi && ii === targetIi) return offset + line.length;
        }
        offset += line.length + 1; // +1 for \n
    }
    return Math.max(0, offset - 1); // fallback: end of text
}

// ─── State helpers ────────────────────────────────────────────────────────────

/**
 * Toggle check or skip state on a specific item, returning a new ChecklistJSON.
 * If `env` is provided, toggles envStates[env] instead of root state.
 */
export function toggleChecklistItem(
    json: ChecklistJSON,
    groupIndex: number,
    itemIndex: number,
    action: "check" | "skip",
    env?: string
): ChecklistJSON {
    return {
        checklistType: json.checklistType,
        groups: json.groups.map((g, gi) =>
            gi !== groupIndex
                ? g
                : {
                      ...g,
                      items: g.items.map((item, ii) => {
                          if (ii !== itemIndex) return item;

                          if (env && item.envStates) {
                              // Per-env toggle
                              const cur = item.envStates[env] ?? { isChecked: false, isSkipped: false };
                              const next: EnvCheckState = action === "check"
                                  ? { isChecked: !cur.isChecked, isSkipped: false }
                                  : { isSkipped: !cur.isSkipped, isChecked: false };
                              return { ...item, envStates: { ...item.envStates, [env]: next } };
                          }

                          // Root toggle (non-testcase or no envStates)
                          if (action === "check") {
                              return { ...item, isChecked: !item.isChecked, isSkipped: false };
                          } else {
                              return { ...item, isSkipped: !item.isSkipped, isChecked: false };
                          }
                      }),
                  }
        ),
    };
}

/**
 * True when every item is either checked or skipped.
 * If `env` is provided, checks envStates[env] instead of root state.
 */
export function isChecklistAllDone(json: ChecklistJSON, env?: string): boolean {
    const all = json.groups.flatMap((g) => g.items);
    return all.length > 0 && all.every((i) => {
        const s = getItemCheckState(i, env);
        return s.isChecked || s.isSkipped;
    });
}

/**
 * Done / total counts.
 * If `env` is provided, counts using envStates[env].
 */
export function checklistProgress(json: ChecklistJSON, env?: string): { done: number; total: number } {
    const all = json.groups.flatMap((g) => g.items);
    const done = all.filter((i) => {
        const s = getItemCheckState(i, env);
        return s.isChecked || s.isSkipped;
    }).length;
    return { done, total: all.length };
}

/**
 * Returns the flat index (across all groups) of item at [groupIndex][itemIndex].
 * Used to determine sequential locking.
 */
export function flatItemIndex(json: ChecklistJSON, groupIndex: number, itemIndex: number): number {
    let flat = 0;
    for (let gi = 0; gi < groupIndex; gi++) flat += json.groups[gi].items.length;
    return flat + itemIndex;
}

/** All items flattened, in order. */
export function getFlatItems(json: ChecklistJSON): ChecklistItem[] {
    return json.groups.flatMap((g) => g.items);
}

// ─── Template helpers ─────────────────────────────────────────────────────────

/**
 * Get the default checklist template text for a given taskType code.
 * Only source: custom template in dbo.standard_registries.json_detail (set via "Set as default").
 * Returns empty string if no template is found.
 */
export function getChecklistTemplate(
    taskTypeCode: string,
    registriesByType: Record<string, StandardRegistry[]>
): string {
    const regs = registriesByType["taskType"] ?? [];
    const reg = regs.find((r) => r.code === taskTypeCode);

    if (reg?.json_detail) {
        try {
            const custom = JSON.parse(reg.json_detail)?.checklistTemplate;
            if (custom && typeof custom === "string") return custom;
        } catch {
            // invalid JSON — return empty
        }
    }

    return "";
}

/** Parse a JSON string from the DB into ChecklistJSON. Returns null on failure. */
export function parseChecklistJson(json: string | null | undefined): ChecklistJSON | null {
    if (!json) return null;
    try {
        const parsed = JSON.parse(json) as ChecklistJSON;
        if (!Array.isArray(parsed?.groups)) return null;
        return parsed;
    } catch {
        return null;
    }
}

// ─── ChecklistType helpers ───────────────────────────────────────────────────

/** Human-readable label for a checklist type. */
export function getChecklistTypeLabel(type?: ChecklistType): string {
    switch (type) {
        case "testcase": return "Testcase";
        case "repeat-checklist": return "Repeat";
        default: return "Checklist";
    }
}

// ─── Migration helpers ───────────────────────────────────────────────────────

/**
 * Auto-init envStates for all items.
 * Called when checklistType changes TO testcase.
 */
export function migrateToTestcase(json: ChecklistJSON): ChecklistJSON {
    return {
        ...json,
        groups: json.groups.map((g) => ({
            ...g,
            items: g.items.map((item) => ({
                ...item,
                envStates: item.envStates ?? initEnvStates(item),
            })),
        })),
    };
}

/**
 * Copy activeEnv state to root isChecked/isSkipped, remove envStates.
 * Called when checklistType changes FROM testcase.
 */
export function migrateFromTestcase(json: ChecklistJSON, activeEnv: string): ChecklistJSON {
    return {
        ...json,
        groups: json.groups.map((g) => ({
            ...g,
            items: g.items.map((item) => {
                const s = getItemCheckState(item, activeEnv);
                const { envStates: _, ...rest } = item;
                return { ...rest, isChecked: s.isChecked, isSkipped: s.isSkipped };
            }),
        })),
    };
}
