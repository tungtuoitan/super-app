import React, { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/Components/ui/card'
import { Button } from '@/Components/ui/button'
import { Badge } from '@/Components/ui/badge'
import { Separator } from '@/Components/ui/separator'
import { Input } from '@/Components/ui/input'
import { Textarea } from '@/Components/ui/textarea'
import { Label } from '@/Components/ui/label'
import { noteService } from '@/features/notes/services/noteService'
import { formatDate } from '@/utils/formatters'
import type { UpdateNoteDTO } from '@/features/notes/types/note.types'

interface NoteDetailPanelProps {
  selectedNoteId?: string
}

export function NoteDetailPanel({ selectedNoteId }: NoteDetailPanelProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [editTitle, setEditTitle] = useState('')
  const [editContent, setEditContent] = useState('')
  
  const queryClient = useQueryClient()

  const { data: note, isLoading } = useQuery({
    queryKey: ['notes', selectedNoteId],
    queryFn: () => noteService.getNoteById(Number(selectedNoteId)),
    enabled: !!selectedNoteId,
  })

  const updateNoteMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: UpdateNoteDTO }) => 
      noteService.updateNote(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notes'] })
      setIsEditing(false)
    },
  })

  const handleEdit = () => {
    if (note) {
      setEditTitle(note.name)
      setEditContent(note.description || '')
      setIsEditing(true)
    }
  }

  const handleSave = async () => {
    if (note) {
      await updateNoteMutation.mutateAsync({
        id: note.noteId,
        data: {
          name: editTitle,
          description: editContent,
        },
      })
    }
  }

  const handleCancel = () => {
    setIsEditing(false)
    setEditTitle('')
    setEditContent('')
  }

  if (!selectedNoteId) {
    return (
      <div className="h-full flex items-center justify-center p-4">
        <p className="text-sm text-muted-foreground">
          Select a note to view details
        </p>
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="p-4">
        <p className="text-sm">Loading note details...</p>
      </div>
    )
  }

  if (!note) {
    return (
      <div className="p-4">
        <p className="text-sm text-destructive">Note not found</p>
      </div>
    )
  }

  return (
    <div className="h-full overflow-auto p-4">
      <Card>
        <CardHeader>
          {isEditing ? (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="title">Title</Label>
                <Input
                  id="title"
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  placeholder="Enter note title"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="content">Content</Label>
                <Textarea
                  id="content"
                  value={editContent}
                  onChange={(e) => setEditContent(e.target.value)}
                  placeholder="Enter note content"
                  rows={8}
                  className="resize-none"
                />
              </div>
            </div>
          ) : (
            <>
              <CardTitle className="text-2xl">{note.name}</CardTitle>
              <p className="text-sm text-muted-foreground mt-2">
                Created: {formatDate(note.createdAt)} | 
                Updated: {note.updatedAt ? formatDate(note.updatedAt) : 'Never'}
              </p>
            </>
          )}
        </CardHeader>

        {!isEditing && (
          <CardContent className="space-y-4">
            <Separator />

            {note.description && (
              <p className="text-sm leading-relaxed">
                {note.description}
              </p>
            )}

            {note.tags && note.tags.length > 0 && (
              <div className="space-y-2">
                <p className="text-sm font-medium">Tags:</p>
                <div className="flex gap-2 flex-wrap">
                  {note.tags.map((tag, index) => (
                    <Badge key={index} variant="outline">
                      {tag.name}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        )}

        <CardFooter>
          {isEditing ? (
            <div className="flex gap-2">
              <Button 
                onClick={handleSave}
                disabled={updateNoteMutation.isPending}
              >
                Save
              </Button>
              <Button variant="secondary" onClick={handleCancel}>
                Cancel
              </Button>
            </div>
          ) : (
            <Button onClick={handleEdit}>
              Edit
            </Button>
          )}
        </CardFooter>
      </Card>
    </div>
  )
}