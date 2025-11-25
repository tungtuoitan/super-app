/**
 * EditWorkspaceItemDialog - Dialog for editing workspace item metadata
 * Allows updating label, notes, color, icon, and sort order
 */

import React, { useState, useEffect } from 'react';
import { Edit, Palette, FileText, Tag as TagIcon, Type, Loader2 } from 'lucide-react';
import { useUpdateWorkspaceItem } from '../../hooks/Tags/useWorkspace';
import { useSnackbar } from 'notistack';
import type { UpdateWorkspaceItemRequest } from '../../types/workspace.types';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from '@/Components/ui/dialog';
import { Button } from '@/Components/ui/button';
import { Input } from '@/Components/ui/input';
import { Textarea } from '@/Components/ui/textarea';
import { Label } from '@/Components/ui/label';
import { Alert, AlertDescription } from '@/Components/ui/alert';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/Components/ui/select';

// Predefined color options
const COLOR_OPTIONS = [
    { value: '#F44336', label: 'Red' },
    { value: '#E91E63', label: 'Pink' },
    { value: '#9C27B0', label: 'Purple' },
    { value: '#673AB7', label: 'Deep Purple' },
    { value: '#3F51B5', label: 'Indigo' },
    { value: '#2196F3', label: 'Blue' },
    { value: '#03A9F4', label: 'Light Blue' },
    { value: '#00BCD4', label: 'Cyan' },
    { value: '#009688', label: 'Teal' },
    { value: '#4CAF50', label: 'Green' },
    { value: '#8BC34A', label: 'Light Green' },
    { value: '#CDDC39', label: 'Lime' },
    { value: '#FFEB3B', label: 'Yellow' },
    { value: '#FFC107', label: 'Amber' },
    { value: '#FF9800', label: 'Orange' },
    { value: '#FF5722', label: 'Deep Orange' },
    { value: '#795548', label: 'Brown' },
    { value: '#9E9E9E', label: 'Grey' },
    { value: '#607D8B', label: 'Blue Grey' },
    { value: '#000000', label: 'Black' },
];

interface EditWorkspaceItemDialogProps {
    open: boolean;
    onClose: () => void;
    workspaceId: number;
    itemId: number;
    currentName?: string;
    currentLabel?: string;
    currentNotes?: string;
    currentColor?: string;
    currentIcon?: string;
    currentSortOrder?: number;
    itemName?: string; // For display purposes (e.g., "Edit: Projects")
}

export function EditWorkspaceItemDialog({
    open,
    onClose,
    workspaceId,
    itemId,
    currentName = '',
    currentLabel = '',
    currentNotes = '',
    currentColor = '',
    currentIcon = '',
    currentSortOrder = 0,
    itemName = 'Item',
}: EditWorkspaceItemDialogProps) {
    // Form state
    const [name, setName] = useState(currentName);
    const [label, setLabel] = useState(currentLabel);
    const [notes, setNotes] = useState(currentNotes);
    const [color, setColor] = useState(currentColor);
    const [icon, setIcon] = useState(currentIcon);
    const [sortOrder, setSortOrder] = useState(currentSortOrder);
    const [errors, setErrors] = useState<{ 
        name?: string;
        label?: string; 
        notes?: string; 
        color?: string;
        icon?: string;
        sortOrder?: string;
    }>({});

    // Hooks
    const updateItem = useUpdateWorkspaceItem();
    const { enqueueSnackbar } = useSnackbar();

    // Reset form when dialog opens
    useEffect(() => {
        if (open) {
            setName(currentName);
            setLabel(currentLabel);
            setNotes(currentNotes);
            setColor(currentColor);
            setIcon(currentIcon);
            setSortOrder(currentSortOrder);
            setErrors({});
        }
    }, [open, currentName, currentLabel, currentNotes, currentColor, currentIcon, currentSortOrder]);

    const validate = (): boolean => {
        const newErrors: typeof errors = {};

        if (name && name.length > 200) {
            newErrors.name = 'Name cannot exceed 200 characters';
        }

        if (label && label.length > 200) {
            newErrors.label = 'Label cannot exceed 200 characters';
        }

        if (notes && notes.length > 2000) {
            newErrors.notes = 'Notes cannot exceed 2000 characters';
        }

        if (color && !/^#[0-9A-Fa-f]{6}$/.test(color)) {
            newErrors.color = 'Color must be in hex format (#RRGGBB)';
        }

        if (icon && icon.length > 50) {
            newErrors.icon = 'Icon cannot exceed 50 characters';
        }

        if (sortOrder < 0) {
            newErrors.sortOrder = 'Sort order must be non-negative';
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSave = async () => {
        if (!validate()) {
            return;
        }

        try {
            // Build request with only changed fields
            const request: UpdateWorkspaceItemRequest = {};
            
            // ⚠️ NOTE: Backend UpdateWorkspaceItemRequest currently only supports 'label' field, not 'name'.
            // We're using 'label' to update the item name for now.
            // Priority: if name changed, use it; otherwise check if label changed.
            if (name !== currentName) {
                request.label = name || undefined;
            } else if (label !== currentLabel) {
                request.label = label || undefined;
            }
            
            if (notes !== currentNotes) {
                request.notes = notes || undefined;
            }
            
            if (color !== currentColor) {
                request.color = color || undefined;
            }
            
            if (icon !== currentIcon) {
                request.icon = icon || undefined;
            }
            
            if (sortOrder !== currentSortOrder) {
                request.sortOrder = sortOrder;
            }

            // Check if any field changed
            if (Object.keys(request).length === 0) {
                enqueueSnackbar('No changes to save', { variant: 'info' });
                onClose();
                return;
            }

            console.log('📝 Updating workspace item:', { workspaceId, itemId, request });

            await updateItem.mutateAsync({
                workspaceId,
                itemId,
                request,
            });

            enqueueSnackbar('Item updated successfully', { variant: 'success' });
            onClose();
        } catch (error: any) {
            console.error('❌ Failed to update item:', error);
            
            const errorMessage = error?.response?.data?.message 
                || error?.message 
                || 'Failed to update item';
                
            enqueueSnackbar(errorMessage, { variant: 'error' });
        }
    };

    const handleClose = () => {
        if (!updateItem.isPending) {
            onClose();
        }
    };

    return (
        <Dialog open={open} onOpenChange={handleClose}>
            <DialogContent className="sm:max-w-[525px]">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Edit className="h-5 w-5" />
                        <span>Edit: {itemName}</span>
                    </DialogTitle>
                </DialogHeader>

                <div className="flex flex-col gap-4 py-4">
                    {/* Name */}
                    <div className="flex flex-col gap-2">
                        <Label htmlFor="name" className="flex items-center gap-2">
                            <Type className="h-4 w-4" />
                            Name
                        </Label>
                        <Input
                            id="name"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            className={errors.name ? 'border-red-500' : ''}
                        />
                        {errors.name ? (
                            <p className="text-sm text-red-500">{errors.name}</p>
                        ) : (
                            <p className="text-sm text-muted-foreground">The name of this item</p>
                        )}
                    </div>

                    {/* Label */}
                    <div className="flex flex-col gap-2">
                        <Label htmlFor="label" className="flex items-center gap-2">
                            <TagIcon className="h-4 w-4" />
                            Custom Label
                        </Label>
                        <Input
                            id="label"
                            value={label}
                            onChange={(e) => setLabel(e.target.value)}
                            className={errors.label ? 'border-red-500' : ''}
                        />
                        {errors.label ? (
                            <p className="text-sm text-red-500">{errors.label}</p>
                        ) : (
                            <p className="text-sm text-muted-foreground">Optional custom label for this item</p>
                        )}
                    </div>

                    {/* Notes */}
                    <div className="flex flex-col gap-2">
                        <Label htmlFor="notes" className="flex items-center gap-2">
                            <FileText className="h-4 w-4" />
                            Notes
                        </Label>
                        <Textarea
                            id="notes"
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                            rows={3}
                            className={errors.notes ? 'border-red-500' : ''}
                        />
                        {errors.notes ? (
                            <p className="text-sm text-red-500">{errors.notes}</p>
                        ) : (
                            <p className="text-sm text-muted-foreground">Additional notes about this item</p>
                        )}
                    </div>

                    {/* Color */}
                    <div className="flex flex-col gap-2">
                        <Label htmlFor="color" className="flex items-center gap-2">
                            <Palette className="h-4 w-4" />
                            Color
                        </Label>
                        <Select value={color} onValueChange={setColor}>
                            <SelectTrigger id="color" className={errors.color ? 'border-red-500' : ''}>
                                <SelectValue placeholder="Select a color" />
                            </SelectTrigger>
                            <SelectContent>
                                {COLOR_OPTIONS.map((option) => (
                                    <SelectItem key={option.value} value={option.value}>
                                        <div className="flex items-center gap-2">
                                            <div
                                                className="h-4 w-4 rounded border"
                                                style={{ backgroundColor: option.value }}
                                            />
                                            <span>{option.label}</span>
                                        </div>
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        {errors.color && (
                            <p className="text-sm text-red-500">{errors.color}</p>
                        )}
                        
                        {/* Color Preview */}
                        {color && (
                            <div className="flex items-center gap-2">
                                <div
                                    className="h-6 w-6 rounded border"
                                    style={{ backgroundColor: color }}
                                />
                                <span className="text-sm text-muted-foreground">{color}</span>
                            </div>
                        )}
                    </div>

                    {/* Icon */}
                    <div className="flex flex-col gap-2">
                        <Label htmlFor="icon">Icon</Label>
                        <Input
                            id="icon"
                            value={icon}
                            onChange={(e) => setIcon(e.target.value)}
                            className={errors.icon ? 'border-red-500' : ''}
                        />
                        {errors.icon ? (
                            <p className="text-sm text-red-500">{errors.icon}</p>
                        ) : (
                            <p className="text-sm text-muted-foreground">Icon identifier (optional)</p>
                        )}
                    </div>

                    {/* Sort Order */}
                    <div className="flex flex-col gap-2">
                        <Label htmlFor="sortOrder">Sort Order</Label>
                        <Input
                            id="sortOrder"
                            type="number"
                            value={sortOrder}
                            onChange={(e) => setSortOrder(Number(e.target.value))}
                            min={0}
                            className={errors.sortOrder ? 'border-red-500' : ''}
                        />
                        {errors.sortOrder ? (
                            <p className="text-sm text-red-500">{errors.sortOrder}</p>
                        ) : (
                            <p className="text-sm text-muted-foreground">Display order (lower numbers appear first)</p>
                        )}
                    </div>

                    {/* Error Alert */}
                    {updateItem.isError && (
                        <Alert variant="destructive">
                            <AlertDescription>
                                Failed to update item. Please try again.
                            </AlertDescription>
                        </Alert>
                    )}
                </div>

                <DialogFooter>
                    <Button 
                        variant="outline"
                        onClick={handleClose}
                        disabled={updateItem.isPending}
                    >
                        Cancel
                    </Button>
                    <Button
                        onClick={handleSave}
                        disabled={updateItem.isPending}
                    >
                        {updateItem.isPending ? (
                            <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Saving...
                            </>
                        ) : (
                            <>
                                <Edit className="mr-2 h-4 w-4" />
                                Save Changes
                            </>
                        )}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
