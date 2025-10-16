import React from 'react'
import { Box, Typography, List, ListItem, ListItemText, Chip } from '@mui/material'
import { useQuery } from '@tanstack/react-query'
import { tagService } from '@/features/tags/services/tagService'

interface TagsPanelProps {
  onTagSelect?: (tagId: string) => void
}

export function TagsPanel({ onTagSelect }: TagsPanelProps) {
  const { data: tags, isLoading } = useQuery({
    queryKey: ['tags'],
    queryFn: () => tagService.getTags(),
  })

  const handleTagClick = (tagId: string) => {
    onTagSelect?.(tagId)
  }

  if (isLoading) {
    return (
      <Box sx={{ p: 2 }}>
        <Typography>Loading tags...</Typography>
      </Box>
    )
  }

  return (
    <Box sx={{ height: '100%', overflow: 'auto' }}>
      <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider' }}>
        <Typography variant="h6">Tags</Typography>
      </Box>
      
      <List dense>
        {tags?.map((tag) => (
          <ListItem
            key={tag.tagId}
            component="div"
            onClick={() => handleTagClick(tag.tagId.toString())}
            sx={{
              cursor: 'pointer',
              '&:hover': {
                backgroundColor: 'action.hover',
              },
            }}
          >
            <ListItemText
              primary={
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Chip
                    label={tag.name}
                    size="small"
                    variant="outlined"
                    sx={{
                      backgroundColor: tag.color || 'primary.light',
                      color: 'white',
                      fontWeight: 500,
                    }}
                  />
                  <Typography variant="caption" color="text.secondary">
                    ({tag.noteCount || 0})
                  </Typography>
                </Box>
              }
            />
          </ListItem>
        ))}
      </List>
    </Box>
  )
}