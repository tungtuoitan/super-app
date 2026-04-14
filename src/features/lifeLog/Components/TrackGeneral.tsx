/**
 * TrackGeneral - Form to view/edit a LifeLog Track's fields
 */

import { useCallback, useRef, useEffect } from "react";
import { Label } from "@/Components/ui/label";
import { Input } from "@/Components/ui/input";
import { Checkbox } from "@/Components/ui/checkbox";
import { useEditorTabsStore } from "@/store/index";
import { useLifeLogTrackHelper } from "../hooks/useLifeLogTrack.helper";
import type { LifeLogTrack } from "@/types/lifeLog.types";
import { TrackIconPicker } from "./TrackIconPicker";
import { TRACK_COLORS } from "./trackColors";
import { Check, ChevronDown } from "lucide-react";
import { useState } from "react";

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

    const handleFieldChange = useCallback(
        <K extends keyof LifeLogTrack>(field: K, value: LifeLogTrack[K]) => {
            setOpenTabs((prev) =>
                prev.map((t) =>
                    t.id === tabId
                        ? { ...t, data: { ...(t.data as LifeLogTrack), [field]: value }, title: field === "name" ? (value as string) || "Track" : t.title, hasUnsavedChanges: true }
                        : t,
                ),
            );
        },
        [tabId, setOpenTabs],
    );

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
        setOpenTabs((prev) => prev.map((t) => (t.id === tabId ? { ...t, data0: t.data, hasUnsavedChanges: false } : t)));
    }, [track, tabId, upsertTrack, setOpenTabs]);

    if (!track) return null;

    const selectedColor = TRACK_COLORS.find((c) => c.hex === track.color) ?? TRACK_COLORS[0];

    return (
        <div className="flex flex-col gap-0 p-4 max-w-xl">
            {/* Colored accent bar */}
            <div className="h-1 rounded-full mb-4" style={{ backgroundColor: selectedColor.hex }} />

            {/* Track Name */}
            <div className="mb-4">
                <Label className="text-[10px] text-left text-left uppercase tracking-widest text-muted-foreground mb-1.5 block">Track Name *</Label>
                <Input value={track.name} onChange={(e) => handleFieldChange("name", e.target.value)} placeholder="Track name" autoFocus={track.id === 0} className="font-medium" />
            </div>

            {/* <div className="border-t border-border/50 my-1" /> */}
        
            {/* Description */}
            <div className="my-4">
                <Label className="text-[10px] text-left uppercase tracking-widest text-muted-foreground mb-1.5 block">Description</Label>
                <textarea
                    value={track.description ?? ""}
                    onChange={(e) => handleFieldChange("description", e.target.value)}
                    placeholder="Short description..."
                    rows={6}
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm resize-none focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring placeholder:text-muted-foreground"
                />
            </div>

            {/* <div className="border-t border-border/50 my-1" /> */}

            {/* Icon + Color row */}
            <div className="grid grid-cols-2 gap-3 my-4">
                <div>
                    <Label className="text-[10px] text-left uppercase tracking-widest text-muted-foreground mb-1.5 block">Icon</Label>
                    <TrackIconPicker value={track.emoji ?? ""} onChange={(v) => handleFieldChange("emoji", v || undefined)} trackColor={track.color} />
                </div>
                <div className="">
                    <div>
                        <Label className="text-[10px] text-left uppercase tracking-widest text-muted-foreground mb-1.5 block">Color</Label>
                        <div ref={colorRef} className="relative">
                            <button
                                type="button"
                                onClick={() => setColorOpen((v) => !v)}
                                className="w-full flex items-center gap-2 px-3 py-2 rounded-md border border-border bg-background hover:bg-muted/30 transition-colors text-left"
                            >
                                <span className="w-3.5 h-3.5 rounded-full flex-shrink-0 ring-1 ring-black/10" style={{ backgroundColor: selectedColor.hex }} />
                                <span className="flex-1 text-sm truncate">{selectedColor.name}</span>
                                <ChevronDown className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
                            </button>
                            {colorOpen && (
                                <div className="absolute top-full left-0 right-0 mt-1 z-50 rounded-md border border-border bg-popover shadow-lg overflow-hidden">
                                    {TRACK_COLORS.map((c) => (
                                        <button
                                            key={c.hex}
                                            type="button"
                                            onClick={() => {
                                                handleFieldChange("color", c.hex);
                                                setColorOpen(false);
                                            }}
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
                    <div className="flex items-center gap-2 mt-3 ml-1">
                        <Checkbox id="sensitive-track" checked={track.isSensitive} onCheckedChange={(v) => handleFieldChange("isSensitive", !!v)} />
                        <Label htmlFor="sensitive-track" className="text-xs text-muted-foreground cursor-pointer">
                            Sensitive
                        </Label>
                    </div>
                </div>
            </div>
        </div>
    );
}
