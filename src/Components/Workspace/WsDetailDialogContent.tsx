/**
 * Workspace Detail Dialog Content Component
 * Modern card-based layout for workspace editing
 */

import React, { useEffect } from 'react';
import { GenericTextField, GenericAutoComplete, IAutoCompleteOptions } from '@/shared/components';
import { Card, CardContent, CardHeader, CardTitle } from '@/Components/ui/card';
import { Textarea } from '@/Components/ui/textarea';
import { ScrollArea } from '@/Components/ui/scroll-area';
import { Briefcase, FileText, Calendar } from 'lucide-react';
import { useWsUIStore } from '@/store/ws/useWsUI.store';
import { useWsUIHelper } from '@/hooks/useWsUI.helper';
import { Ws } from '@/store/ws/useWsList.store';
import { constants } from '@/utils/constants';

/**
 * Workspace Detail Dialog Content
 * Form for editing workspace details
 */
export function WsDetailDialogContent() {
    const { selectedWorkspace } = useWsUIStore();
    const { updateSelectedWorkspace } = useWsUIHelper();
    
    const [wsKey, setWsKey] = React.useState(0);
    useEffect(() => {
        if (selectedWorkspace) {
            setWsKey(prev => prev + 1);
        }
    }, [selectedWorkspace?.id]);

    // Check if workspace is inactive (soft deleted)
    const isInactive = selectedWorkspace?.deletedAt !== null;

    // Create current active value for autocomplete
    const currentActiveValue: IAutoCompleteOptions | null = isInactive
        ? constants.activeStatusOptions.find(option => option.code === constants.activeStatus.inactive) || null
        : constants.activeStatusOptions.find(option => option.code === constants.activeStatus.active) || null;

    // Handlers for form interactions
    const handleFieldChange = (field: keyof Ws, value: any) => {
        updateSelectedWorkspace({ [field]: value });
        console.log(`Field ${String(field)} changed to:`, value);
    };

    const handleActiveChange = (event: React.SyntheticEvent, newValue: IAutoCompleteOptions | null) => {
        const isActiveSelected = newValue?.code === constants.activeStatus.active;
        const newDeletedAt = isActiveSelected ? null : new Date();
        updateSelectedWorkspace({ deletedAt: newDeletedAt });
        console.log(`Workspace ${isActiveSelected ? 'activated' : 'deactivated'}`);
    };

    if (!selectedWorkspace) {
        return (
            <div className="flex items-center justify-center h-full text-muted-foreground">
                <p>No workspace selected</p>
            </div>
        );
    }

    // Format date for display
    const formatDate = (date: Date | null | undefined): string => {
        if (!date) return 'N/A';
        return new Intl.DateTimeFormat('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
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
                            allOptions={constants.activeStatusOptions as unknown as IAutoCompleteOptions[]}
                            inputProps={{
                                name: 'activeStatus',
                                label: 'Status',
                            }}
                            size="small"
                        />

                        {/* Workspace Name */}
                        <GenericTextField
                            label="Workspace Name"
                            value={selectedWorkspace.name}
                            onChange={(e) => handleFieldChange('name', e.target.value)}
                            placeholder="Enter workspace name..."
                            size="small"
                            disabled={isInactive}
                        />

                        {/* Description */}
                        <div className="space-y-2">
                            <label className="text-sm font-medium flex items-center gap-2">
                                <FileText className="h-4 w-4" />
                                Description
                            </label>
                            <Textarea
                                key={`description-${wsKey}`}
                                value={selectedWorkspace.description || ''}
                                onChange={(e) => handleFieldChange('description', e.target.value)}
                                placeholder="Enter workspace description..."
                                className="min-h-[120px] resize-none"
                                disabled={isInactive}
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
                        <GenericTextField
                            label="Workspace ID"
                            value={selectedWorkspace.id > 0 ? selectedWorkspace.id.toString() : 'New (Unsaved)'}
                            disabled
                            size="small"
                        />

                        {selectedWorkspace.userId && (
                            <GenericTextField
                                label="User ID"
                                value={selectedWorkspace.userId.toString()}
                                disabled
                                size="small"
                            />
                        )}

                        <GenericTextField
                            label="Created At"
                            value={formatDate(selectedWorkspace.createdAt)}
                            disabled
                            size="small"
                        />

                        {selectedWorkspace.updatedAt && (
                            <GenericTextField
                                label="Updated At"
                                value={formatDate(selectedWorkspace.updatedAt)}
                                disabled
                                size="small"
                            />
                        )}

                        {selectedWorkspace.deletedAt && (
                            <GenericTextField
                                label="Deleted At"
                                value={formatDate(selectedWorkspace.deletedAt)}
                                disabled
                                size="small"
                            />
                        )}
                    </CardContent>
                </Card>
            </div>
        </ScrollArea>
    );
}
