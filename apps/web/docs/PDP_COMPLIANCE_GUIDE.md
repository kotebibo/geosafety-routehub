# Personal Data Protection Compliance System

## Overview

This system tracks the 5-phase compliance process for companies in the Personal Data Protection service. It supports both new companies (requiring all 5 phases) and existing companies (already certified).

## Features

### 🎯 Core Features

1. **Dual Company Types**
   - **New Companies**: Must complete 5 phases before certification
   - **Existing Companies**: Already certified, only need regular checkups

2. **5-Phase Tracking**
   - Phase 1: Initial Assessment (პირველადი შეფასება)
   - Phase 2: Documentation (დოკუმენტაცია)
   - Phase 3: Implementation (დანერგვა)
   - Phase 4: Training (ტრენინგი)
   - Phase 5: Certification (სერტიფიცირება)

3. **Date Management**
   - Plan dates for each phase
   - Track completion dates
   - Schedule regular checkups (every 90 days)

4. **Progress Visualization**
   - Progress bars showing completion percentage
   - Phase status indicators
   - Timeline view

## Database Schema

### Table: `pdp_compliance_phases`

```sql
CREATE TABLE pdp_compliance_phases (
  id UUID PRIMARY KEY,
  company_id UUID REFERENCES companies(id),
  compliance_status compliance_status,  -- 'new', 'in_progress', 'certified', 'active'
  
  -- Phase tracking (1-5)
  phase_N_date DATE,
  phase_N_completed BOOLEAN,
  phase_N_notes TEXT,
  
  -- Certification
  certification_date DATE,
  certificate_number TEXT,
  
  -- Regular checkups
  next_checkup_date DATE,
  checkup_interval_days INTEGER DEFAULT 90,
  
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
);
```

### View: `pdp_compliance_overview`

Provides a comprehensive view with:
- Company details
- Current phase status
- Progress percentage
- Days until next checkup

## File Structure

```
apps/web/src/
├── types/
│   └── compliance.ts              # TypeScript types and phase definitions
├── services/
│   └── compliance.service.ts      # API service layer
├── components/
│   └── compliance/
│       ├── AddCompanyWithCompliance.tsx      # Form to add new company
│       ├── PhaseProgressTracker.tsx          # Shows 5-phase progress
│       ├── ComplianceDashboard.tsx           # Overview of all companies
│       └── index.ts                          # Exports
└── app/
    └── companies/
        └── pdp/
            ├── page.tsx           # Dashboard listing
            ├── new/
            │   └── page.tsx       # Add new company
            └── [id]/
                └── page.tsx       # Company detail with progress
```

## Usage Guide

### 1. Run the Database Migration

Execute the migration in Supabase SQL Editor:

```bash
# The migration file is already created at:
supabase/migrations/005_pdp_compliance_phases.sql
```

### 2. Access the Compliance System

Navigate to:
- **Dashboard**: `/companies/pdp`
- **Add New Company**: `/companies/pdp/new`
- **Company Detail**: `/companies/pdp/[id]`

### 3. Add a New Company

```typescript
// New Company Flow:
1. Navigate to /companies/pdp/new
2. Select "ახალი კომპანია" (New Company)
3. Fill in company information
4. Set planned dates for each of the 5 phases
5. Submit

// Existing Company Flow:
1. Navigate to /companies/pdp/new
2. Select "არსებული კომპანია" (Existing Company)
3. Fill in company information
4. Set next checkup date
5. Submit (all phases marked as completed automatically)
```

### 4. Using the Service API

```typescript
import { complianceService } from '@/services/compliance.service';

// Get company compliance status
const { data, error } = await complianceService.getCompanyCompliance(companyId);

// Create compliance for new company
await complianceService.createCompliance(companyId, true, {
  1: '2025-11-01',
  2: '2025-11-15',
  3: '2025-12-01',
  4: '2025-12-15',
  5: '2026-01-01'
});

// Update phase completion
await complianceService.updatePhase(companyId, 1, {
  date: '2025-11-01',
  completed: true,
  notes: 'Initial assessment completed successfully'
});

// Get pending phases
const { data: pending } = await complianceService.getPendingPhases();

// Get upcoming checkups
const { data: upcoming } = await complianceService.getUpcomingCheckups(30);
```

## Components Usage

### AddCompanyWithCompliance

```tsx
import { AddCompanyWithCompliance } from '@/components/compliance';

<AddCompanyWithCompliance
  onSubmit={async (data) => {
    // Handle submission
    // data.company - company info
    // data.compliance - compliance settings
  }}
  onCancel={() => router.back()}
/>
```

### PhaseProgressTracker

```tsx
import { PhaseProgressTracker } from '@/components/compliance';

<PhaseProgressTracker 
  companyId="uuid-here"
  companyName="Company Name (optional)"
/>
```

### ComplianceDashboard

```tsx
import { ComplianceDashboard } from '@/components/compliance';

<ComplianceDashboard />
```

## Compliance Status Flow

```
New Company:
  new → in_progress → certified → active
  (Phases 0) → (Phases 1-4) → (Phase 5) → (Regular checkups)

Existing Company:
  active (immediately)
  (Skip all phases, go straight to regular checkups)
```

## Automatic Behaviors

1. **Status Updates**: When all 5 phases are completed, status automatically changes to "certified"
2. **Checkup Scheduling**: After certification, next checkup is automatically scheduled 90 days later
3. **Progress Calculation**: Progress percentage is calculated based on completed phases

## Best Practices

1. **Phase Intervals**: Recommended 2-3 weeks between phases
2. **Checkup Frequency**: Default 90 days (3 months) for certified companies
3. **Notes**: Add notes to each phase for audit trail
4. **Date Planning**: Set realistic dates considering company size and complexity

## Troubleshooting

### Company not showing in dashboard
- Check if compliance record was created
- Verify company_id exists in companies table
- Check RLS policies

### Phase won't update
- Ensure user has admin/dispatcher role
- Check phase number (1-5)
- Verify company_id is correct

### Missing compliance data
- Run the migration if not already done
- Check if compliance record exists for the company
- Use `complianceService.getCompanyCompliance()` to debug

## Future Enhancements

- [ ] Email notifications for upcoming phases
- [ ] Bulk phase updates
- [ ] Export compliance reports
- [ ] Phase completion reminders
- [ ] Compliance analytics dashboard
- [ ] Document attachments for each phase
- [ ] Audit log for all changes

## Support

For issues or questions:
1. Check this documentation
2. Review the type definitions in `src/types/compliance.ts`
3. Check the service methods in `src/services/compliance.service.ts`
4. Review the database view `pdp_compliance_overview`
