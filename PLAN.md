# Implementation Plan: Company Multi-Location Support

## Understanding Your Request

You want to support companies with **multiple locations/branches** (e.g., franchise chains like McDonald's with many stores). Currently, a company has only ONE address. You need:

1. **Company Creation Page**: Ability to add multiple locations/branches for a company
2. **Boards Page**: When selecting a company in a board, show a location picker if the company has multiple locations
3. **Address Column**: Display the selected location's address next to the company

---

## Current State

### Companies Table (Current)
```
companies
├── id (uuid)
├── name (text)
├── address (text)        ← Single address only
├── lat (float)           ← Single coordinates
├── lng (float)
├── type (text)
├── priority (text)
├── status (text)
├── contact_name (text)
├── contact_phone (text)
├── contact_email (text)
├── notes (text)
└── created_at, updated_at
```

### Problem
- One company = one address
- Can't represent "Carrefour" with 10 store locations
- Board CompanyCell just shows company name, no location info

---

## Proposed Solution

### New Database Table: `company_locations`

```sql
CREATE TABLE company_locations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,              -- "Main Office", "Branch #1", "Tbilisi Mall Store"
  address TEXT NOT NULL,
  lat FLOAT,
  lng FLOAT,
  is_primary BOOLEAN DEFAULT false, -- Mark one as the main/HQ location
  contact_name TEXT,               -- Location-specific contact (optional)
  contact_phone TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for fast lookups
CREATE INDEX idx_company_locations_company_id ON company_locations(company_id);
```

### Data Flow

**For companies with ONE location:**
- Stored in `company_locations` with `is_primary = true`
- Company picker shows company only (no location sub-picker)
- Address displays automatically

**For companies with MULTIPLE locations:**
- All locations stored in `company_locations`
- One marked as `is_primary = true` (headquarters)
- Company picker shows company, then location dropdown appears
- User selects specific branch

---

## Implementation Steps

### Phase 1: Database & Backend

**1.1 Create Migration**
- File: `supabase/migrations/026_company_locations.sql`
- Create `company_locations` table
- Migrate existing company addresses to `company_locations` (as primary)

**1.2 Update Services**
- File: `apps/web/src/services/companies.service.ts`
- Add methods:
  - `getLocations(companyId)` - Get all locations for a company
  - `createLocation(companyId, locationData)` - Add new location
  - `updateLocation(locationId, data)` - Update location
  - `deleteLocation(locationId)` - Delete location
  - `setLocationPrimary(locationId)` - Mark as primary

**1.3 Create Types**
- File: `apps/web/src/types/company.ts`
```typescript
interface CompanyLocation {
  id: string
  company_id: string
  name: string
  address: string
  lat?: number
  lng?: number
  is_primary: boolean
  contact_name?: string
  contact_phone?: string
  notes?: string
  created_at: string
  updated_at: string
}
```

---

### Phase 2: Company Creation Page

**2.1 Update Company Form**
- File: `apps/web/app/companies/new/page.tsx`
- Remove single `address` field
- Add "Locations" section with:
  - List of locations (cards)
  - "Add Location" button
  - Each location card has: name, address, lat/lng, is_primary toggle

**2.2 Create LocationManager Component**
- File: `apps/web/src/features/companies/components/LocationManager.tsx`
- Features:
  - Add/edit/delete locations
  - Set primary location
  - Optional: Map picker for coordinates
  - Minimum 1 location required

**2.3 UI Design**
```
┌─────────────────────────────────────────────────────────┐
│ Locations                                    [+ Add]    │
├─────────────────────────────────────────────────────────┤
│ ┌─────────────────────────────────────────────────────┐ │
│ │ ★ Main Office (Primary)                    [Edit]   │ │
│ │   123 Main Street, Tbilisi                [Delete]  │ │
│ └─────────────────────────────────────────────────────┘ │
│ ┌─────────────────────────────────────────────────────┐ │
│ │   Tbilisi Mall Branch                      [Edit]   │ │
│ │   45 Mall Ave, Tbilisi                    [Delete]  │ │
│ │                                   [Set as Primary]  │ │
│ └─────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────┘
```

---

### Phase 3: Board Integration

**3.1 Update Column Type**
- The `company` column type needs to store BOTH:
  - `company_id` - Which company
  - `location_id` - Which location (optional, null = primary)

**3.2 Cell Value Structure**
```typescript
// Current: just company_id (string)
value: "company-uuid-123"

// New: object with company + location
value: {
  company_id: "company-uuid-123",
  location_id: "location-uuid-456" | null  // null = use primary
}
```

**3.3 Update CompanyCell**
- File: `apps/web/src/features/boards/components/BoardTable/cells/CompanyCell.tsx`
- Display company name
- If company has multiple locations → show selected location name too

**3.4 Update CompanyPicker**
- File: `apps/web/src/features/boards/components/CompanyPicker.tsx`
- Step 1: Select company (existing)
- Step 2: If company has multiple locations → show location picker
- Step 3: Return `{ company_id, location_id }`

**3.5 Add Address Column**
- Add new column type: `company_address` (or use existing `text` derived)
- Auto-populated from selected company location
- Read-only, displays address based on company cell value

---

### Phase 4: New Address Column Type

**4.1 Create CompanyAddressCell**
- File: `apps/web/src/features/boards/components/BoardTable/cells/CompanyAddressCell.tsx`
- Props: `companyColumnId` (which company column to read from)
- Looks up the company + location → displays address
- Read-only (no editing - derived from company selection)

**4.2 Update CellRenderer**
- Add case for `company_address` column type

**4.3 Column Config**
- When adding `company_address` column, specify which `company` column it links to

---

## File Changes Summary

### New Files
1. `supabase/migrations/026_company_locations.sql` - Database migration
2. `apps/web/src/types/company.ts` - Type definitions
3. `apps/web/src/features/companies/components/LocationManager.tsx` - Location CRUD UI
4. `apps/web/src/features/boards/components/BoardTable/cells/CompanyAddressCell.tsx` - Address display
5. `apps/web/src/features/boards/components/LocationPicker.tsx` - Location dropdown

### Modified Files
1. `apps/web/src/services/companies.service.ts` - Add location methods
2. `apps/web/app/companies/new/page.tsx` - Add LocationManager
3. `apps/web/src/features/boards/components/BoardTable/cells/CompanyCell.tsx` - Show location info
4. `apps/web/src/features/boards/components/CompanyPicker.tsx` - Add location step
5. `apps/web/src/features/boards/components/BoardTable/CellRenderer.tsx` - Add company_address case
6. `apps/web/src/features/boards/types/board.ts` - Add `company_address` to ColumnType
7. `apps/web/src/types/board.ts` - Add `company_address` to ColumnType
8. `apps/web/src/hooks/useCompanies.ts` - Include locations in data

---

## Migration Strategy

For existing data:
1. For each company with an address → create one `company_location` row (is_primary = true)
2. Keep backward compatibility: if `location_id` is null → use primary location
3. Existing board items with company values will work (treated as primary location)

---

## Questions to Confirm

1. **Location naming**: Should locations have custom names (e.g., "Downtown Branch") or just addresses?
   - **Recommendation**: Both - name + address

2. **Map integration**: Do you want a map picker for lat/lng coordinates?
   - **Recommendation**: Nice to have, can add later

3. **Address column behavior**: Should it be:
   - A) Automatic (linked to company column, updates when company changes)
   - B) Manual (user can override)
   - **Recommendation**: A - Automatic/linked

4. **Column placement**: Should address column auto-appear next to company column?
   - **Recommendation**: User adds it manually via "Add Column"

---

## Estimated Effort

| Phase | Description | Complexity |
|-------|-------------|------------|
| Phase 1 | Database & Backend | Medium |
| Phase 2 | Company Creation Page | Medium |
| Phase 3 | Board Integration | Medium-High |
| Phase 4 | Address Column | Low |

**Total**: ~4 phases of work

---

## Ready to Implement?

Once you approve this plan, I'll start with Phase 1 (database migration and backend services).
