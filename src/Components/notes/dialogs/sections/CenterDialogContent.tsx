/**
 * Center Dialog Content Component
 * Center column content for note detail dialog
 * Contains main note content and description
 */

import React, { useState } from 'react';
import { Label } from '@/Components/ui/label';
import { Textarea } from '@/Components/ui/textarea';
import {useNoteUI} from '../../../../contexts/NoteUIContext';

/**
 * Center Dialog Content
 * Main content area for note editing
 */
export function CenterDialogContent() {
    const { selectedNote } = useNoteUI();
    const [content, setContent] = useState(selectedNote?.description || '');

    const handleContentChange = (event: React.ChangeEvent<HTMLTextAreaElement>) => {
        setContent(event.target.value);
    };

    return (
        <div className="py-4 h-full flex flex-col">
            <h2 className="text-lg font-semibold mb-4">
                Note Content
            </h2>

            <div className="flex-1 flex flex-col space-y-2">
                <Label htmlFor="note-content">Description</Label>
                <Textarea
                    id="note-content"
                    value={content}
                    onChange={handleContentChange}
                    placeholder="Enter your note content here..."
                    className="flex-1 resize-none min-h-[calc(100vh-280px)]"
                />
            </div>
        </div>
    );
}