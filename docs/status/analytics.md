# Analytics — STABLE

Four-tab financial dashboard at `/analytics`, reading directly from the boards (კომპანიები, ინსპექტორები/ლოკაციები, შემაჯამებელი).

## What exists

- **Finance**: total revenue, active contracts, locations, avg revenue/company; service-type revenue split; payment-method breakdown; monthly trend; top companies; activity breakdown
- **Inspectors**: revenue and location bar charts, workload scatter (locations vs revenue), revenue share, top 15 locations
- **Companies**: contract expiry timeline, value distribution buckets, expiring-contracts table sorted by days remaining
- **Forecast**: 12-month revenue projection, retention rate, cumulative loss chart, monthly detail table

## Notes

- Built on `board-analytics.service.ts` (the older `analytics.service.ts` was dead code — removed in the July cleanup)
- Board-name and column-name dependent: it finds boards by Georgian names and reads specific data columns — a board rename would silently break charts. Acceptable today; worth a config mapping if boards get renamed
- No gaps blocking use; charts and KPIs verified present and wired
