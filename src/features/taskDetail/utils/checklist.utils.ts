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

import {ChecklistItem, ChecklistJSON, EnvCheckState} from "../types/checklist.types";
import {TESTCASE_ENVIRONMENTS} from "../task.constants";

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
