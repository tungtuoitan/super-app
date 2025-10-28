import React, { useState } from 'react';
import { Loader2, Edit, Save, X } from 'lucide-react';

// Import hooks and services from notes feature
import { useNoteUI, useUpdateNote, type Note, type UpdateNoteDTO } from '../../features/notes';

/**
 * NoteDetailPanel - A flexible layout panel for displaying and editing note details
 */
export function NoteDetailPanel() {
    const [isEditing, setIsEditing] = useState(false);
    const [editedNote, setEditedNote] = useState<UpdateNoteDTO>({});

    // Get selected note from context
    const { selectedNote, closeDialog } = useNoteUI();

    // Mutation hook for updating notes
    const updateNote = useUpdateNote();

    // No note selected
    if (!selectedNote) {
        return (
            <div className="h-full flex items-center justify-center bg-white">
                <div className="text-center">
                    <h2 className="text-xl font-semibold text-gray-600 mb-2">No note selected</h2>
                    <p className="text-sm text-gray-500">Select a note from the grid to view its details</p>
                </div>
            </div>
        );
    }

    // Handle edit mode
    const handleEdit = () => {
        setEditedNote({
            name: selectedNote.name,
            description: selectedNote.description,
        });
        setIsEditing(true);
    };

    // Handle save
    const handleSave = async () => {
        try {
            await updateNote.mutateAsync({
                id: selectedNote.noteId,
                data: editedNote,
            });
            setIsEditing(false);
            setEditedNote({});
        } catch (error) {
            console.error('Failed to update note:', error);
        }
    };

    // Handle cancel
    const handleCancel = () => {
        setIsEditing(false);
        setEditedNote({});
    };

    // Format date
    const formatDate = (date: Date) => {
        return new Intl.DateTimeFormat('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        }).format(date);
    };

    return (
        <div className="h-full flex flex-col bg-white shadow-sm">
            {/* Header */}
            <div className="p-4 border-b border-gray-200">
                <div className="flex items-center justify-between">
                    <h2 className="text-xl font-semibold text-gray-900">Note Details</h2>
                    {!isEditing ? (
                        <button
                            onClick={handleEdit}
                            className="p-2 rounded hover:bg-gray-100 text-gray-600 hover:text-gray-900 transition-colors"
                        >
                            <Edit className="w-5 h-5" />
                        </button>
                    ) : (
                        <div className="flex gap-2">
                            <button
                                onClick={handleSave}
                                disabled={updateNote.isPending}
                                className="p-2 rounded hover:bg-blue-50 text-blue-600 hover:text-blue-700 transition-colors disabled:opacity-50"
                            >
                                {updateNote.isPending ? (
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                ) : (
                                    <Save className="w-5 h-5" />
                                )}
                            </button>
                            <button
                                onClick={handleCancel}
                                className="p-2 rounded hover:bg-gray-100 text-gray-600 hover:text-gray-900 transition-colors"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                    )}
                </div>
            </div>

            {/* Content */}
            <div className="flex-1 p-4 overflow-auto">
                {updateNote.error && (
                    <div className="p-4 mb-4 bg-red-50 border border-red-200 rounded text-red-700 text-sm">
                        Failed to update note
                    </div>
                )}

                <div className="border border-gray-200 rounded-lg">
                    <div className="p-6">
                        {/* Note Name */}
                        <div className="mb-6">
                            <label className="block text-sm font-medium text-gray-500 mb-2">Name</label>
                            {isEditing ? (
                                <input
                                    type="text"
                                    value={editedNote.name || ''}
                                    onChange={(e) => setEditedNote(prev => ({ 
                                        ...prev, 
                                        name: e.target.value 
                                    }))}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                                />
                            ) : (
                                <h3 className="text-2xl font-semibold text-gray-900">{selectedNote.name}</h3>
                            )}
                        </div>

                        <hr className="my-4 border-gray-200" />

                        {/* Description */}
                        <div className="mb-6">
                            <label className="block text-sm font-medium text-gray-500 mb-2">Description</label>
                            {isEditing ? (
                                <textarea
                                    rows={4}
                                    value={editedNote.description || ''}
                                    onChange={(e) => setEditedNote(prev => ({ 
                                        ...prev, 
                                        description: e.target.value 
                                    }))}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm resize-none"
                                />
                            ) : (
                                <p className="text-base text-gray-700">
                                    {selectedNote.description || 'No description'}
                                </p>
                            )}
                        </div>

                        <hr className="my-4 border-gray-200" />

                        {/* Metadata */}
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-500 mb-1">Created</label>
                                <p className="text-sm text-gray-700">{formatDate(selectedNote.createdAt)}</p>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-500 mb-1">Last Modified</label>
                                <p className="text-sm text-gray-700">
                                    {selectedNote.updatedAt ? formatDate(selectedNote.updatedAt) : 'Never'}
                                </p>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-500 mb-1">Created By</label>
                                <p className="text-sm text-gray-700">{selectedNote.createdBy}</p>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-500 mb-1">Status</label>
                                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                    selectedNote.isArchived 
                                        ? 'bg-gray-100 text-gray-800' 
                                        : 'bg-green-100 text-green-800'
                                }`}>
                                    {selectedNote.isArchived ? 'Archived' : 'Active'}
                                </span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}