/**
 * Keyword Navigator Registry
 *
 * CommandPalette / keyword navigation does NOT import features directly.
 * Each feature registers a plugin here from its xxx.module.tsx.
 *
 * Dependency direction:
 *   features/xxx/shell/xxx.module.tsx  →  keywordNavigator.registry  ←  useKeywordNavigation.helper
 *                                                                     ←  useCommandPaletteHelper
 */

import type { BaseTab } from "../types/tab.types";
import type { Keyword } from "../../shared/keyword/keyword.types";

// ─── Contracts ───────────────────────────────────────────────────────────────

export interface NavigationContext {
    userToken: string;
    openTabs: BaseTab[];
    openTab: (data: any, type: string, openedBy?: { link: string; label: string }) => void;
    updateActiveTab: (tabId: string | null, tabs?: BaseTab[]) => void;
    setOpenTabs: (updater: (prev: BaseTab[]) => BaseTab[]) => void;
    log: {
        error: (msg: string) => void;
        success: (msg: string) => void;
        info: (msg: string) => void;
    };
}

export interface KeywordPlugin {
    /** keyword.type values this plugin handles, e.g. ["project", "task"] */
    handles: string[];

    /** TARGET_TYPE strings (from API) this plugin can resolve, e.g. ["PROJECT", "TASK"] */
    resolveTargetTypes?: string[];

    /** Open or activate the right tab. Return true if handled. */
    navigate: (
        keyword: Keyword,
        openedBy: { link: string; label: string } | undefined,
        ctx: NavigationContext,
    ) => Promise<boolean>;

    /** Resolve a targetType + targetId → { link, label } for openedBy. */
    resolveTarget?: (
        targetType: string,
        targetId: number,
        userToken: string,
    ) => Promise<{ link: string; label: string } | undefined>;

    /** Render the icon for this keyword type. Return null to use default static icon. */
    renderIcon?: (icon?: string, color?: string, className?: string) => React.ReactNode | null;
}

// ─── Registry ────────────────────────────────────────────────────────────────

const _plugins: KeywordPlugin[] = [];

export const keywordNavigatorRegistry = {
    register(plugin: KeywordPlugin): void {
        _plugins.push(plugin);
    },

    async navigate(
        keyword: Keyword,
        openedBy: { link: string; label: string } | undefined,
        ctx: NavigationContext,
    ): Promise<boolean> {
        for (const plugin of _plugins) {
            if (plugin.handles.includes(keyword.type)) {
                return plugin.navigate(keyword, openedBy, ctx);
            }
        }
        return false;
    },

    async resolveTarget(
        targetType: string,
        targetId: number,
        userToken: string,
    ): Promise<{ link: string; label: string } | undefined> {
        for (const plugin of _plugins) {
            if (plugin.resolveTargetTypes?.includes(targetType)) {
                const result = await plugin.resolveTarget?.(targetType, targetId, userToken);
                if (result) return result;
            }
        }
        return undefined;
    },

    renderIcon(
        type: string,
        icon?: string,
        color?: string,
        className?: string,
    ): React.ReactNode | null {
        for (const plugin of _plugins) {
            if (plugin.handles.includes(type) && plugin.renderIcon) {
                return plugin.renderIcon(icon, color, className);
            }
        }
        return null;
    },
};
