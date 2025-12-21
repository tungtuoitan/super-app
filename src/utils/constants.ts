/**
 * Static Constants
 * Non-configuration constants used throughout the app
 */

const noteTypes = {
  meeting: 'Meeting',
  brainstorm: 'Brainstorm',
  research: 'Research',
  bug: 'Bug',
} as const;

export const constants = {
  noteTypes,

  noteTypeColors: {
    [noteTypes.meeting]: 'primary',
    [noteTypes.brainstorm]: 'warning',
    [noteTypes.research]: 'info',
    [noteTypes.bug]: 'error',
    default: 'default',
  } as const,

  tabTypes: {
    note: 'note',
    workspace: 'workspace',
  } as const,

  itemTypes: {
    note: 'note',
    workspace: 'workspace',
    file: 'file',
    folder: 'folder',
    tag: 'tag',
  } as const,

  contextMenuTypes: {
    default: 'default',
    tag: 'tag',
    note: 'note',
    file: 'file',
    folder: 'folder',
    noteGrid: 'note-grid',
    workspaceGrid: 'workspace-grid',
  } as const,

  viewTypes: {
    workspace: 'workspace',
    workspaceList: 'workspaceList',
    note: 'note',
    notes: 'notes',
  } as const,

  displayNames: {
    note: 'Note',
    workspace: 'Workspace',
    file: 'File',
    folder: 'Folder',
    tag: 'Tag',
    notes: 'Notes',
  } as const,

  pagination: {
    defaultPageSize: 25,
    pageSizeOptions: [25, 50, 100],
  } as const,

  grid: {
    rowHeight: 50,
    headerHeight: 52,
    columnBuffer: 150,
    rowBuffer: 250,
  } as const,

  workspace: {
    rootId: -12345, // Virtual ID for workspace root node
  } as const,
} as const;
