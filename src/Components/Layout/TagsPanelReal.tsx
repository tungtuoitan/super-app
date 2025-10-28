import React from 'react';
import { Loader2 } from 'lucide-react';

// shadcn components
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '../ui/card';
import { Badge } from '../ui/badge';
import { Alert, AlertDescription } from '../ui/alert';

// Import hooks and services from tags feature
import { useTags, useTagUI, type Tag } from '../../features/tags';

/**
 * TagsPanelProps interface
 */
interface TagsPanelProps {
    /** Optional callback when tag is selected */
    onTagSelect?: (tag: Tag) => void;
}

/**
 * TagsPanel - A flexible layout panel for displaying and managing tags
 */
export function TagsPanel({ onTagSelect }: TagsPanelProps) {
    // Get data from React Query
    const { data: tags, isLoading, error } = useTags();
    
    // Get UI state if available
    const tagUI = useTagUI?.();

    // Handle tag click
    const handleTagClick = (tag: Tag) => {
        onTagSelect?.(tag);
        tagUI?.openDialog?.(tag);
    };

    // Loading state
    if (isLoading) {
        return (
            <Card className="h-full flex items-center justify-center">
                <div className="flex flex-col items-center gap-2">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                    <p className="text-sm text-muted-foreground">
                        Loading tags...
                    </p>
                </div>
            </Card>
        );
    }

    // Error state
    if (error) {
        return (
            <Card className="h-full p-4">
                <Alert variant="destructive">
                    <AlertDescription>
                        Failed to load tags
                    </AlertDescription>
                </Alert>
            </Card>
        );
    }

    // Empty state
    if (!tags || tags.length === 0) {
        return (
            <Card className="h-full p-4">
                <CardHeader>
                    <CardTitle>Tags</CardTitle>
                </CardHeader>
                <CardContent>
                    <p className="text-sm text-muted-foreground">
                        No tags available
                    </p>
                </CardContent>
            </Card>
        );
    }

    return (
        <Card className="h-full flex flex-col">
            <CardHeader className="border-b">
                <CardTitle>Tags</CardTitle>
                <CardDescription>
                    {tags.length} tag{tags.length !== 1 ? 's' : ''}
                </CardDescription>
            </CardHeader>
            
            <CardContent className="flex-1 overflow-auto p-0">
                <div className="divide-y">
                    {tags.map((tag) => (
                        <button
                            key={tag.tagId}
                            onClick={() => handleTagClick(tag)}
                            className="w-full px-4 py-3 text-left hover:bg-accent transition-colors"
                        >
                            <div className="flex items-center gap-2 mb-1">
                                <Badge 
                                    variant="outline"
                                    style={{
                                        backgroundColor: tag.color || 'hsl(var(--primary))',
                                        borderColor: tag.color || 'hsl(var(--primary))',
                                        color: 'white'
                                    }}
                                >
                                    {tag.name}
                                </Badge>
                            </div>
                            {tag.description && (
                                <p className="text-sm text-muted-foreground">
                                    {tag.description}
                                </p>
                            )}
                        </button>
                    ))}
                </div>
            </CardContent>
        </Card>
    );
}