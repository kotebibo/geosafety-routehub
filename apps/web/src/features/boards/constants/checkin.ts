// Services a checkin column can track. The value is snapshotted onto each
// checkin row at check-in time, so history stays accurate even if the
// column's config changes later.
export const CHECKIN_SERVICES = ['შრომის უსაფრთხოება', 'პერსონალურ მონაცემთა დაცვა'] as const

// Sentinel for the "custom service" option in service pickers
export const CUSTOM_SERVICE = '__custom__'

// Per-checkin visit types shown as a dropdown above the notes field in the
// checkin sheet. Options TBD — populate when the business list is finalized.
export const CHECKIN_TYPES: string[] = []
