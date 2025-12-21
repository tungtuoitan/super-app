/**
 * Workspace Detail Dialog Content Component
 * Modern card-based layout for workspace editing
 */

import React, { useEffect } from 'react';
import { GenericTextField } from '@/shared/components';
import { Card, CardContent, CardHeader, CardTitle } from '@/Components/ui/card';
import { Textarea } from '@/Components/ui/textarea';
import { ScrollArea } from '@/Components/ui/scroll-area';
import { Briefcase, FileText, Calendar, User } from 'lucide-react';
import { useWsUIStore } from '@/store/ws/useWsUI.store';
import { useWsUIHelper } from '@/hooks/useWsUI.helper';
import { Ws } from '@/store/ws/useWsList.store';

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

    // Handlers for form interactions
    const handleFieldChange = (field: keyof Ws, value: any) => {
        updateSelectedWorkspace({ [field]: value });
        console.log(`Field ${String(field)} changed to:`, value);
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
                        {/* Workspace Name */}
                        <div className="space-y-2">
                            <label className="text-sm font-medium flex items-center gap-2">
                                <FileText className="h-4 w-4" />
                                Workspace Name
                            </label>
                            <GenericTextField
                                key={`name-${wsKey}`}
                                label=""
                                value={selectedWorkspace.name}
                                onChange={(e) => handleFieldChange('name', e.target.value)}
                                placeholder="Enter workspace name..."
                                disabled={selectedWorkspace.id < 0 && selectedWorkspace.deletedAt !== null}
                            />
                        </div>

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
                                disabled={selectedWorkspace.id < 0 && selectedWorkspace.deletedAt !== null}
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
                        <div className="grid grid-cols-2 gap-4">
                            {/* Workspace ID */}
                            <div className="space-y-1">
                                <label className="text-xs font-medium text-muted-foreground">
                                    Workspace ID
                                </label>
                                <p className="text-sm font-mono">
                                    {selectedWorkspace.id > 0 ? selectedWorkspace.id : 'New (Unsaved)'}
                                </p>
                            </div>

                            {/* User ID */}
                            {selectedWorkspace.userId && (
                                <div className="space-y-1">
                                    <label className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                                        <User className="h-3 w-3" />
                                        User ID
                                    </label>
                                    <p className="text-sm font-mono">
                                        {selectedWorkspace.userId}
                                    </p>
                                </div>
                            )}

                            {/* Created At */}
                            <div className="space-y-1">
                                <label className="text-xs font-medium text-muted-foreground">
                                    Created At
                                </label>
                                <p className="text-sm">
                                    {formatDate(selectedWorkspace.createdAt)}
                                </p>
                            </div>

                            {/* Updated At */}
                            {selectedWorkspace.updatedAt && (
                                <div className="space-y-1">
                                    <label className="text-xs font-medium text-muted-foreground">
                                        Updated At
                                    </label>
                                    <p className="text-sm">
                                        {formatDate(selectedWorkspace.updatedAt)}
                                    </p>
                                </div>
                            )}

                            {/* Deleted At */}
                            {selectedWorkspace.deletedAt && (
                                <div className="space-y-1 col-span-2">
                                    <label className="text-xs font-medium text-destructive">
                                        Deleted At
                                    </label>
                                    <p className="text-sm text-destructive">
                                        {formatDate(selectedWorkspace.deletedAt)}
                                    </p>
                                </div>
                            )}
                        </div>
                    </CardContent>
                </Card>
            </div>
        </ScrollArea>
    );
}
