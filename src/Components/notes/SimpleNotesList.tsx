/**
 * Simple Notes List Component
 * Demonstrates the new React Query architecture
 */

import React from 'react';
import { Button } from '@/shared/components/ui/Button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/Components/ui/card';
import { Alert, AlertDescription } from '@/Components/ui/alert';
import { Spinner } from '@/shared/components/ui/Spinner';
import {_getNotes} from '../../services/noteService';
import {storageService} from '../../services/storage.service';
import {Note} from '../../types/note.types';

export function SimpleNotesList() {
    // ✅ Server state với service trực tiếp
    const [notes, setNotes] = React.useState<Note[]>([]);
    const [isLoading, setIsLoading] = React.useState(true);
    const [error, setError] = React.useState<Error | null>(null);

    const loadNotes = async () => {
        try {
            setIsLoading(true);
            const token = storageService.getString('token');
            if (!token) throw new Error('No auth token');
            const data = await _getNotes(token, { getAll: true });
            setNotes(data);
            setError(null);
        } catch (err) {
            setError(err as Error);
        } finally {
            setIsLoading(false);
        }
    };

    React.useEffect(() => {
        loadNotes();
    }, []);

    if (isLoading) {
        return (
            <div className="flex justify-center items-center p-8 gap-4">
                <Spinner />
                <p className="text-sm text-muted-foreground">Loading notes...</p>
            </div>
        );
    }

    if (error) {
        return (
            <Alert variant="destructive" className="m-4">
                <AlertDescription className="flex items-center justify-between">
                    <span>Failed to load notes: {(error as Error).message}</span>
                    <Button onClick={loadNotes} variant="ghost" className="ml-4 h-8 px-3">
                        Retry
                    </Button>
                </AlertDescription>
            </Alert>
        );
    }

    if (!notes || notes.length === 0) {
        return (
            <div className="text-center p-8">
                <h2 className="text-xl font-semibold text-muted-foreground mb-2">
                    No notes found
                </h2>
                <p className="text-sm text-muted-foreground/70">
                    Create your first note to get started
                </p>
            </div>
        );
    }

    return (
        <div className="p-4">
            <h1 className="text-2xl font-bold mb-4">
                Notes ({notes.length})
            </h1>
            <div className="flex flex-col gap-4">
                {notes.map((note: Note) => (
                    <Card key={note.noteId}>
                        <CardHeader>
                            <CardTitle>{note.name}</CardTitle>
                            {note.description && (
                                <CardDescription className="mt-2">
                                    {note.description}
                                </CardDescription>
                            )}
                        </CardHeader>
                        <CardContent>
                            <p className="text-xs text-muted-foreground">
                                Created: {note.createdAt.toLocaleDateString()}
                                {note.isArchived && ' • Archived'}
                            </p>
                        </CardContent>
                    </Card>
                ))}
            </div>
        </div>
    );
}