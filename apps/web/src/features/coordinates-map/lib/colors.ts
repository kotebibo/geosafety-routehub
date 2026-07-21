export const INSPECTOR_COLORS = [
  '#3B82F6',
  '#EF4444',
  '#10B981',
  '#F59E0B',
  '#8B5CF6',
  '#EC4899',
  '#06B6D4',
  '#F97316',
  '#6366F1',
  '#14B8A6',
  '#E11D48',
  '#84CC16',
  '#0EA5E9',
  '#A855F7',
  '#D946EF',
  '#65A30D',
  '#0891B2',
  '#DC2626',
  '#7C3AED',
  '#059669',
]

// Color is derived from the inspector's index in the full sorted list so the
// same inspector keeps the same color in the sidebar and on the map,
// regardless of which items are currently filtered in.
export function getInspectorColor(inspector: string, inspectors: string[]): string {
  const idx = inspectors.indexOf(inspector)
  return INSPECTOR_COLORS[(idx < 0 ? 0 : idx) % INSPECTOR_COLORS.length]
}
