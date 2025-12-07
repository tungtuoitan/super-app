/**
 * Note Detail Dialog Content Component
 * Modern card-based layout with ClickUp theme
 * Clean, organized design with shadcn/ui components
 */

import React, {useEffect} from 'react';
import { GenericAutoComplete, GenericTagAutoComplete, GenericTextField, IAutoCompleteOptions } from '@/shared/components';
import { Card, CardContent, CardHeader, CardTitle } from '@/Components/ui/card';
import { Textarea } from '@/Components/ui/textarea';
import { Badge } from '@/Components/ui/badge';
import { ScrollArea } from '@/Components/ui/scroll-area';
import { FileText, Calendar, User, Hash as HashTagIcon, Info } from 'lucide-react';
import {useNoteUIHelper} from '../../../hooks/useNoteUIHelper';
import {Note, NOTE_TYPES, NoteType} from '../../../types/note.types';
import {useNoteUIStore} from '@/store/note/useNoteUIStore';
import {formatNoteDate} from '@/utils/note.utils';

/**
 * Note Detail Dialog Content
 * Three-column layout matching RFD dialog structure:
 * - Left: Note form fields
 * - Center: Note content/description
 * - Right: Actions/metadata
 */
export function NoteDetailDialogContent() {
    const { selectedNote, isDialogOpen } = useNoteUIStore();
    const { closeDialog, updateSelectedNote } = useNoteUIHelper();
    
    const [noteKey, setNoteKey] = React.useState(0);
    useEffect(() => {
        if (selectedNote) {
            setNoteKey(prev => prev + 1);
        }
    }, [selectedNote?.noteId]);
    
    // Fallback hashtags (no API call needed)
    const tagsLoading = false; // No longer loading from API
    const fallbackTagOptions: IAutoCompleteOptions[] = [
        { id: 'work', label: 'Work', desc: 'Work', active: true },
        { id: 'personal', label: 'Personal', desc: 'Personal', active: true },
        { id: 'important', label: 'Important', desc: 'Important', active: true },
        { id: 'urgent', label: 'Urgent', desc: 'Urgent', active: true },
    ];
    
    // Use fallback hashtags (API removed with TanStack Query)
    const finalTagOptions = fallbackTagOptions;
    
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
    
    // Convert hashtags array to comma-separated string of IDs for TagAutoComplete
        // Map selected hashtags to match the format expected by the component (comma-separated string of IDs)
    const currentTagsValue = selectedNote?.tags
        ? selectedNote.tags.map((tag:any) => tag.tagId.toString()).filter(Boolean).join(',')
        : '';
    
     // Handlers for form interactions
        const handleFieldChange = (field: keyof Note, value: any) => {
            updateSelectedNote({ [field]: value });
            console.log(`Field ${field} changed to:`, value);
        };
    
        const handleTypeChange = (event: React.SyntheticEvent, newValue: IAutoCompleteOptions | null) => {
            const typeValue = newValue?.id as NoteType;
            handleFieldChange('type', typeValue);
        };
    
    const handleTagsChange = (tagsString: string) => {
        // Convert comma-separated string of IDs back to hashtags array
        const tagIds = tagsString ? tagsString.split(',').map(id => id.trim()).filter(id => id) : [];
        
        // Convert hashtag IDs to Tag objects by finding them in the options
        const tagObjects = tagIds.map(tagId => {
            const foundOption = finalTagOptions.find((option: IAutoCompleteOptions) => option.id === tagId);
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
        console.log('HashTags changed:', { tagsString, tagIds, tagObjects });
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
        <div key={noteKey} className="p-6 space-y-6 h-full ">
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
                        className="min-h-[400px] resize-none font-mono text-sm"
                    />
                </CardContent>
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
                    <CardContent className="p-0 space-y-2">
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

                        {/* HashTags */}
                        <div className="space-y-2">
                            <GenericTagAutoComplete
                                options={finalTagOptions}
                                value={currentTagsValue}
                                onChange={handleTagsChange}
                                label="HashTags"
                                placeholder={tagsLoading ? "Loading hashtags..." : "+ Add HashTag"}
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
                            value={formatNoteDate(selectedNote?.createdAt)}
                            disabled
                            size="small"
                        />

                        <GenericTextField
                            label="Updated"
                            value={formatNoteDate(selectedNote?.updatedAt)}
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

            
        </div>
    );
}