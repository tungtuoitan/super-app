/**
 * Checklist Utilities
 * Parser, validator, and helpers for the per-task checklist system.
 *
 * EDIT FORMAT (user types / pastes):
 *   # Group Name
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

// ─── Domain types ─────────────────────────────────────────────────────────────

export interface ChecklistItem {
    name: string;
    isOptional: boolean;
    isChecked: boolean;
    isSkipped: boolean;
}

export interface ChecklistGroup {
    name: string;
    items: ChecklistItem[];
}

export interface ChecklistJSON {
    groups: ChecklistGroup[];
}

export interface ValidationResult {
    valid: boolean;
    errors: string[];
}

// ─── Validation ───────────────────────────────────────────────────────────────

/**
 * Validate user-typed checklist text.
 * Rules:
 *  - At least one group (# header)
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
            const name = line.replace(/^#+\s*/, "").trim();
            if (!name) {
                errors.push(`Line ${idx + 1}: Group name cannot be empty.`);
            }
            hasGroup = true;
            currentGroupName = name;
            currentGroupHasItems = false;
        } else if (line.startsWith("-")) {
            if (!hasGroup) {
                errors.push(`Line ${idx + 1}: Items must be inside a group (start with # Group Name).`);
            }
            const content = line.replace(/^-\s*/, "").trim();
            const name = content.endsWith(" (o)") ? content.slice(0, -4).trim() : content;
            if (!name) {
                errors.push(`Line ${idx + 1}: Item name cannot be empty.`);
            }
            currentGroupHasItems = true;
        } else {
            errors.push(`Line ${idx + 1}: Invalid — use '# Group Name' or '- Item name' (optionally ending with '(o)').`);
        }
    });

    // Final group check
    if (hasGroup && !currentGroupHasItems) {
        errors.push(`Group "${currentGroupName}" has no items.`);
    }
    if (!hasGroup) {
        errors.push("No groups found. Use '# Group Name' to define at least one group.");
    }

    return { valid: errors.length === 0, errors };
}

// ─── Text ↔ JSON conversion ───────────────────────────────────────────────────

/**
 * Parse user-typed text into ChecklistJSON.
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
            currentGroup = { name: line.replace(/^#+\s*/, "").trim(), items: [] };
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
 * Used when opening the editor — user sees clean definition.
 */
export function checklistToText(json: ChecklistJSON): string {
    return json.groups
        .map((g) => {
            const header = `# ${g.name}`;
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
 * Built-in fallback templates per taskType code.
 * Used when the registry entry has no json_detail (not yet customised via "Set as default").
 */
const BUILTIN_CHECKLIST_TEMPLATES: Record<string, string> = {
    "vanthiel-coding": `# Nhận task
- Update to InProgress
- GPT đọc task
- Thêm progress vào description - task lớn (o)
- Thêm bonus vào description (o)
- Tạo testcase file
- Coding
- Test local
- Đọc từng dòng code – không có code thừa

# Đẩy lên dev
- Thông báo deploy dev
- Đẩy code FE (o)
- → master-sub-dev (o)
- → master-dev (o)
- Đẩy code BE (o)
- → master-dev BE (o)
- Đẩy DB (o)
- → procedure (o)
- → table (o)
- → table type (o)
- Thông báo done
- Set Env = DEV
- Test dev
- Comment bằng chứng: img, testcase
- Comment test pass
- Tạo code list

# Đẩy lên UAT
- Thông báo deploy UAT
- Đẩy code FE (o)
- → master-sub-uat (o)
- → master-uat (o)
- Đẩy code BE (o)
- → master-uat BE (o)
- Đẩy DB (o)
- → procedure UAT (o)
- → table UAT (o)
- → table type UAT (o)
- Thông báo done
- Set Env = UAT
- Test UAT (o)
- Comment bằng chứng UAT: img, testcase (o)
- Comment test pass UAT (o)
- Test nhanh UAT (o)
- Chuẩn bị data cho b (o)
- Tag @b: ready for UAT testing (o)
- Set Status = Tested

# Đẩy lên master-prod
- Đẩy code FE (o)
- → master-sub-uat prod (o)
- → master-uat prod (o)
- Đẩy code BE (o)
- → master-uat BE prod (o)
- Comment: ready on master-prod
- → Paste commit images (o)
- → List commit (o)
- → List procedures (o)
- → Tag Renel (o)
- → cc @b @c.Uyen (o)

# Hoàn thành
- Check prod on next day
- Close sa.task`,
};

/**
 * Get the default checklist template text for a given taskType code.
 * Priority:
 *  1. Custom template in dbo.standard_registries.json_detail (set via "Set as default")
 *  2. Built-in hardcoded template (BUILTIN_CHECKLIST_TEMPLATES)
 *  3. Empty string (no template for this taskType)
 */
export function getChecklistTemplate(
    taskTypeCode: string,
    registriesByType: Record<string, StandardRegistry[]>
): string {
    const regs = registriesByType["taskType"] ?? [];
    const reg = regs.find((r) => r.code === taskTypeCode);

    // 1. Custom template from DB
    if (reg?.json_detail) {
        try {
            const custom = JSON.parse(reg.json_detail)?.checklistTemplate;
            if (custom && typeof custom === "string") return custom;
        } catch {
            // fall through to builtin
        }
    }

    // 2. Built-in fallback
    return BUILTIN_CHECKLIST_TEMPLATES[taskTypeCode] ?? "";
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
