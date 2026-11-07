import {ChecklistJSON, ChecklistType} from "../types/checklist.types";
import {StandardRegistry} from "@/shared";

// ─── Template helpers ─────────────────────────────────────────────────────────

/**
 * Get the default checklist template text for a given taskType code.
 * Only source: custom template in dbo.standard_registries.json_detail (set via "Set as default").
 * Returns empty string if no template is found.
 */
export function getChecklistTemplate(
    taskTypeCode: string,
    taskTypes: StandardRegistry[]
): string {
    const reg = taskTypes.find((r) => r.code === taskTypeCode);

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
