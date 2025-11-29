/**
 * Right Dialog Content Component
 * Right column content for note detail dialog
 * Contains actions, metadata, and additional information
 */

import React from 'react';
import { Button } from '@/Components/ui/button';
import { Badge } from '@/Components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/Components/ui/card';
import {useNoteUIStore} from '@/store/note/useNoteUIStore';

/**
 * Right Dialog Content
 * Actions and metadata panel
 */
export function RightDialogContent() {
    const { selectedNote } = useNoteUIStore();

    const isNewNote = selectedNote?.noteId === 0;

    return (
        <div className="p-4 h-full overflow-y-auto space-y-4">
            {/* Status Section */}
            <Card>
                <CardHeader>
                    <CardTitle className="text-base">Status</CardTitle>
                </CardHeader>
                <CardContent>
                    <Badge variant={selectedNote?.isArchived ? 'secondary' : 'default'}>
                        {selectedNote?.isArchived ? 'Archived' : 'Active'}
                    </Badge>
                </CardContent>
            </Card>

            {/* Actions Section */}
            <Card>
                <CardHeader>
                    <CardTitle className="text-base">Actions</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                    {!isNewNote && (
                        <>
                            <Button 
                                variant="outline" 
                                className="w-full"
                                onClick={() => console.log('Duplicate note')}
                            >
                                Duplicate
                            </Button>
                            <Button 
                                variant="outline" 
                                className="w-full text-warning"
                                onClick={() => console.log('Archive note')}
                            >
                                {selectedNote?.isArchived ? 'Unarchive' : 'Archive'}
                            </Button>
                            <Button 
                                variant="outline" 
                                className="w-full text-destructive hover:text-destructive"
                                onClick={() => console.log('Delete note')}
                            >
                                Delete
                            </Button>
                        </>
                    )}
                </CardContent>
            </Card>

            {/* Metadata Section */}
            {!isNewNote && (
                <Card>
                    <CardHeader>
                        <CardTitle className="text-base">Information</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                        <div>
                            <p className="text-sm text-muted-foreground mb-1">
                                Created
                            </p>
                            <p className="text-sm">
                                {selectedNote?.createdAt ? 
                                    new Date(selectedNote.createdAt).toLocaleString() : 
                                    'Unknown'
                                }
                            </p>
                        </div>

                        {selectedNote?.updatedAt && (
                            <div>
                                <p className="text-sm text-muted-foreground mb-1">
                                    Last Modified
                                </p>
                                <p className="text-sm">
                                    {new Date(selectedNote.updatedAt).toLocaleString()}
                                </p>
                            </div>
                        )}

                        <div>
                            <p className="text-sm text-muted-foreground mb-1">
                                Created By
                            </p>
                            <p className="text-sm">
                                {selectedNote?.createdBy || 'Current User'}
                            </p>
                        </div>

                        {selectedNote?.type && (
                            <div>
                                <p className="text-sm text-muted-foreground mb-1">
                                    Type
                                </p>
                                <Badge variant="outline">
                                    {selectedNote.type.charAt(0).toUpperCase() + selectedNote.type.slice(1)}
                                </Badge>
                            </div>
                        )}
                    </CardContent>
                </Card>
            )}

            {/* Additional Info for New Notes */}
            {isNewNote && (
                <Card>
                    <CardHeader>
                        <CardTitle className="text-base">New Note</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-sm text-muted-foreground">
                            Fill in the details on the left and add your content in the center column.
                        </p>
                    </CardContent>
                </Card>
            )}
        </div>
    );
}