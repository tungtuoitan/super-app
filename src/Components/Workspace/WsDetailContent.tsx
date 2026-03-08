/**
 * Workspace Detail Dialog Content Component
 * Modern card-based layout for workspace editing
 */

import React, { useEffect } from "react";
import { GenericTextField, GenericAutoComplete, IAutoCompleteOptions } from "@/shared/components";
import { Card, CardContent, CardHeader, CardTitle } from "@/Components/ui/card";
import { Textarea } from "@/Components/ui/textarea";
import { ScrollArea } from "@/Components/ui/scroll-area";
import { Briefcase, FileText, Calendar } from "lucide-react";
import { useWsDetailStore } from "@/store/ws/useWsDetail.store";
import { useWsDetailHelper } from "@/hooks/ws/useWsDetail.helper";
import { Ws } from "@/types/workspace.types";
import { constants } from "@/utils/constants";
import { useEditorTabHelper } from "@/hooks/vsCode/useEditorTab.helper";
import { useEditorTabsStore } from "@/store/editor/EditorTab.store";

/**
 * Workspace Detail Dialog Content
 * Form for editing workspace details
 */
export function WsDetailContent() {
    const { wsNameRef, shouldFocusWsName, setShouldFocusWsName, nameError, setNameError } = useWsDetailStore();
    const { handleWsFieldChange } = useWsDetailHelper();
    const { getActiveTab } = useEditorTabHelper();

    // Get active tab
    const activeTab = getActiveTab();
    const selectedWs = activeTab?.data as Ws | undefined;

    const [wsKey, setWsKey] = React.useState(0);
    useEffect(() => {
        if (selectedWs) {
            setWsKey((prev) => prev + 1);
            setNameError(""); // Reset error khi chuyển workspace
        }
    }, [selectedWs?.id]);

    // Focus vào Workspace Name field khi tạo workspace mới
    useEffect(() => {
        if (shouldFocusWsName && wsNameRef.current) {
            setTimeout(() => {
                wsNameRef.current?.focus();
                setShouldFocusWsName(false); // Reset flag sau khi focus
            }, 100);
        }
    }, [shouldFocusWsName, wsNameRef]);

    // Check if workspace is inactive (soft deleted)
    const isDeleted = selectedWs?.deletedAt !== null;
    const isHardDeleted = activeTab?.data && (activeTab.data as Ws).isHardDeleted;

    // Create current active value for autocomplete
    const currentActiveValue: IAutoCompleteOptions | null = isDeleted
        ? constants.standardRegistryFE.activeStatusOptions.find((option) => option.code === constants.standardRegistryFE.activeStatus.inactive) || null
        : constants.standardRegistryFE.activeStatusOptions.find((option) => option.code === constants.standardRegistryFE.activeStatus.active) || null;

    // Handlers for form interactions
    const handleFieldChange = (field: keyof Ws, value: any) => {
        handleWsFieldChange(field, value);
    };

    const handleActiveChange = (event: React.SyntheticEvent, newValue: IAutoCompleteOptions | null) => {
        const isActiveSelected = newValue?.code === constants.standardRegistryFE.activeStatus.active;
        const newDeletedAt = isActiveSelected ? null : new Date();
        handleWsFieldChange('deletedAt', newDeletedAt);
    };

    if (!selectedWs) {
        return (
            <div className="flex items-center justify-center h-full text-muted-foreground">
                <p>No workspace selected</p>
            </div>
        );
    }

    // Format date for display
    const formatDate = (date: Date | null | undefined): string => {
        if (!date) return "N/A";
        return new Intl.DateTimeFormat("en-US", {
            year: "numeric",
            month: "short",
            day: "numeric",
            hour: "2-digit",
            minute: "2-digit",
        }).format(date);
    };

    return (
        <ScrollArea className="h-full w-full">
            <div className="p-6 space-y-6 max-w-4xl mx-auto">
                {/* Header Card */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Briefcase className="h-5 w-5" />
                            Workspace Details
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        {/* Active Status */}
                        <GenericAutoComplete
                            value={currentActiveValue}
                            onChange={handleActiveChange}
                            allOptions={constants.standardRegistryFE.activeStatusOptions as unknown as IAutoCompleteOptions[]}
                            inputProps={{
                                name: "activeStatus",
                                label: "Status",
                            }}
                            size="small"
                            disabled={isDeleted || isHardDeleted}
                        />

                        {/* Workspace Name with ID */}
                        <div className="flex gap-4 items-start">
                            {/* Workspace ID - fixed width */}
                            <div className="w-[80px] shrink-0">
                                <GenericTextField label="ID" value={selectedWs.id > 0 ? selectedWs.id.toString() : "New"} disabled size="small" />
                            </div>

                            <div className="flex-1">
                                <GenericTextField
                                    ref={wsNameRef}
                                    label="Workspace Name"
                                    value={selectedWs.name}
                                    onChange={(e) => {
                                        handleFieldChange("name", e.target.value);
                                        if (e.target.value && e.target.value.trim() !== "")
                                            setNameError("");
                                        else 
                                            setNameError("Workspace Name is required");
                                    }}
                                    placeholder="Enter workspace name..."
                                    size="small"
                                    disabled={isDeleted || isHardDeleted}
                                    error={!!nameError}
                                    helperText={nameError}
                                />
                            </div>
                        </div>

                        {/* Description */}
                        <div className="space-y-2">
                            <label className="text-sm font-medium flex items-center gap-2">
                                <FileText className="h-4 w-4" />
                                Description
                            </label>
                            <Textarea
                                key={`description-${wsKey}`}
                                value={selectedWs.description || ""}
                                onChange={(e) => handleFieldChange("description", e.target.value)}
                                placeholder="Enter workspace description..."
                                className="min-h-[120px] resize-none"
                                disabled={isDeleted || isHardDeleted}
                            />
                        </div>
                    </CardContent>
                </Card>

                {/* Metadata Card */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Calendar className="h-5 w-5" />
                            Metadata
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                        {selectedWs.userId && <GenericTextField label="User ID" value={selectedWs.userId.toString()} disabled size="small" />}

                        <p className="text-xs text-left text-muted-foreground leading-relaxed">
                            Created: {formatDate(selectedWs.createdAt)}
                            {selectedWs.updatedAt && <> · Updated: {formatDate(selectedWs.updatedAt)}</>}
                            {selectedWs.deletedAt && <> · Deleted: {formatDate(selectedWs.deletedAt)}</>}
                        </p>
                    </CardContent>
                </Card>
            </div>
        </ScrollArea>
    );
}
