/**
 * Checklist Utilities
 * Parser, validator, and helpers for the per-task checklist system.
 *
 * EDIT FORMAT (user types / pastes):
 *   # Group Name        (level 1)
 *   ## Sub-group Name   (level 2)
 *   ### Detail Name     (level 3)
 *   - Item name
 *   - Optional item (o)
 *
 * STORAGE FORMAT (JSON in pro.task.checklist_json):
 *   { "groups": [{ "name": "Group", "items": [{ "name": "...", "isOptional": false, "isChecked": false, "isSkipped": false }] }] }
 *
 * DEFAULT TEMPLATE: stored in dbo.standard_registries.json_detail as
 *   { "checklistTemplate": "# Group\n- item\n- optional (o)" }
 */

import type { StandardRegistry } from "@/types/standardRegistry.types";
import type { ChecklistItem, ChecklistGroup, ChecklistJSON, ValidationResult } from "@/types/task/checklist.types";

// Re-export types for backward compatibility
export type { ChecklistItem, ChecklistGroup, ChecklistJSON, ValidationResult } from "@/types/task/checklist.types";

// ─── Validation ───────────────────────────────────────────────────────────────

/**
 * Validate user-typed checklist text.
 * Rules:
 *  - At least one group (#, ##, or ### header)
 *  - Each group must have at least one item (- line)
 *  - No unexpected line prefixes
 *  - Item name must not be empty
 */
export function validateChecklistText(text: string): ValidationResult {
    if (!text?.trim()) return { valid: false, errors: ["Checklist cannot be empty."] };

    const lines = text.split("\n");
    const errors: string[] = [];

    let hasGroup = false;
    let currentGroupName = "";
    let currentGroupHasItems = false;

    lines.forEach((raw, idx) => {
        const line = raw.trim();
        if (!line) return; // blank lines are fine

        if (line.startsWith("#")) {
            // Closing check for previous group
            if (hasGroup && !currentGroupHasItems) {
                errors.push(`Group "${currentGroupName}" has no items.`);
            }
            const name = line.replace(/^#{1,3}\s*/, "").trim();
            if (!name) {
                errors.push(`Line ${idx + 1}: Group name cannot be empty.`);
            }
            hasGroup = true;
            currentGroupName = name;
            currentGroupHasItems = false;
        } else if (line.startsWith("-")) {
            if (!hasGroup) {
                errors.push(`Line ${idx + 1}: Items must be inside a group (start with #, ##, or ### Group Name).`);
            }
            const content = line.replace(/^-\s*/, "").trim();
            const name = content.endsWith(" (o)") ? content.slice(0, -4).trim() : content;
            if (!name) {
                errors.push(`Line ${idx + 1}: Item name cannot be empty.`);
            }
            currentGroupHasItems = true;
        } else {
            errors.push(`Line ${idx + 1}: Invalid — use '#/##/### Group Name' or '- Item name' (optionally ending with '(o)').`);
        }
    });

    // Final group check
    if (hasGroup && !currentGroupHasItems) {
        errors.push(`Group "${currentGroupName}" has no items.`);
    }
    if (!hasGroup) {
        errors.push("No groups found. Use '#', '##', or '### Group Name' to define at least one group.");
    }

    return { valid: errors.length === 0, errors };
}

// ─── Text ↔ JSON conversion ───────────────────────────────────────────────────

/**
 * Parse user-typed text into ChecklistJSON.
 * Supports #, ##, ### headings (level 1, 2, 3).
 * If `existing` is provided, checked/skipped states are preserved for items
 * whose (groupName + itemName) matches an existing item.
 */
export function parseTextToChecklist(text: string, existing?: ChecklistJSON): ChecklistJSON {
    // Build lookup for state preservation: "GroupName::ItemName" → state
    const stateMap = new Map<string, { isChecked: boolean; isSkipped: boolean }>();
    existing?.groups.forEach((g) =>
        g.items.forEach((i) => {
            stateMap.set(`${g.name}::${i.name}`, { isChecked: i.isChecked, isSkipped: i.isSkipped });
        })
    );

    const groups: ChecklistGroup[] = [];
    let currentGroup: ChecklistGroup | null = null;

    text.split("\n").forEach((raw) => {
        const line = raw.trim();
        if (!line) return;

        if (line.startsWith("#")) {
            const hashMatch = line.match(/^(#{1,3})\s*/);
            const level = hashMatch ? hashMatch[1].length : 1;
            const name = line.replace(/^#{1,3}\s*/, "").trim();
            currentGroup = { name, level, items: [] };
            groups.push(currentGroup);
        } else if (line.startsWith("-") && currentGroup) {
            const content = line.replace(/^-\s*/, "").trim();
            const isOptional = content.endsWith(" (o)");
            const name = isOptional ? content.slice(0, -4).trim() : content;
            const key = `${currentGroup.name}::${name}`;
            const prev = stateMap.get(key);
            currentGroup.items.push({
                name,
                isOptional,
                isChecked: prev?.isChecked ?? false,
                isSkipped: prev?.isSkipped ?? false,
            });
        }
    });

    return { groups };
}

/**
 * Convert ChecklistJSON → edit text (no state, just structure).
 * Preserves heading level (#, ##, ###).
 * Used when opening the editor — user sees clean definition.
 */
export function checklistToText(json: ChecklistJSON): string {
    return json.groups
        .map((g) => {
            const hashes = "#".repeat(g.level ?? 1);
            const header = `${hashes} ${g.name}`;
            const items = g.items.map((i) => `- ${i.name}${i.isOptional ? " (o)" : ""}`);
            return [header, ...items].join("\n");
        })
        .join("\n\n");
}

// ─── State helpers ────────────────────────────────────────────────────────────

/** Toggle check or skip state on a specific item, returning a new ChecklistJSON. */
export function toggleChecklistItem(
    json: ChecklistJSON,
    groupIndex: number,
    itemIndex: number,
    action: "check" | "skip"
): ChecklistJSON {
    return {
        groups: json.groups.map((g, gi) =>
            gi !== groupIndex
                ? g
                : {
                      ...g,
                      items: g.items.map((item, ii) => {
                          if (ii !== itemIndex) return item;
                          if (action === "check") {
                              return { ...item, isChecked: !item.isChecked, isSkipped: false };
                          } else {
                              // skip toggle (only for optional)
                              return { ...item, isSkipped: !item.isSkipped, isChecked: false };
                          }
                      }),
                  }
        ),
    };
}

/** True when every item is either checked or skipped. */
export function isChecklistAllDone(json: ChecklistJSON): boolean {
    const all = json.groups.flatMap((g) => g.items);
    return all.length > 0 && all.every((i) => i.isChecked || i.isSkipped);
}

/** Done / total counts. */
export function checklistProgress(json: ChecklistJSON): { done: number; total: number } {
    const all = json.groups.flatMap((g) => g.items);
    return { done: all.filter((i) => i.isChecked || i.isSkipped).length, total: all.length };
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
