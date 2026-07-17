import type { BoardColumn } from '@/types/board'

export interface StatusOption {
  key: string
  label: string
  color: string
}

// Monday.com color palette
export const MONDAY_COLORS: Record<string, { hex: string; text: string }> = {
  // Greens
  grass_green: { hex: '#00C875', text: '#FFFFFF' },
  done_green: { hex: '#00C875', text: '#FFFFFF' },
  bright_green: { hex: '#9CD326', text: '#FFFFFF' },
  saladish: { hex: '#CAB641', text: '#FFFFFF' },
  // Yellows/Oranges
  egg_yolk: { hex: '#FFCB00', text: '#323338' },
  working_orange: { hex: '#FDAB3D', text: '#FFFFFF' },
  dark_orange: { hex: '#FF642E', text: '#FFFFFF' },
  // Reds/Pinks
  peach: { hex: '#FFADAD', text: '#323338' },
  sunset: { hex: '#FF7575', text: '#FFFFFF' },
  stuck_red: { hex: '#E2445C', text: '#FFFFFF' },
  dark_red: { hex: '#BB3354', text: '#FFFFFF' },
  sofia_pink: { hex: '#FF158A', text: '#FFFFFF' },
  lipstick: { hex: '#FF5AC4', text: '#FFFFFF' },
  bubble: { hex: '#FAA1F1', text: '#323338' },
  // Purples
  purple: { hex: '#A25DDC', text: '#FFFFFF' },
  dark_purple: { hex: '#784BD1', text: '#FFFFFF' },
  berry: { hex: '#7E3B8A', text: '#FFFFFF' },
  dark_indigo: { hex: '#401694', text: '#FFFFFF' },
  indigo: { hex: '#5559DF', text: '#FFFFFF' },
  // Blues
  navy: { hex: '#225091', text: '#FFFFFF' },
  bright_blue: { hex: '#579BFC', text: '#FFFFFF' },
  dark_blue: { hex: '#0086C0', text: '#FFFFFF' },
  aquamarine: { hex: '#4ECCC6', text: '#FFFFFF' },
  chili_blue: { hex: '#66CCFF', text: '#323338' },
  river: { hex: '#68A1BD', text: '#FFFFFF' },
  // Grays
  winter: { hex: '#9AADBD', text: '#FFFFFF' },
  explosive: { hex: '#C4C4C4', text: '#323338' },
  american_gray: { hex: '#808080', text: '#FFFFFF' },
  blackish: { hex: '#333333', text: '#FFFFFF' },
}

// Legacy color mapping (for backwards compatibility)
const LEGACY_COLOR_MAP: Record<string, string> = {
  gray: 'explosive',
  blue: 'bright_blue',
  green: 'grass_green',
  yellow: 'egg_yolk',
  orange: 'working_orange',
  red: 'stuck_red',
  purple: 'purple',
  pink: 'sofia_pink',
}

// Default status options if column config doesn't specify
export const DEFAULT_STATUS_OPTIONS: StatusOption[] = [
  { key: 'not_started', label: 'Not Started', color: 'explosive' },
  { key: 'working_on_it', label: 'Working on it', color: 'working_orange' },
  { key: 'stuck', label: 'Stuck', color: 'stuck_red' },
  { key: 'done', label: 'Done', color: 'grass_green' },
]

export function getColorInfo(colorKey: string): { hex: string; text: string } {
  // Check if it's a legacy color name
  const mappedColor = LEGACY_COLOR_MAP[colorKey]
  if (mappedColor && MONDAY_COLORS[mappedColor]) {
    return MONDAY_COLORS[mappedColor]
  }
  // Check if it's a Monday color key
  if (MONDAY_COLORS[colorKey]) {
    return MONDAY_COLORS[colorKey]
  }
  // Default fallback
  return MONDAY_COLORS.explosive
}

/**
 * Parse a status column's configured options (array or object shape) into a
 * normalized StatusOption[], falling back to DEFAULT_STATUS_OPTIONS when the
 * column has no config. Single source of truth shared by StatusCell (on-screen
 * rendering) and the board exporter, so the two never drift apart.
 */
export function resolveStatusOptions(column: BoardColumn): StatusOption[] {
  if (!column.config?.options) {
    return DEFAULT_STATUS_OPTIONS
  }

  if (Array.isArray(column.config.options)) {
    return column.config.options.map((opt: any) => ({
      key: opt.key || opt.label?.toLowerCase().replace(/\s+/g, '_'),
      label: opt.label,
      color: opt.color,
    }))
  }

  return Object.entries(column.config.options).map(([key, opt]: [string, any]) => ({
    key,
    label: opt.label,
    color: opt.color,
  }))
}
