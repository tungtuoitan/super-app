import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/Components/ui/card'
import { Button } from '@/Components/ui/button'
import { Badge } from '@/Components/ui/badge'
import { Separator } from '@/Components/ui/separator'
import { Input } from '@/Components/ui/input'
import { Textarea } from '@/Components/ui/textarea'
import { Label } from '@/Components/ui/label'
import { formatDate } from '@/utils/formatters'
import { UpdateNoteDTO, Note } from '../../types/note.types'
import { _getNoteById, _updateNote } from '../../services/noteService'
import { storageService } from '../../services/storage.service'

interface NoteDetailPanelProps {
  selectedNoteId?: string
}

export function NoteDetailPanel({ selectedNoteId }: NoteDetailPanelProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [editTitle, setEditTitle] = useState('')
  const [editContent, setEditContent] = useState('')
  const [note, setNote] = useState<Note | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  
  // Load note when selectedNoteId changes
  useEffect(() => {
    if (selectedNoteId) {
      setIsLoading(true)
      const token = storageService.getString('token')
      if (token) {
        _getNoteById(token, Number(selectedNoteId))
          .then(setNote)
          .catch(console.error)
          .finally(() => setIsLoading(false))
      }
    }
  }, [selectedNoteId])

  const handleEdit = () => {
    if (note) {
      setEditTitle(note.name)
      setEditContent(note.description || '')
      setIsEditing(true)
    }
  }

  const handleSave = async () => {
    if (note) {
      try {
        const token = storageService.getString('token')
        if (!token) throw new Error('No auth token')
        
        const updated = await _updateNote(token, note.noteId, {
          noteId: note.noteId,
          name: editTitle,
          description: editContent,
        })
        setNote(updated)
        setIsEditing(false)
      } catch (error) {
        console.error('Failed to update note:', error)
      }
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
                  {note.tags.map((tag:any, index:number) => (
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