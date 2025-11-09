import type { Meta, StoryObj } from '@storybook/react-webpack5'
import { GenericTagAutoComplete } from './TagAutoComplete'
import { IAutoCompleteOptions } from './GenericAutoComplete'

// Sample data for stories
const sampleTags: IAutoCompleteOptions[] = [
    { id: '1', label: 'React', isActive: true },
    { id: '2', label: 'TypeScript', isActive: true },
    { id: '3', label: 'Material-UI', isActive: true },
    { id: '4', label: 'Testing', isActive: true },
    { id: '5', label: 'Documentation', isActive: true },
    { id: '6', label: 'Deprecated Tag', isActive: false },
    { id: '7', label: 'Performance', isActive: true },
    { id: '8', label: 'Security', isActive: true },
];

const meta: Meta<typeof GenericTagAutoComplete> = {
    title: 'Shared/UI/GenericTagAutoComplete',
    component: GenericTagAutoComplete,
    parameters: {
        layout: 'padded',
        docs: {
            description: {
                component: 'A reusable multi-select autocomplete component for tags. Handles comma-separated string values and filters out already selected options.',
            },
        },
    },
    argTypes: {
        options: {
            description: 'Array of available tag options',
            control: 'object',
        },
        value: {
            description: 'Currently selected tags as comma-separated string',
            control: 'text',
        },
        onChange: {
            description: 'Callback when tags change - receives comma-separated string of IDs',
            action: 'onChange',
        },
        disabled: {
            description: 'Whether the component is disabled',
            control: 'boolean',
        },
        label: {
            description: 'Label for the input field',
            control: 'text',
        },
        placeholder: {
            description: 'Placeholder text',
            control: 'text',
        },
        size: {
            description: 'Size of the component',
            control: 'select',
            options: ['small', 'medium'],
        },
    },
};

export default meta;
type Story = StoryObj<typeof GenericTagAutoComplete>;

// Default story
export const Default: Story = {
    args: {
        options: sampleTags,
        label: 'Tags',
        placeholder: '+ Add Tag',
        size: 'small',
    },
};

// With selected tags
export const WithSelectedTags: Story = {
    args: {
        options: sampleTags,
        value: '1,3,5', // React, Material-UI, Documentation
        label: 'Tags',
        placeholder: '+ Add Tag',
        size: 'small',
    },
};

// Disabled state
export const Disabled: Story = {
    args: {
        options: sampleTags,
        value: '1,2',
        disabled: true,
        label: 'Tags',
        placeholder: '+ Add Tag',
        size: 'small',
    },
};

// Medium size
export const MediumSize: Story = {
    args: {
        options: sampleTags,
        label: 'Categories',
        placeholder: '+ Add Category',
        size: 'medium',
    },
};

// Custom styling
export const CustomStyling: Story = {
    args: {
        options: sampleTags,
        label: 'Custom Tags',
        placeholder: '+ Add Custom Tag',
        size: 'small',
    },
};

// Empty options
export const EmptyOptions: Story = {
    args: {
        options: [],
        label: 'No Tags Available',
        placeholder: 'No options to select',
        size: 'small',
    },
};

// With inactive options
export const WithInactiveOptions: Story = {
    args: {
        options: sampleTags, // Includes "Deprecated Tag" with isActive: false
        label: 'Tags (Some Inactive)',
        placeholder: '+ Add Tag',
        size: 'small',
    },
    parameters: {
        docs: {
            description: {
                story: 'Shows how inactive options (isActive: false) are handled. They appear disabled in the dropdown.',
            },
        },
    },
};

// Interactive example
export const Interactive: Story = {
    args: {
        options: sampleTags,
        label: 'Interactive Tags',
        placeholder: '+ Add Tag',
        size: 'small',
    },
    parameters: {
        docs: {
            description: {
                story: 'Interactive example where you can select and deselect tags. Check the Actions panel to see onChange events.',
            },
        },
    },
};