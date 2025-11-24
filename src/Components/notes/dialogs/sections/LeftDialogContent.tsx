/**
 * Left Dialog Content Component
 * Left column content for note detail dialog
 * Contains note form fields and basic information
 */

import React, { useState } from 'react';
import { Label } from '@/Components/ui/label';
import { Input } from '@/Components/ui/input';
import {useNoteUI} from '../../../../contexts/NoteUIContext';

const NOTE_TYPES = ['meeting', 'brainstorm', 'research', 'bug'] as const;

/**
 * Left Dialog Content
 * Form fields for note editing
 */
export function LeftDialogContent() {
    const { selectedNote } = useNoteUI();
    const [formData, setFormData] = useState({
        name: selectedNote?.name || '',
        description: selectedNote?.description || '',
        type: selectedNote?.type || 'meeting',
        tags: selectedNote?.tags || [],
    });

    const handleFieldChange = (field: string, value: any) => {
        setFormData(prev => ({
            ...prev,
            [field]: value
        }));
    };

    // Convert tags to comma-separated string for input
    const tagsAsString = Array.isArray(formData.tags) 
        ? formData.tags.map(tag => typeof tag === 'string' ? tag : tag.name).join(', ')
        : '';

    return (
        <div className="py-4">
            <h2 className="text-lg font-semibold mb-4">
                Note Details2
            </h2>

            {/* Note Name */}
            <div className="space-y-2 mb-4">
                <Label htmlFor="note-name">
                    Note Name <span className="text-destructive">*</span>
                </Label>
                <Input
                    id="note-name"
                    value={formData.name}
                    onChange={(e) => handleFieldChange('name', e.target.value)}
                    placeholder="Enter note name"
                    required
                />
            </div>

            {/* Note Type - Temporarily using native select until shadcn Select is added */}
            <div className="space-y-2 mb-4">
                <Label htmlFor="note-type">Type</Label>
                <select
                    id="note-type"
                    value={formData.type}
                    onChange={(e) => handleFieldChange('type', e.target.value)}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                >
                    {NOTE_TYPES.map(type => (
                        <option key={type} value={type}>
                            {type.charAt(0).toUpperCase() + type.slice(1)}
                        </option>
                    ))}
                </select>
            </div>

            {/* Tags */}
            <div className="space-y-2 mb-4">
                <Label htmlFor="note-tags">Tags</Label>
                <Input
                    id="note-tags"
                    value={tagsAsString}
                    onChange={(e) => handleFieldChange('tags', e.target.value)}
                    placeholder="Enter tags separated by commas"
                />
                <p className="text-xs text-muted-foreground">
                    Separate multiple tags with commas
                </p>
            </div>

            {/* Creation Info */}
            <div className="mt-6 pt-4 border-t space-y-1">
                <p className="text-sm text-muted-foreground">
                    Created: {selectedNote?.createdAt ? new Date(selectedNote.createdAt).toLocaleDateString() : 'New'}
                </p>
                {selectedNote?.updatedAt && (
                    <p className="text-sm text-muted-foreground">
                        Updated: {new Date(selectedNote.updatedAt).toLocaleDateString()}
                    </p>
                )}
                <p className="text-sm text-muted-foreground">
                    By: {selectedNote?.createdBy || 'Current User'}
                </p>
            </div>
        </div>
    );
}