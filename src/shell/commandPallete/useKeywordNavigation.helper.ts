import { useEditorTabHelper } from "../hooks/useEditorTab.helper";
import { useEditorTabBarStore } from "../store/EditorTab.store";
import { useAuthStore } from "@/shared";
import { parseKeywordLink, isValidUrl } from "@/shared";
import type { Keyword } from "@/shared";
import { useConsoleHelper } from "@/shared";
import { keywordNavigatorRegistry } from "./keywordNavigator.registry";

export const useKeywordNavigationHelper = () => {
    const { $user } = useAuthStore();
    const { openTabs, setOpenTabs } = useEditorTabBarStore();
    const { openTab, updateActiveTab } = useEditorTabHelper();
    const _console = useConsoleHelper();

    const navigateLink = async (keyword: Keyword, openedBy?: { link: string; label: string }) => {
        try {
            const parsed = parseKeywordLink(keyword);

            if (!parsed) {
                console.warn("Invalid keyword link:", keyword.link);
                return;
            }

            if (parsed.type === "external" && parsed.url) {
                const url = parsed.url.startsWith("http") ? parsed.url : `https://${parsed.url}`;
                if (isValidUrl(url)) {
                    window.open(url, "_blank", "noopener,noreferrer");
                } else {
                    _console.error(`Invalid URL: ${url}`);
                }
                return;
            }

            const ctx = {
                userToken: $user.userToken,
                openTabs,
                openTab,
                updateActiveTab,
                setOpenTabs,
                log: {
                    error: _console.error,
                    success: _console.success,
                    info: _console.info,
                },
            };
            await keywordNavigatorRegistry.navigate(keyword, openedBy, ctx);
        } catch (error) {
            console.error("Error navigating to keyword:", error);
            _console.error("Failed to navigate to keyword");
        }
    };

    return { navigateLink };
};
