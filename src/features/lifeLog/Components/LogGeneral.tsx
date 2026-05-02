/**
 * LogGeneral - Form to view/edit a log entry's fields
 */


import { Checkbox, Input, Label, Select, SelectContent, SelectItem, SelectTrigger, SelectValue, Textarea } from "@/shared";
import { useLifeLogStore } from "../store/useLifeLog.store";
import { LOG_TYPES, LOG_TYPE_CONFIG, type LifeLogLog, type LogType } from "@/features/lifeLog/types/lifeLog.types";
import { format } from "date-fns";
import { LogTypeIcon } from "./LogTypeIcon";
import { TrackIconDisplay } from "./TrackIconDisplay";
import { SingleDatePicker } from "./SingleDatePicker";
import { useEditorTabBarHelper } from "@/shell";

interface LogGeneralProps {
    logId: number;
    tabId: string;
}

export function LogGeneral({ logId, tabId }: LogGeneralProps) {
    const { getActiveTab, patchTab } = useEditorTabBarHelper();
    const { tracks } = useLifeLogStore();

    const tab = getActiveTab(tabId);
    const log = tab?.data as LifeLogLog | undefined;

    const handleFieldChange = <K extends keyof LifeLogLog>(field: K, value: LifeLogLog[K]) => {
        patchTab(tabId, (cur) => ({
            data: { ...(cur.data as LifeLogLog), [field]: value },
            hasUnsavedChanges: true,
        }));
    }

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
