import { config } from "config/app.config";
import type { WikiInfo, WikiKeyword } from "../types/wiki.type";
import {apiFetch} from "@/shared";

const BASE = () => `${config.api.baseURL}/api/wiki`;

// ─── Response mappers ─────────────────────────────────────────────────────────

function mapKeyword(dto: any): WikiKeyword {
    return {
        id:             dto.id,
        name:           dto.name,
        description:    dto.description,
        synonyms:       dto.synonyms       ?? [],
        infoIds:        dto.infoIds        ?? [],
        icon:           dto.icon           ?? undefined,
        views:          dto.views          ?? 0,
        reads:          dto.reads          ?? 0,
        edits:          dto.edits          ?? 0,
        posX:           dto.posX           ?? undefined,
        posY:           dto.posY           ?? undefined,
        pinnedPosition: dto.pinnedPosition ?? false,
        deletedAt:      dto.deletedAt      ?? undefined,
    };
}

function mapInfo(dto: any): WikiInfo {
    return {
        id:         dto.id,
        title:      dto.title,
        content:    dto.content,
        keywordIds: dto.keywordIds ?? [],
        createdAt:  dto.createdAt,
        updatedAt:  dto.updatedAt,
        deletedAt:  dto.deletedAt ?? undefined,
    };
}

// ─── Service ──────────────────────────────────────────────────────────────────

const _getAll = async (): Promise<{ keywords: WikiKeyword[]; infos: WikiInfo[] }> => {
    const res = await apiFetch(BASE());
    if (!res.ok) throw new Error(`API error ${res.status}`);
    const json = await res.json();
    return {
        keywords: (json.object?.keywords ?? []).map(mapKeyword),
        infos:    (json.object?.infos    ?? []).map(mapInfo),
    };
};

const _createKeyword = async (name: string, synonyms: string[]): Promise<WikiKeyword> => {
    const res = await apiFetch(`${BASE()}/keywords`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, synonyms }),
    });
    if (!res.ok) throw new Error(`API error ${res.status}`);
    const json = await res.json();
    return mapKeyword(json.object);
};

const _upsertInfo = async (
    info: Partial<WikiInfo> & { title: string; content: string; keywordIds?: number[] }
): Promise<WikiInfo> => {
    const res = await apiFetch(`${BASE()}/infos`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            id:           info.id      ?? null,
            title:        info.title,
            content:      info.content,
            keywordIds:   info.keywordIds ?? null,
            skipAutoLink: true,
        }),
    });
    if (!res.ok) throw new Error(`API error ${res.status}`);
    const json = await res.json();
    return mapInfo(json.object);
};

const _deleteInfo = async (id: number): Promise<void> => {
    const res = await apiFetch(`${BASE()}/infos/${id}`, { method: "DELETE" });
    if (!res.ok) throw new Error(`API error ${res.status}`);
};

const _restoreInfo = async (id: number): Promise<void> => {
    const res = await apiFetch(`${BASE()}/infos/${id}/restore`, { method: "POST" });
    if (!res.ok) throw new Error(`API error ${res.status}`);
};

const _savePinnedPosition = async (keywordId: number, x: number, y: number): Promise<void> => {
    const res = await apiFetch(`${BASE()}/keywords/${keywordId}/position`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ x, y }),
    });
    if (!res.ok) throw new Error(`API error ${res.status}`);
};

const _updateKeyword = async (id: number, patch: { name?: string; icon?: string; synonyms?: string[]; addInfoIds?: number[]; removeInfoIds?: number[] }): Promise<void> => {
    const res = await apiFetch(`${BASE()}/keywords/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            name:          patch.name          ?? null,
            iconBase64:    patch.icon          ?? null,
            ...(patch.synonyms !== undefined ? { synonyms: patch.synonyms } : {}),
            addInfoIds:    patch.addInfoIds    ?? null,
            removeInfoIds: patch.removeInfoIds ?? null,
            skipAutoLink:  true,
        }),
    });
    if (!res.ok) throw new Error(`API error ${res.status}`);
};

const _deleteKeyword = async (id: number): Promise<void> => {
    const res = await apiFetch(`${BASE()}/keywords/${id}`, { method: "DELETE" });
    if (!res.ok) throw new Error(`API error ${res.status}`);
};


const _rescanAll = async (): Promise<{ count: number }> => {
    const res = await apiFetch(`${BASE()}/rescan`, { method: "POST" });
    if (!res.ok) throw new Error(`API error ${res.status}`);
    const json = await res.json();
    return { count: json.object as number };
};

const _interact = async (keywordId: number, type: "view" | "read" | "edit"): Promise<void> => {
    const res = await apiFetch(`${BASE()}/keywords/${keywordId}/interact/${type}`, { method: "POST" });
    if (!res.ok) throw new Error(`API error ${res.status}`);
};

export const wikiService = {
    getAll:             _getAll,
    createKeyword:      _createKeyword,
    deleteKeyword:      _deleteKeyword,
    upsertInfo:         _upsertInfo,
    deleteInfo:         _deleteInfo,
    restoreInfo:        _restoreInfo,
    savePinnedPosition: _savePinnedPosition,
    updateKeyword:      _updateKeyword,
    interact:           _interact,
    rescanAll:          _rescanAll,
};
