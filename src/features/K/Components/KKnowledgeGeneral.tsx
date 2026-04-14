/**
 * KKnowledgeGeneral - Form to create/edit a knowledge base
 * Fields: name, description, image (TrackIconPicker-style)
 */

import { useCallback } from "react";
import { Label } from "@/shared/components/ui/label";
import { Input } from "@/shared/components/ui/input";
import { Button } from "@/shared/components/ui/Button";
import { useEditorTabsStore } from "@/store/index";
import { useKLoader } from "../hooks";
import { useKStore } from "../store/K.store";
import type { KWsResponse } from "../types/K.types";
import { TrackIconPicker } from "@/features/lifeLog/Components/TrackIconPicker";

interface KKnowledgeGeneralProps {
    knowledgeId: number;
    tabId: string;
}

export function KKnowledgeGeneral({ knowledgeId, tabId }: KKnowledgeGeneralProps) {
    const { openTabs, setOpenTabs } = useEditorTabsStore();
    const { createKnowledge, updateKnowledge } = useKLoader();
    const { setSelectedKId } = useKStore();

    const tab = openTabs.find((t) => t.id === tabId);
    const knowledge = tab?.data as KWsResponse | undefined;

    const handleFieldChange = useCallback(
        <K extends keyof KWsResponse>(field: K, value: KWsResponse[K]) => {
            setOpenTabs((prev) =>
                prev.map((t) =>
                    t.id === tabId
                        ? {
                              ...t,
                              data: { ...(t.data as KWsResponse), [field]: value },
                              title: field === "name" ? (value as string) || "Knowledge" : t.title,
                              hasUnsavedChanges: true,
                          }
                        : t,
                ),
            );
        },
        [tabId, setOpenTabs],
    );

    const handleSave = useCallback(async () => {
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
                // Replace temp tab data with the real created entity (keep same tab id)
                setOpenTabs((prev) =>
                    prev.map((t) =>
                        t.id === tabId
                            ? {
                                  ...t,
                                  data: created,
                                  data0: created,
                                  title: created.name,
                                  hasUnsavedChanges: false,
                              }
                            : t,
                    ),
                );
                setSelectedKId(created.id);
            }
        } else {
            await updateKnowledge(knowledge.id, payload);
            setOpenTabs((prev) =>
                prev.map((t) => (t.id === tabId ? { ...t, data0: t.data, hasUnsavedChanges: false } : t)),
            );
        }
    }, [knowledge, tabId, createKnowledge, updateKnowledge, setOpenTabs, setSelectedKId]);

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
