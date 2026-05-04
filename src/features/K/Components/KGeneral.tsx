/**
 * KGeneral - Form to create/edit a knowledge base
 * Fields: name, description, image (TrackIconPicker-style)
 */


import { Label } from "@/shared";
import { Input } from "@/shared";
import { Button } from "@/shared";
import { useKStore } from "../store/useK.store";
import type { KWsResponse } from "../types/k.type";
import { TrackIconPicker } from "@/features/lifeLog";
import {useKLoader} from "../hooks/kTree/useK.loader";
import { useEditorTabBarHelper } from "@/shell";

interface KKnowledgeGeneralProps {
    knowledgeId: number;
    tabId: string;
}

export function KGeneral({ knowledgeId, tabId }: KKnowledgeGeneralProps) {
    const { patchTab, getActiveTab } = useEditorTabBarHelper();
    const { createKnowledge, updateKnowledge } = useKLoader();
    const { setSelectedKId } = useKStore();

    const tab = getActiveTab(tabId);
    const knowledge = tab?.data as KWsResponse | undefined;

    const handleFieldChange = <K extends keyof KWsResponse>(field: K, value: KWsResponse[K]) => {
        patchTab(tabId, (cur) => ({
            data: { ...(cur.data as KWsResponse), [field]: value },
            title: field === "name" ? (value as string) || "Knowledge" : cur.title,
            hasUnsavedChanges: true,
        }));
    };

    const handleSave = async () => {
        if (!knowledge) return;
        const isNew = knowledge.id < 0;
        const payload = {
            name: knowledge.name,
            description: knowledge.description,
            imageBase64: knowledge.imageBase64,
        };

        if (isNew) {
            const created = await createKnowledge(payload);
            if (created) {
                patchTab(tabId, { data: created, data0: created, title: created.name, hasUnsavedChanges: false });
                setSelectedKId(created.id);
            }
        } else {
            await updateKnowledge(knowledge.id, payload);
            patchTab(tabId, (cur) => ({ data0: cur.data, hasUnsavedChanges: false }));
        }
    };

    if (!knowledge) return null;

    return (
        <div className="flex flex-col gap-0 p-4 w-full">
            {/* Accent bar */}
            <div className="h-1 rounded-full mb-4 bg-primary/40" />

            {/* Name */}
            <div className="mb-4">
                <Label className="text-[10px] text-left uppercase tracking-widest text-muted-foreground mb-1.5 block">
                    Knowledge Name *
                </Label>
                <Input
                    value={knowledge.name}
                    onChange={(e) => handleFieldChange("name", e.target.value)}
                    placeholder="Knowledge name"
                    autoFocus={knowledge.id < 0}
                    className="font-medium"
                />
            </div>

            {/* Description */}
            <div className="mb-4">
                <Label className="text-[10px] text-left uppercase tracking-widest text-muted-foreground mb-1.5 block">
                    Description
                </Label>
                <textarea
                    value={knowledge.description ?? ""}
                    onChange={(e) => handleFieldChange("description", e.target.value)}
                    placeholder="Short description..."
                    rows={12}
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm resize-none focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring placeholder:text-muted-foreground"
                />
            </div>

            {/* Image */}
            <div className="mb-6">
                <Label className="text-[10px] text-left uppercase tracking-widest text-muted-foreground mb-1.5 block">
                    Image
                </Label>
                <TrackIconPicker
                    value={knowledge.imageBase64 ?? ""}
                    onChange={(v) => handleFieldChange("imageBase64", v || undefined)}
                />
            </div>

            {/* Save */}
            <Button onClick={handleSave} disabled={!knowledge.name.trim()} className="self-start">
                {knowledge.id < 0 ? "Create" : "Save"}
            </Button>
        </div>
    );
}
