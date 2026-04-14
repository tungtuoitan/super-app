/**
 * LogGeneral - Form to view/edit a log entry's fields
 */

import { useCallback } from "react";
import { Label } from "@/Components/ui/label";
import { Input } from "@/Components/ui/input";
import { Textarea } from "@/Components/ui/textarea";
import { Checkbox } from "@/Components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/Components/ui/select";
import { useEditorTabsStore } from "@/store/index";
import { useLifeLogStore } from "../store/useLifeLog.store";
import { LOG_TYPES, LOG_TYPE_CONFIG, type LifeLogLog, type LogType } from "@/types/lifeLog.types";
import { format } from "date-fns";
import { LogTypeIcon } from "./LogTypeIcon";
import { TrackIconDisplay } from "./TrackIconDisplay";
import { SingleDatePicker } from "./SingleDatePicker";

interface LogGeneralProps {
    logId: number;
    tabId: string;
}

export function LogGeneral({ logId, tabId }: LogGeneralProps) {
    const { openTabs, setOpenTabs } = useEditorTabsStore();
    const { tracks } = useLifeLogStore();

    const tab = openTabs.find((t) => t.id === tabId);
    const log = tab?.data as LifeLogLog | undefined;

    const handleFieldChange = useCallback(<K extends keyof LifeLogLog>(field: K, value: LifeLogLog[K]) => {
        setOpenTabs((prev) =>
            prev.map((t) =>
                t.id === tabId
                    ? { ...t, data: { ...t.data as LifeLogLog, [field]: value }, hasUnsavedChanges: true }
                    : t
            )
        );
    }, [tabId, setOpenTabs]);

    if (!log) return null;

    const isTrack = !!log.trackId;
    const logTypes = LOG_TYPES.filter((t) => t !== "track");
    const track = isTrack ? tracks.find((t) => t.id === log.trackId) : undefined;

    return (
        <div className="flex flex-col gap-4 p-4 max-w-xl">
            {/* Icon header */}
            {
                isTrack ? <>
                <Label className="text-xs text-left text-muted-foreground block mb-[-4px]">Track Title</Label>
                <div className="flex items-center gap-3">
                    <TrackIconDisplay value={track?.emoji} trackColor={track?.color} size="lg" />
                    <span className="text-sm text-left font-medium text-muted-foreground">
                        {track?.name ?? "Track"}
                    </span>
                </div>
                </>
                :
                <div>
                    <Label className="text-xs text-left text-muted-foreground mb-1 block">Log Title</Label>
                    <Input
                        value={log.title ?? ""}
                        onChange={(e) => handleFieldChange("title", e.target.value)}
                        placeholder="What happened?"
                        disabled={isTrack}
                    />
                </div>
            }

            {/* Type — hidden for track logs */}
            {!isTrack && (
                <div>
                    <Label className="text-xs text-left text-muted-foreground mb-1 block">Type</Label>
                    <Select value={log.type} onValueChange={(v) => handleFieldChange("type", v as LogType)}>
                        <SelectTrigger className="w-48">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            {logTypes.map((t) => (
                                <SelectItem key={t} value={t}>
                                    <span className="flex items-center gap-2">
                                        <LogTypeIcon type={t} className="w-3.5 h-3.5" />
                                        {LOG_TYPE_CONFIG[t].label}
                                    </span>
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
            )}

        
            <div className="flex justify-between">
                {/* Occur At */}
                <div className="w-full">
                    <Label className="text-xs text-left text-muted-foreground mb-1 block">When</Label>
                    <SingleDatePicker
                        value={log.occurAt ?? log.createdAt}
                        onChange={(d) => handleFieldChange("occurAt", d ?? log.createdAt)}
                        placeholder="Select date"
                        maxDate={new Date()}
                        className="w-[90%]"
                    />
                </div>

                {/* Sensitive */}
                <div className="flex items-center gap-2 mt-[18px] relative left-[-16px]">
                    <Checkbox
                        id="sensitive-edit"
                        checked={log.isSensitive}
                        onCheckedChange={(v: boolean) => handleFieldChange("isSensitive", !!v)}
                    />
                    <Label htmlFor="sensitive-edit" className="text-sm cursor-pointer">Sensitive</Label>
                </div>
            </div>

            {/* Description */}
            <div>
                <Label className="text-xs text-left text-muted-foreground mb-1 block">Description</Label>
                <Textarea
                    value={log.description ?? ""}
                    onChange={(e) => handleFieldChange("description", e.target.value)}
                    placeholder="Details, thoughts, context..."
                    className="min-h-[120px] resize-none"
                    rows={9}
                />
            </div>

            {/* Metadata */}
            <div className="text-xs text-left text-muted-foreground space-y-1">
                <div >Created: {format(log.createdAt, "dd/MM/yyyy HH:mm")}</div>
                {log.location && <div>Location: {log.location}</div>}
            </div>
        </div>
    );
}
