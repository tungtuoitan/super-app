import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { tagService } from '@/Components/Tags/tagService';
import { Badge } from '@/Components/ui/badge';
import { cn } from '@/lib/utils';

interface TagsPanelProps {
  onTagSelect?: (tagId: string) => void;
}

export function TagsPanel({ onTagSelect }: TagsPanelProps) {
  const { data: tags, isLoading } = useQuery({
    queryKey: ['tags'],
    queryFn: () => tagService.getTags(),
  });

  const handleTagClick = (tagId: string) => {
    onTagSelect?.(tagId);
  };

  if (isLoading) {
    return (
      <div className="p-4">
        <p className="text-muted-foreground">Loading tags...</p>
      </div>
    );
  }

  return (
    <div className="h-full overflow-auto">
      <div className="p-4 border-b border-border">
        <h2 className="text-lg font-semibold">Tags</h2>
      </div>
      
      <div className="py-2">
        {tags?.map((tag) => (
          <div
            key={tag.tagId}
            onClick={() => handleTagClick(tag.tagId.toString())}
            className={cn(
              "px-4 py-2 cursor-pointer",
              "hover:bg-accent transition-colors"
            )}
          >
            <div className="flex items-center gap-2">
              <Badge
                variant="outline"
                style={{ 
                  backgroundColor: tag.color || 'hsl(var(--primary) / 0.2)', 
                  color: 'white',
                  borderColor: tag.color || 'hsl(var(--primary))'
                }}
                className="font-medium"
              >
                {tag.name}
              </Badge>
              <span className="text-xs text-muted-foreground">
                ({tag.noteCount || 0})
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}