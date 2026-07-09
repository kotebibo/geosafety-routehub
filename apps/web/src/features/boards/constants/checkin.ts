// Services a checkin column can track. The value is snapshotted onto each
// checkin row at check-in time, so history stays accurate even if the
// column's config changes later.
export const CHECKIN_SERVICES = ['შრომის უსაფრთხოება', 'პერსონალურ მონაცემთა დაცვა'] as const

// Sentinel for the "custom service" option in service pickers
export const CUSTOM_SERVICE = '__custom__'

// Per-checkin visit types shown as a dropdown above the notes field in the
// checkin sheet, keyed by the column's service. The type doubles as the
// company's stage: when the column has a stage_column_id configured, the
// server sets that status column to the visit type on every check-in.
export const CHECKIN_TYPES_BY_SERVICE: Record<string, string[]> = {
  'პერსონალურ მონაცემთა დაცვა': [
    'პირველადი მონიტორინგი',
    'კითხვარის დამუშავება',
    'დამატებითი დოკუმენტაციის მიწოდება და განხილვა',
    'პერსონალურ მონაცემთა დაცვის პოლიტიკის შემუშავება და დამტკიცება',
    'პირველი სწავლება',
    'დამატებითი პოლიტიკებისა და პროცედურების შემუშავება',
    'ზეგავლენის დოკუმენტის შემუშავება და დამტკიცება',
    'მეორე სწავლება',
    'პერიოდული მონიტორინგები',
  ],
}

export function getCheckinTypes(service?: string | null): string[] {
  return service ? (CHECKIN_TYPES_BY_SERVICE[service] ?? []) : []
}

// Catch-all visit type appended to every service's dropdown. Deliberately
// NOT a stage: the stage automation skips it so an "other" visit never
// overwrites the company's pipeline stage.
export const OTHER_VISIT_TYPE = 'სხვა'

// An item is flagged overdue (red border on the checkin cell) when its
// latest visit is older than this many days
export const OVERDUE_VISIT_DAYS = 35

// Distinct colors assigned to stages in order (keys from MONDAY_COLORS)
export const STAGE_COLOR_SEQUENCE = [
  'bright_blue',
  'working_orange',
  'purple',
  'aquamarine',
  'egg_yolk',
  'dark_blue',
  'sunset',
  'indigo',
  'grass_green',
]

// Status cells store the option KEY (label with spaces → underscores)
export function statusOptionKey(label: string): string {
  return label.toLowerCase().replace(/\s+/g, '_')
}

// Full option set for a stage status column — seeded onto the linked status
// column when stage_column_id is configured, so every stage is visible and
// pickable immediately instead of appearing one-by-one as checkins happen
export function buildStageOptions(
  service?: string | null
): Array<{ key: string; label: string; color: string }> {
  return getCheckinTypes(service).map((label, i) => ({
    key: statusOptionKey(label),
    label,
    color: STAGE_COLOR_SEQUENCE[i % STAGE_COLOR_SEQUENCE.length],
  }))
}
