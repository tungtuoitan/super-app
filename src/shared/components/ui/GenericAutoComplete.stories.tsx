import type { Meta, StoryObj } from '@storybook/react-webpack5'
import { GenericAutoComplete } from './GenericAutoComplete'

const meta: Meta<typeof GenericAutoComplete> = {
  title: 'UI Components/GenericAutoComplete',
  component: GenericAutoComplete,
  parameters: {
    layout: 'padded',
  },
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof meta>;

// Mock options for the stories
const mockOptions = [
  { id: 1, label: 'Option 1', desc: 'First option' },
  { id: 2, label: 'Option 2', desc: 'Second option' },
  { id: 3, label: 'Option 3', desc: 'Third option' },
  { id: 4, label: 'Disabled Option', desc: 'This option is disabled', isActive: false },
  { id: 5, label: 'Meeting', desc: 'Meeting type' },
  { id: 6, label: 'Brainstorm', desc: 'Brainstorm session' },
  { id: 7, label: 'Research', desc: 'Research activity' },
];

// Default/Normal size story
export const Normal: Story = {
  args: {
    inputProps: {
      name: 'normalSelect',
      label: 'Normal Size',
      required: false,
      error: false,
    },
    allOptions: mockOptions,
    value: null,
    disableClearable: false,
    disabled: false,
  },
};

// Small size story (matching the reference code style)
export const Small: Story = {
  args: {
    inputProps: {
      name: 'smallSelect',
      label: 'Small Size',
      required: false,
      error: false,
    },
    allOptions: mockOptions,
    value: null,
    size: 'small',
    disableClearable: false,
    disabled: false,
    style: { marginBottom: '16px' },
  },
};

// Small with selected value
export const SmallWithValue: Story = {
  args: {
    inputProps: {
      name: 'smallWithValue',
      label: 'Small Size (Selected)',
      required: false,
      error: false,
    },
    allOptions: mockOptions,
    value: mockOptions[1], // Option 2 selected
    size: 'small',
    disableClearable: true,
    disabled: false,
    style: { marginBottom: '16px' },
  },
};

// Required with error state
export const RequiredWithError: Story = {
  args: {
    inputProps: {
      name: 'requiredError',
      label: 'Required Field',
      required: true,
      error: true,
    },
    allOptions: mockOptions,
    value: null,
    disableClearable: true,
    disabled: false,
  },
};

// Disabled state
export const Disabled: Story = {
  args: {
    inputProps: {
      name: 'disabled',
      label: 'Disabled',
      required: false,
      error: false,
    },
    allOptions: mockOptions,
    value: mockOptions[0],
    disableClearable: true,
    disabled: true,
  },
};

// Small disabled (as used in RequestDetail when conditions are met)
export const SmallDisabled: Story = {
  args: {
    inputProps: {
      name: 'smallDisabled',
      label: 'Small Disabled',
      required: false,
      error: false,
    },
    allOptions: mockOptions,
    value: mockOptions[0],
    size: 'small',
    disableClearable: true,
    disabled: true,
    style: { marginBottom: '16px' },
  },
};

// RFD Status example (matching the reference code exactly)
export const RFDStatusExample: Story = {
  args: {
    id: 'requestDetailStatus',
    inputProps: {
      name: 'RFD Status',
      label: 'RFD Status',
    },
    disableClearable: true,
    disabled: false,
    size: 'small',
    style: { marginBottom: '16px' },
    allOptions: [
      { id: 'P', label: 'Pending', desc: 'Pending status' },
      { id: 'A', label: 'Approved', desc: 'Approved status' },
      { id: 'R', label: 'Rejected', desc: 'Rejected status' },
      { id: 'O', label: 'Obsolete', desc: 'Obsolete status', isActive: false },
    ],
    value: { id: 'P', label: 'Pending', desc: 'Pending status' },
  },
};