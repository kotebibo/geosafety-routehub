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
