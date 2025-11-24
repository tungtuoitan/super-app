/**
 * Note Detail Dialog Content Component
 * Modern card-based layout with ClickUp theme
 * Clean, organized design with shadcn/ui components
 */

import React from 'react';
import { GenericAutoComplete, GenericTagAutoComplete, GenericTextField, IAutoCompleteOptions } from '@/shared/components';
import { useTagsForAutocomplete } from '@/Components/Tags';
import { Card, CardContent, CardHeader, CardTitle } from '@/Components/ui/card';
import { Textarea } from '@/Components/ui/textarea';
import { Badge } from '@/Components/ui/badge';
import { ScrollArea } from '@/Components/ui/scroll-area';
import { FileText, Calendar, User, Tag as TagIcon, Info } from 'lucide-react';
import {useNoteUI} from '../NoteUIContext';
import {Note, NOTE_TYPES, NoteType} from '../note.types';

/**
 * Note Detail Dialog Content
 * Three-column layout matching RFD dialog structure:
 * - Left: Note form fields
 * - Center: Note content/description
 * - Right: Actions/metadata
 */
export function NoteDetailDialogContent() {
    const { selectedNote, isDialogOpen, closeDialog, updateSelectedNote } = useNoteUI();
    const [loading, setLoading] = React.useState(false);
    
    // ✅ FIX: Log when selectedNote changes to verify updates
    React.useEffect(() => {
        console.log('🔄 NoteDetailDialogContent - selectedNote changed:', selectedNote);
    }, [selectedNote]);
    
    // ✅ FIX: Force re-render when note ID changes (after save)
    const [noteKey, setNoteKey] = React.useState(0);
    React.useEffect(() => {
        if (selectedNote) {
            console.log('🔑 Updating noteKey for note:', selectedNote.noteId);
            setNoteKey(prev => prev + 1);
        }
    }, [selectedNote?.noteId]);
    
    // Fetch tags from API for use in autocomplete
    const { tagOptions, isLoading: tagsLoading, error: tagsError } = useTagsForAutocomplete();
    
    // Fallback tags if API fails
    const fallbackTagOptions: IAutoCompleteOptions[] = [
        { id: 'work', label: 'Work', desc: 'Work', active: true },
        { id: 'personal', label: 'Personal', desc: 'Personal', active: true },
        { id: 'important', label: 'Important', desc: 'Important', active: true },
        { id: 'urgent', label: 'Urgent', desc: 'Urgent', active: true },
    ];
    
    // Use API tags if available, otherwise fallback tags
    const finalTagOptions = tagsError ? fallbackTagOptions : tagOptions;
    
    // Log error if tags failed to load
    React.useEffect(() => {
        if (tagsError) {
            console.error('Failed to load tags for autocomplete:', tagsError);
        }
    }, [tagsError]);
    
    // Create options for type autocomplete
    const typeOptions: IAutoCompleteOptions[] = NOTE_TYPES.map((type) => ({
        id: type,
        label: type.charAt(0).toUpperCase() + type.slice(1),
        desc: type.charAt(0).toUpperCase() + type.slice(1),
        active: true,
    }));

    // Create current type value for autocomplete
    const currentTypeValue = selectedNote?.type 
        ? typeOptions.find(option => option.id === selectedNote.type) || null
        : null;
    
    // Convert tags array to comma-separated string of IDs for TagAutoComplete
        // Map selected tags to match the format expected by the component (comma-separated string of IDs)
    const currentTagsValue = selectedNote?.tags
        ? selectedNote.tags.map((tag:any) => tag.tagId.toString()).filter(Boolean).join(',')
        : '';
    
    // Debug logging
    console.log('Debug - Tag display data:', {
        selectedNoteTags: selectedNote?.tags,
        currentTagsValue,
        finalTagOptions,
        tagsLoading,
        tagsError
    });        // Handlers for form interactions
        const handleFieldChange = (field: keyof Note, value: any) => {
            updateSelectedNote({ [field]: value });
            console.log(`Field ${field} changed to:`, value);
        };
    
        const handleTypeChange = (event: React.SyntheticEvent, newValue: IAutoCompleteOptions | null) => {
            const typeValue = newValue?.id as NoteType;
            handleFieldChange('type', typeValue);
        };
    
    const handleTagsChange = (tagsString: string) => {
        // Convert comma-separated string of IDs back to tags array
        const tagIds = tagsString ? tagsString.split(',').map(id => id.trim()).filter(id => id) : [];
        
        // Convert tag IDs to Tag objects by finding them in the options
        const tagObjects = tagIds.map(tagId => {
            const foundOption = finalTagOptions.find(option => option.id === tagId);
            if (foundOption) {
                return {
                    tagId: parseInt(foundOption.id as string),
                    name: foundOption.label,
                    description: foundOption.desc,
                    isActive: foundOption.active,
                    createdAt: new Date(),
                    id: parseInt(foundOption.id as string), // Add alias for backward compatibility
                };
            }
            return null;
        }).filter(tag => tag !== null);
        
        handleFieldChange('tags', tagObjects);
        console.log('Tags changed:', { tagsString, tagIds, tagObjects });
    };        const handleDuplicate = () => {
            // TODO: Implement duplicate logic
            console.log('Duplicating note');
        };
    
        const handleArchive = () => {
            // TODO: Implement archive logic
            console.log('Toggling archive status');
        };
    
        const handleDelete = () => {
            // TODO: Implement delete logic
            console.log('Deleting note');
        };
    
        if (!selectedNote) {
            return null;
        }
    
    return (
        <ScrollArea className="h-full w-full bg-background">
            <div key={noteKey} className="p-6 space-y-6 h-full">
                {/* Header with Note Name */}
                <div className="border-b border-editor-border pb-4">
                    <div className="flex items-start gap-3">
                        <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                                <Badge variant={selectedNote?.isArchived ? "secondary" : "default"} className="text-xs">
                                    {selectedNote?.isArchived ? 'Archived' : 'Active'}
                                </Badge>
                                <span className="text-xs text-muted-foreground">
                                    ID: {selectedNote?.noteId || '0'}
                                </span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Two Column Layout - Details and Metadata */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Left Column - Note Details */}
                    <div className="border-none">
                        <CardHeader className="p-0 pb-2">
                            <CardTitle className="text-lg flex items-center gap-2">
                                <Info className="w-5 h-5 text-primary" />
                                Note Details
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="p-0 space-y-4">
                            {/* Note Name */}
                            <GenericTextField
                                label="Note Name"
                                value={selectedNote?.name || ''}
                                onChange={(e) => handleFieldChange('name', e.target.value)}
                                size="small"
                            />

                            {/* Status */}
                            <GenericAutoComplete
                                value={selectedNote?.isArchived ? { id: 'archived', label: 'Archived', desc: 'Archived', active: true } : { id: 'active', label: 'Active', desc: 'Active', active: true }}
                                onChange={(event, newValue) => handleFieldChange('isArchived', newValue?.id === 'archived')}
                                allOptions={[
                                    { id: 'active', label: 'Active', desc: 'Active', active: true },
                                    { id: 'archived', label: 'Archived', desc: 'Archived', active: true },
                                ]}
                                inputProps={{
                                    name: 'status',
                                    label: 'Status',
                                    required: false,
                                }}
                            />

                            {/* Tags */}
                            <div className="space-y-2">
                                <GenericTagAutoComplete
                                    options={finalTagOptions}
                                    value={currentTagsValue}
                                    onChange={handleTagsChange}
                                    label="Tags"
                                    placeholder={tagsLoading ? "Loading tags..." : "+ Add Tag"}
                                    size="small"
                                    data-testid="note-tags"
                                    disabled={tagsLoading}
                                />
                            </div>
                        </CardContent>
                    </div>

                    {/* Right Column - Metadata */}
                    <div className="border-none">
                        <CardHeader className="p-0 pb-2">
                            <CardTitle className="text-lg flex items-center gap-2">
                                <Calendar className="w-5 h-5 text-accent-foreground" />
                                Metadata
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="p-0 space-y-4">
                            <GenericTextField
                                label="Created"
                                value={selectedNote?.createdAt ? new Intl.DateTimeFormat('en-US', {
                                    year: 'numeric',
                                    month: 'short',
                                    day: 'numeric',
                                    hour: '2-digit',
                                    minute: '2-digit',
                                    hour12: true
                                }).format(selectedNote.createdAt) : '-'}
                                disabled
                                size="small"
                            />

                            <GenericTextField
                                label="Updated"
                                value={selectedNote?.updatedAt ? new Intl.DateTimeFormat('en-US', {
                                    year: 'numeric',
                                    month: 'short',
                                    day: 'numeric',
                                    hour: '2-digit',
                                    minute: '2-digit',
                                    hour12: true
                                }).format(selectedNote.updatedAt) : '-'}
                                disabled
                                size="small"
                            />

                            <GenericTextField
                                label="Created by"
                                value={selectedNote?.createdBy || '-'}
                                disabled
                                size="small"
                            />
                        </CardContent>
                    </div>
                </div>

                {/* Full Width - Description */}
                <div className="border-none">
                    <CardHeader className="p-0 pb-2">
                        <CardTitle className="text-lg flex items-center gap-2">
                            <FileText className="w-5 h-5 text-primary" />
                            Description
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="p-0">
                        <Textarea
                            value={selectedNote?.description || ''}
                            onChange={(e) => handleFieldChange('description', e.target.value)}
                            placeholder="Enter note description..."
                            className="min-h-[200px] resize-none font-mono text-sm"
                        />
                    </CardContent>
                </div>
            </div>
        </ScrollArea>
    );
}