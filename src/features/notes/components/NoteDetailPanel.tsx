import React, { useState } from 'react'
import { 
  Box, 
  Typography, 
  Card, 
  CardContent, 
  CardActions,
  Button,
  Chip,
  Divider,
  TextField,
} from '@mui/material'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
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
      <Box 
        sx={{ 
          height: '100%', 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center',
          p: 2,
        }}
      >
        <Typography variant="body2" color="text.secondary">
          Select a note to view details
        </Typography>
      </Box>
    )
  }

  if (isLoading) {
    return (
      <Box sx={{ p: 2 }}>
        <Typography>Loading note details...</Typography>
      </Box>
    )
  }

  if (!note) {
    return (
      <Box sx={{ p: 2 }}>
        <Typography color="error">Note not found</Typography>
      </Box>
    )
  }

  return (
    <Box sx={{ height: '100%', overflow: 'auto', p: 2 }}>
      <Card>
        <CardContent>
          {isEditing ? (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <TextField
                label="Title"
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                fullWidth
                variant="outlined"
              />
              <TextField
                label="Content"
                value={editContent}
                onChange={(e) => setEditContent(e.target.value)}
                fullWidth
                multiline
                rows={8}
                variant="outlined"
              />
            </Box>
          ) : (
            <>
              <Typography variant="h5" component="h2" gutterBottom>
                {note.name}
              </Typography>
              
              <Typography variant="body2" color="text.secondary" gutterBottom>
                Created: {formatDate(note.createdAt)} | 
                Updated: {note.updatedAt ? formatDate(note.updatedAt) : 'Never'}
              </Typography>

              <Divider sx={{ my: 2 }} />

              {note.description && (
                <Typography variant="body1" paragraph>
                  {note.description}
                </Typography>
              )}

              {note.tags && note.tags.length > 0 && (
                <Box sx={{ mt: 2 }}>
                  <Typography variant="subtitle2" gutterBottom>
                    Tags:
                  </Typography>
                  <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                    {note.tags.map((tag, index) => (
                      <Chip
                        key={index}
                        label={tag.name}
                        size="small"
                        variant="outlined"
                      />
                    ))}
                  </Box>
                </Box>
              )}
            </>
          )}
        </CardContent>

        <CardActions>
          {isEditing ? (
            <Box sx={{ display: 'flex', gap: 1 }}>
              <Button 
                size="small" 
                onClick={handleSave}
                disabled={updateNoteMutation.isPending}
              >
                Save
              </Button>
              <Button size="small" onClick={handleCancel}>
                Cancel
              </Button>
            </Box>
          ) : (
            <Button size="small" onClick={handleEdit}>
              Edit
            </Button>
          )}
        </CardActions>
      </Card>
    </Box>
  )
}