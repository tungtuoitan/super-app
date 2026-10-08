/**
 * TrackGeneral - Form to view/edit a LifeLog Track's fields
 */

import { useRef, useEffect } from "react";
import { Label } from "@/shared";
import { Input } from "@/shared";
import { Textarea } from "@/shared";
import { Checkbox } from "@/shared";
import { useLifeLogTrackHelper } from "../hooks/useLifeLogTrack.helper";
import type { LifeLogTrack } from "@/features/lifeLog/types/lifeLog.types";
import { TrackIconPicker } from "./TrackIconPicker";
import { TRACK_COLORS } from "./trackColors";
import { Check, ChevronDown } from "lucide-react";
import { useState } from "react";
import { useEditorTabBarHelper } from "@/shell";

interface TrackGeneralProps {
    trackId: number;
    tabId: string;
}

export function TrackGeneral({ trackId, tabId }: TrackGeneralProps) {
    const { getActiveTab, patchTab } = useEditorTabBarHelper();
    const { upsertTrack } = useLifeLogTrackHelper();
    const [colorOpen, setColorOpen] = useState(false);
    const colorRef = useRef<HTMLDivElement>(null);

    const tab = getActiveTab(tabId);
    const track = tab?.data as LifeLogTrack | undefined;

    useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (colorRef.current && !colorRef.current.contains(e.target as Node)) setColorOpen(false);
        };
        document.addEventListener("mousedown", handler);
        return () => document.removeEventListener("mousedown", handler);
    }, []);

    const handleFieldChange = <K extends keyof LifeLogTrack>(field: K, value: LifeLogTrack[K]) => {
        patchTab(tabId, {
            data: { ...(track as LifeLogTrack), [field]: value },
            ...(field === "name" ? { title: (value as string) || "Track" } : {}),
            hasUnsavedChanges: true,
        });
    };

    if (!track) return null;

    const selectedColor = TRACK_COLORS.find((c) => c.hex === track.color) ?? TRACK_COLORS[0];

    return (
        <div className="flex flex-col gap-0 p-4 max-w-xl">
            {/* Colored accent bar */}
            <div className="h-1 rounded-full mb-4" style={{ backgroundColor: selectedColor.hex }} />

            {/* Track Name */}
            <div className="mb-4">
                <Label className="text-[11px] font-medium text-left uppercase tracking-wide text-muted-foreground mb-1.5 block">Track Name *</Label>
                <Input value={track.name} onChange={(e) => handleFieldChange("name", e.target.value)} placeholder="Track name" autoFocus={track.id === 0} className="text-sm" />
            </div>

            {/* <div className="border-t border-border/50 my-1" /> */}
        
            {/* Description */}
            <div className="my-4">
                <Label className="text-[11px] font-medium text-left uppercase tracking-wide text-muted-foreground mb-1.5 block">Description</Label>
                <Textarea
                    value={track.description ?? ""}
                    onChange={(e) => handleFieldChange("description", e.target.value)}
                    placeholder="Short description..."
                    rows={6}
                    className="resize-none"
                />
            </div>

            {/* <div className="border-t border-border/50 my-1" /> */}

            {/* Icon + Color row */}
            <div className="grid grid-cols-2 gap-3 my-4">
                <div>
                    <Label className="text-[11px] font-medium text-left uppercase tracking-wide text-muted-foreground mb-1.5 block">Icon</Label>
                    <TrackIconPicker value={track.emoji ?? ""} onChange={(v) => handleFieldChange("emoji", v || undefined)} trackColor={track.color} />
                </div>
                <div className="">
                    <div>
                        <Label className="text-[11px] font-medium text-left uppercase tracking-wide text-muted-foreground mb-1.5 block">Color</Label>
                        <div ref={colorRef} className="relative">
                            <button
                                type="button"
                                onClick={() => setColorOpen((v) => !v)}
                                className="w-full flex items-center gap-2 px-3 h-9 rounded-lg border border-sa-border-strong bg-background hover:bg-sa-hover transition-colors duration-100 text-left"
                            >
                                <span className="w-3.5 h-3.5 rounded-full flex-shrink-0 ring-1 ring-sa-border-strong" style={{ backgroundColor: selectedColor.hex }} />
                                <span className="flex-1 text-sm truncate">{selectedColor.name}</span>
                                <ChevronDown className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
                            </button>
                            {colorOpen && (
                                <div className="absolute top-full left-0 right-0 mt-1 z-50 rounded-lg border border-sa-border bg-popover sa-shadow-pop overflow-hidden p-1">
                                    {TRACK_COLORS.map((c) => (
                                        <button
                                            key={c.hex}
                                            type="button"
                                            onClick={() => {
                                                handleFieldChange("color", c.hex);
                                                setColorOpen(false);
                                            }}
                                            className="w-full flex items-center gap-2.5 px-2 h-8 rounded-md hover:bg-sa-hover-strong transition-colors duration-100 text-left"
                                        >
                                            <span className="w-4 h-4 rounded-full flex-shrink-0 ring-1 ring-sa-border-strong" style={{ backgroundColor: c.hex }} />
                                            <span className="flex-1 text-[13px] text-foreground">{c.name}</span>
                                            <span className="text-[11px] text-muted-foreground font-mono">{c.hex}</span>
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
                        <Label htmlFor="sensitive-track" className="text-[13px] text-muted-foreground cursor-pointer">
                            Sensitive
                        </Label>
                    </div>
                </div>
            </div>
        </div>
    );
}
