/**
 * Static Constants
 * Non-configuration constants used throughout the app
 */

export const NOTE_TYPES = {
  MEETING: 'Meeting',
  BRAINSTORM: 'Brainstorm',
  RESEARCH: 'Research',
  BUG: 'Bug',
} as const;

export const NOTE_TYPE_COLORS = {
  [NOTE_TYPES.MEETING]: 'primary',
  [NOTE_TYPES.BRAINSTORM]: 'warning',
  [NOTE_TYPES.RESEARCH]: 'info',
  [NOTE_TYPES.BUG]: 'error',
  default: 'default',
} as const;

export const PAGINATION = {
  DEFAULT_PAGE_SIZE: 25,
  PAGE_SIZE_OPTIONS: [25, 50, 100],
} as const;

export const GRID = {
  ROW_HEIGHT: 50,
  HEADER_HEIGHT: 52,
  COLUMN_BUFFER: 150,
  ROW_BUFFER: 250,
} as const;

export const WORKSPACE = {
  ROOT_ID: -12345, // Virtual ID for workspace root node
} as const;
