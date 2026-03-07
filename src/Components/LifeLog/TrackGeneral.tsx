/**
 * TrackGeneral - Form to view/edit a LifeLog Track's fields
 */

import { useCallback, useRef, useEffect } from "react";
import { Label } from "@/Components/ui/label";
import { Input } from "@/Components/ui/input";
import { Checkbox } from "@/Components/ui/checkbox";
import { useEditorTabsStore } from "@/store/index";
import { useLifeLogTrackHelper } from "@/hooks/lifeLog/useLifeLogTrack.helper";
import type { LifeLogTrack } from "@/types/lifeLog.types";
import { TrackIconPicker } from "./TrackIconPicker";
import { TRACK_COLORS } from "./trackColors";
import { Check, ChevronDown } from "lucide-react";
import { useState } from "react";
import { useMobileStore } from "@/store/mobile/Mobile.store";

interface TrackGeneralProps {
    trackId: number;
    tabId: string;
}

export function TrackGeneral({ trackId, tabId }: TrackGeneralProps) {
    const { openTabs, setOpenTabs } = useEditorTabsStore();
    const { upsertTrack } = useLifeLogTrackHelper();
    const [colorOpen, setColorOpen] = useState(false);
    const colorRef = useRef<HTMLDivElement>(null);

    const tab = openTabs.find((t) => t.id === tabId);
    const track = tab?.data as LifeLogTrack | undefined;

    useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (colorRef.current && !colorRef.current.contains(e.target as Node)) setColorOpen(false);
        };
        document.addEventListener("mousedown", handler);
        return () => document.removeEventListener("mousedown", handler);
    }, []);

    const handleFieldChange = useCallback(<K extends keyof LifeLogTrack>(field: K, value: LifeLogTrack[K]) => {
        setOpenTabs((prev) =>
            prev.map((t) =>
                t.id === tabId
                    ? { ...t, data: { ...(t.data as LifeLogTrack), [field]: value }, title: field === "name" ? (value as string) || "Track" : t.title, hasUnsavedChanges: true }
                    : t
            )
        );
    }, [tabId, setOpenTabs]);

    const handleSave = useCallback(async () => {
        if (!track) return;
        await upsertTrack({
            id: track.id,
            name: track.name,
            description: track.description,
            emoji: track.emoji,
            color: track.color,
            isSensitive: track.isSensitive,
        });
        setOpenTabs((prev) =>
            prev.map((t) => t.id === tabId ? { ...t, data0: t.data, hasUnsavedChanges: false } : t)
        );
    }, [track, tabId, upsertTrack, setOpenTabs]);

    if (!track) return null;

    const selectedColor = TRACK_COLORS.find((c) => c.hex === track.color) ?? TRACK_COLORS[0];

    return (
        <div className="flex flex-col gap-4 p-4 max-w-xl">
            {/* Preview */}
            {/* <div className="flex items-center gap-3">
                <TrackIconDisplay value={track.emoji} trackColor={track.color} size="lg" />
                <span className="text-sm font-medium text-muted-foreground">{track.name || "New Track"}</span>
            </div> */}

            {/* Name */}
            <div>
                <Label className="text-xs text-left text-muted-foreground mb-1 block">Name *</Label>
                <Input
                    value={track.name}
                    onChange={(e) => handleFieldChange("name", e.target.value)}
                    placeholder="Track name"
                    autoFocus={track.id === 0}
                />
            </div>

            {/* Description */}
            <div>
                <Label className="text-xs text-left text-muted-foreground mb-1 block">Description</Label>
                <textarea
                    value={track.description ?? ""}
                    onChange={(e) => handleFieldChange("description", e.target.value)}
                    placeholder="Short description..."
                    rows={2}
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm resize-none focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring placeholder:text-muted-foreground"
                />
            </div>


            {/* Icon */}
            <div>
                <Label className="text-xs text-left text-muted-foreground mb-1 block">Icon</Label>
                <TrackIconPicker value={track.emoji ?? ""} onChange={(v) => handleFieldChange("emoji", v || undefined)} trackColor={track.color} />
            </div>
            {/* Color */}
            <div>
                <Label className="text-xs text-left text-muted-foreground mb-1 block">Color</Label>
                <div ref={colorRef} className="relative">
                    <button
                        type="button"
                        onClick={() => setColorOpen((v) => !v)}
                        className="w-full flex items-center gap-2.5 px-3 py-2 rounded-md border border-border bg-background hover:bg-muted/30 transition-colors text-left"
                    >
                        <span className="w-4 h-4 rounded-full flex-shrink-0 ring-1 ring-black/10" style={{ backgroundColor: selectedColor.hex }} />
                        <span className="flex-1 text-sm">{selectedColor.name}</span>
                        <span className="text-xs text-muted-foreground font-mono">{selectedColor.hex}</span>
                        <ChevronDown className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
                    </button>
                    {colorOpen && (
                        <div className="absolute top-full left-0 right-0 mt-1 z-50 rounded-md border border-border bg-popover shadow-lg overflow-hidden">
                            {TRACK_COLORS.map((c) => (
                                <button
                                    key={c.hex}
                                    type="button"
                                    onClick={() => { handleFieldChange("color", c.hex); setColorOpen(false); }}
                                    className="w-full flex items-center gap-2.5 px-3 py-2 hover:bg-muted/30 transition-colors text-left"
                                >
                                    <span className="w-4 h-4 rounded-full flex-shrink-0 ring-1 ring-black/10" style={{ backgroundColor: c.hex }} />
                                    <span className="flex-1 text-sm text-foreground">{c.name}</span>
                                    <span className="text-xs text-muted-foreground font-mono">{c.hex}</span>
                                    {track.color === c.hex && <Check className="w-3.5 h-3.5 text-foreground flex-shrink-0" />}
                                </button>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* Sensitive */}
            <div className="flex items-center gap-2">
                <Checkbox
                    id="sensitive-track"
                    checked={track.isSensitive}
                    onCheckedChange={(v) => handleFieldChange("isSensitive", !!v)}
                />
                <Label htmlFor="sensitive-track" className="text-xs text-muted-foreground cursor-pointer">Sensitive</Label>
            </div>
        </div>
    );
}
