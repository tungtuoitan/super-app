import type { KeywordPlugin } from "@/shell";
import { useWorkspaceKeywordPluginInit } from "../hooks/useWorkspaceKeywordPluginInit";

type NavigateFn = KeywordPlugin["navigate"];

let _impl: NavigateFn | null = null;

export const workspaceKeywordPlugin: KeywordPlugin = {
    handles: ["workspace", "folder", "note"],
    navigate: (keyword, openedBy, ctx) =>
        _impl ? _impl(keyword, openedBy, ctx) : Promise.resolve(false),
};

export function _setWorkspaceNavigateImpl(fn: NavigateFn): void {
    _impl = fn;
}

export function WorkspaceKeywordPluginInit() {
    useWorkspaceKeywordPluginInit();
    return null;
}
