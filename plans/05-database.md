# Database & Query Layer Improvement Plan

## Overview
Optimize the database layer for better performance, type safety, and maintainability using Supabase, PostGIS, and React Query.

## Current State Analysis

### Strengths
- PostGIS enabled for geospatial queries
- 34+ migrations for schema evolution
- Basic indexing strategy
- JSONB for flexible data (board columns, working hours)
- Automatic `updated_at` triggers

### Pain Points
- 34 migrations make schema hard to understand
- Mixed migration naming conventions
- `supabase as any` type assertions
- Missing composite indexes
- No query optimization guidelines
- Inconsistent React Query key patterns

## Improvement Areas

### 1. Schema Consolidation

#### 1.1 Create Schema Documentation
```sql
-- docs/schema.sql (consolidated reference)

-- Core Domain Tables
-- ==================

-- Companies: Client organizations requiring inspections
CREATE TABLE companies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  type company_type NOT NULL DEFAULT 'commercial',
  priority priority_level NOT NULL DEFAULT 'medium',
  status entity_status NOT NULL DEFAULT 'active',
  contact_name VARCHAR(255),
  contact_phone VARCHAR(50),
  contact_email VARCHAR(255),
  notes TEXT,
  inspection_frequency INTEGER DEFAULT 90,
  last_inspection_date DATE,
  next_inspection_date DATE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Company Locations: Physical addresses for companies
CREATE TABLE company_locations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  name VARCHAR(255),
  address TEXT NOT NULL,
  location GEOGRAPHY(Point, 4326),
  lat DECIMAL(10, 8) NOT NULL,
  lng DECIMAL(11, 8) NOT NULL,
  is_primary BOOLEAN DEFAULT FALSE,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Inspectors: Users who perform inspections
CREATE TABLE inspectors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  auth_user_id UUID UNIQUE REFERENCES auth.users(id),
  email VARCHAR(255) UNIQUE NOT NULL,
  full_name VARCHAR(255) NOT NULL,
  phone VARCHAR(50),
  role user_role DEFAULT 'inspector',
  specialty VARCHAR(100),
  vehicle_type VARCHAR(100),
  license_plate VARCHAR(50),
  status entity_status DEFAULT 'active',
  working_hours JSONB DEFAULT '{"start": "08:00", "end": "17:00"}',
  zone VARCHAR(100),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### 1.2 Migrate to Proper Enums
```sql
-- Create proper PostgreSQL enums instead of CHECK constraints
CREATE TYPE company_type AS ENUM (
  'commercial', 'residential', 'industrial', 'healthcare', 'education'
);

CREATE TYPE priority_level AS ENUM ('low', 'medium', 'high');

CREATE TYPE entity_status AS ENUM ('active', 'inactive', 'pending', 'on_leave');

CREATE TYPE user_role AS ENUM ('admin', 'dispatcher', 'inspector', 'manager');

CREATE TYPE route_status AS ENUM ('planned', 'in_progress', 'completed', 'cancelled');

CREATE TYPE stop_status AS ENUM ('pending', 'in_progress', 'completed', 'skipped', 'failed');
```

### 2. Type Generation

#### 2.1 Supabase CLI Types
```bash
# Generate types from remote database
npx supabase gen types typescript --project-id $PROJECT_ID > src/types/database.ts

# Or from local database
npx supabase gen types typescript --local > src/types/database.ts
```

#### 2.2 Type Utilities
```typescript
// types/database.utils.ts
import type { Database } from './database'

// Table types
export type Tables = Database['public']['Tables']
export type Company = Tables['companies']['Row']
export type CompanyInsert = Tables['companies']['Insert']
export type CompanyUpdate = Tables['companies']['Update']

export type Inspector = Tables['inspectors']['Row']
export type Route = Tables['routes']['Row']
export type BoardItem = Tables['board_items']['Row']

// Enum types
export type CompanyType = Database['public']['Enums']['company_type']
export type PriorityLevel = Database['public']['Enums']['priority_level']
export type EntityStatus = Database['public']['Enums']['entity_status']

// View types
export type CompanyWithLocations = Tables['companies_with_location_count']['Row']

// Typed client factory
import { createClient } from '@supabase/supabase-js'

export function createTypedClient() {
  return createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}
```

### 3. Query Optimization

#### 3.1 Composite Indexes
```sql
-- Add composite indexes for common query patterns

-- Board items with group and position (for board loading)
CREATE INDEX idx_board_items_board_group_position
  ON board_items(board_id, group_id, position);

-- Routes by date range and inspector
CREATE INDEX idx_routes_date_range_inspector
  ON routes(date, inspector_id) WHERE status != 'cancelled';

-- Companies by type and status (for filtered lists)
CREATE INDEX idx_companies_type_status
  ON companies(type, status);

-- Inspectors by role and status
CREATE INDEX idx_inspectors_role_status
  ON inspectors(role, status);
```

#### 3.2 Materialized Views
```sql
-- Materialized view for dashboard statistics
CREATE MATERIALIZED VIEW dashboard_stats AS
SELECT
  (SELECT COUNT(*) FROM companies WHERE status = 'active') as active_companies,
  (SELECT COUNT(*) FROM inspectors WHERE status = 'active') as active_inspectors,
  (SELECT COUNT(*) FROM routes WHERE date = CURRENT_DATE) as routes_today,
  (SELECT COUNT(*) FROM routes WHERE date = CURRENT_DATE AND status = 'completed') as completed_today,
  (SELECT COUNT(*) FROM companies WHERE next_inspection_date < CURRENT_DATE) as overdue_inspections,
  NOW() as refreshed_at;

-- Refresh function
CREATE OR REPLACE FUNCTION refresh_dashboard_stats()
RETURNS void AS $$
BEGIN
  REFRESH MATERIALIZED VIEW dashboard_stats;
END;
$$ LANGUAGE plpgsql;

-- Auto-refresh every 5 minutes via pg_cron (if available)
-- SELECT cron.schedule('refresh-dashboard', '*/5 * * * *', 'SELECT refresh_dashboard_stats()');
```

#### 3.3 Query Helpers
```typescript
// lib/database/queries.ts
import { createTypedClient } from '@/types/database.utils'

const db = createTypedClient()

// Paginated query helper
export async function paginatedQuery<T>(
  table: string,
  options: {
    page?: number
    limit?: number
    orderBy?: string
    ascending?: boolean
    filters?: Record<string, unknown>
  }
): Promise<{ data: T[]; count: number; hasMore: boolean }> {
  const { page = 1, limit = 20, orderBy = 'created_at', ascending = false, filters = {} } = options

  let query = db.from(table).select('*', { count: 'exact' })

  // Apply filters
  Object.entries(filters).forEach(([key, value]) => {
    if (value !== undefined) {
      query = query.eq(key, value)
    }
  })

  // Apply ordering and pagination
  query = query
    .order(orderBy, { ascending })
    .range((page - 1) * limit, page * limit - 1)

  const { data, count, error } = await query

  if (error) throw error

  return {
    data: data as T[],
    count: count || 0,
    hasMore: (count || 0) > page * limit,
  }
}

// Geospatial query helper
export async function nearbyCompanies(
  lat: number,
  lng: number,
  radiusKm: number
): Promise<Company[]> {
  const { data, error } = await db.rpc('nearby_companies', {
    p_lat: lat,
    p_lng: lng,
    p_radius_km: radiusKm,
  })

  if (error) throw error
  return data
}
```

### 4. React Query Integration

#### 4.1 Standardized Query Keys
```typescript
// lib/react-query/keys.ts
export const queryKeys = {
  // Companies
  companies: {
    all: ['companies'] as const,
    lists: () => [...queryKeys.companies.all, 'list'] as const,
    list: (filters: Record<string, unknown>) =>
      [...queryKeys.companies.lists(), filters] as const,
    details: () => [...queryKeys.companies.all, 'detail'] as const,
    detail: (id: string) => [...queryKeys.companies.details(), id] as const,
    locations: (companyId: string) =>
      [...queryKeys.companies.detail(companyId), 'locations'] as const,
  },

  // Inspectors
  inspectors: {
    all: ['inspectors'] as const,
    lists: () => [...queryKeys.inspectors.all, 'list'] as const,
    list: (filters: { status?: string; role?: string }) =>
      [...queryKeys.inspectors.lists(), filters] as const,
    detail: (id: string) => [...queryKeys.inspectors.all, 'detail', id] as const,
    workload: (id: string) => [...queryKeys.inspectors.detail(id), 'workload'] as const,
  },

  // Routes
  routes: {
    all: ['routes'] as const,
    byDate: (date: string) => [...queryKeys.routes.all, 'date', date] as const,
    byInspector: (inspectorId: string, date?: string) =>
      [...queryKeys.routes.all, 'inspector', inspectorId, date].filter(Boolean) as const,
    detail: (id: string) => [...queryKeys.routes.all, 'detail', id] as const,
  },

  // Boards
  boards: {
    all: ['boards'] as const,
    detail: (id: string) => [...queryKeys.boards.all, 'detail', id] as const,
    items: (boardId: string) => [...queryKeys.boards.detail(boardId), 'items'] as const,
    columns: (boardId: string) => [...queryKeys.boards.detail(boardId), 'columns'] as const,
    groups: (boardId: string) => [...queryKeys.boards.detail(boardId), 'groups'] as const,
  },
} as const
```

#### 4.2 Query Factory Functions
```typescript
// lib/react-query/queries.ts
import { queryOptions, infiniteQueryOptions } from '@tanstack/react-query'
import { companiesService } from '@/services/companies.service'
import { queryKeys } from './keys'

export const companyQueries = {
  list: (filters: Record<string, unknown> = {}) =>
    queryOptions({
      queryKey: queryKeys.companies.list(filters),
      queryFn: () => companiesService.getAll(filters),
      staleTime: 5 * 60 * 1000, // 5 minutes
    }),

  detail: (id: string) =>
    queryOptions({
      queryKey: queryKeys.companies.detail(id),
      queryFn: () => companiesService.getById(id),
      enabled: !!id,
    }),

  locations: (companyId: string) =>
    queryOptions({
      queryKey: queryKeys.companies.locations(companyId),
      queryFn: () => companiesService.locations.getByCompanyId(companyId),
      enabled: !!companyId,
    }),

  infinite: (filters: Record<string, unknown> = {}) =>
    infiniteQueryOptions({
      queryKey: [...queryKeys.companies.list(filters), 'infinite'],
      queryFn: ({ pageParam = 1 }) =>
        companiesService.getPaginated({ ...filters, page: pageParam }),
      getNextPageParam: (lastPage) =>
        lastPage.hasMore ? lastPage.page + 1 : undefined,
      initialPageParam: 1,
    }),
}
```

#### 4.3 Mutation Factories
```typescript
// lib/react-query/mutations.ts
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { companiesService } from '@/services/companies.service'
import { queryKeys } from './keys'

export function useCreateCompany() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: companiesService.create,
    onSuccess: (newCompany) => {
      // Add to list cache
      queryClient.setQueryData(
        queryKeys.companies.lists(),
        (old: Company[] = []) => [...old, newCompany]
      )

      // Set detail cache
      queryClient.setQueryData(
        queryKeys.companies.detail(newCompany.id),
        newCompany
      )
    },
  })
}

export function useUpdateCompany() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Company> }) =>
      companiesService.update(id, data),
    onMutate: async ({ id, data }) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.companies.detail(id) })

      const previous = queryClient.getQueryData(queryKeys.companies.detail(id))

      queryClient.setQueryData(
        queryKeys.companies.detail(id),
        (old: Company) => ({ ...old, ...data })
      )

      return { previous }
    },
    onError: (err, { id }, context) => {
      if (context?.previous) {
        queryClient.setQueryData(queryKeys.companies.detail(id), context.previous)
      }
    },
    onSettled: (_, __, { id }) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.companies.detail(id) })
      queryClient.invalidateQueries({ queryKey: queryKeys.companies.lists() })
    },
  })
}
```

### 5. Connection Pooling

#### 5.1 Server-Side Client
```typescript
// lib/supabase/server.ts
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import type { Database } from '@/types/database'

export function createServerSupabase() {
  const cookieStore = cookies()

  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value
        },
        set(name: string, value: string, options) {
          cookieStore.set({ name, value, ...options })
        },
        remove(name: string, options) {
          cookieStore.set({ name, value: '', ...options })
        },
      },
    }
  )
}

// Service role client for admin operations
export function createServiceClient() {
  return createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_KEY!,
    {
      auth: { persistSession: false },
    }
  )
}
```

### 6. Database Functions

#### 6.1 Geospatial Functions
```sql
-- Find companies within radius
CREATE OR REPLACE FUNCTION nearby_companies(
  p_lat DECIMAL,
  p_lng DECIMAL,
  p_radius_km DECIMAL
)
RETURNS TABLE (
  id UUID,
  name VARCHAR,
  address TEXT,
  lat DECIMAL,
  lng DECIMAL,
  distance_km DECIMAL
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    c.id,
    c.name,
    cl.address,
    cl.lat,
    cl.lng,
    ST_Distance(
      cl.location::geography,
      ST_SetSRID(ST_MakePoint(p_lng, p_lat), 4326)::geography
    ) / 1000 as distance_km
  FROM companies c
  JOIN company_locations cl ON cl.company_id = c.id AND cl.is_primary = true
  WHERE ST_DWithin(
    cl.location::geography,
    ST_SetSRID(ST_MakePoint(p_lng, p_lat), 4326)::geography,
    p_radius_km * 1000
  )
  ORDER BY distance_km;
END;
$$ LANGUAGE plpgsql;
```

#### 6.2 Statistics Functions
```sql
-- Get inspector workload statistics
CREATE OR REPLACE FUNCTION inspector_workload_stats(
  p_inspector_id UUID,
  p_start_date DATE DEFAULT CURRENT_DATE - INTERVAL '30 days',
  p_end_date DATE DEFAULT CURRENT_DATE
)
RETURNS TABLE (
  total_routes INTEGER,
  completed_routes INTEGER,
  total_stops INTEGER,
  completed_stops INTEGER,
  total_distance_km DECIMAL,
  avg_stops_per_route DECIMAL
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    COUNT(DISTINCT r.id)::INTEGER as total_routes,
    COUNT(DISTINCT CASE WHEN r.status = 'completed' THEN r.id END)::INTEGER as completed_routes,
    COUNT(rs.id)::INTEGER as total_stops,
    COUNT(CASE WHEN rs.status = 'completed' THEN 1 END)::INTEGER as completed_stops,
    COALESCE(SUM(r.total_distance_km), 0)::DECIMAL as total_distance_km,
    CASE
      WHEN COUNT(DISTINCT r.id) > 0
      THEN (COUNT(rs.id)::DECIMAL / COUNT(DISTINCT r.id))
      ELSE 0
    END as avg_stops_per_route
  FROM routes r
  LEFT JOIN route_stops rs ON rs.route_id = r.id
  WHERE r.inspector_id = p_inspector_id
    AND r.date BETWEEN p_start_date AND p_end_date;
END;
$$ LANGUAGE plpgsql;
```

### 7. Migration Management

#### 7.1 Migration Naming Convention
```
Format: YYYYMMDD_HHmmss_descriptive_name.sql

Examples:
- 20250124_120000_add_company_locations.sql
- 20250124_130000_create_dashboard_stats_view.sql
- 20250124_140000_add_performance_indexes.sql
```

#### 7.2 Migration Template
```sql
-- Migration: descriptive_name
-- Created: YYYY-MM-DD
-- Description: Brief description of changes
-- Rollback: DROP TABLE/FUNCTION/INDEX if_exists name;

-- Up Migration
-- ============

-- Your migration SQL here

-- Rollback (commented, for reference)
-- ==================================
-- DROP TABLE IF EXISTS new_table;
-- DROP INDEX IF EXISTS idx_new_index;
```

## New Folder Structure

```
apps/web/src/
├── lib/
│   ├── supabase/
│   │   ├── client.ts          # Browser client
│   │   ├── server.ts          # Server components client
│   │   └── service.ts         # Service role client
│   └── react-query/
│       ├── keys.ts            # Standardized query keys
│       ├── queries.ts         # Query factory functions
│       ├── mutations.ts       # Mutation hooks
│       └── provider.tsx       # QueryClientProvider
├── types/
│   ├── database.ts            # Auto-generated from Supabase
│   └── database.utils.ts      # Type utilities
supabase/
├── migrations/
│   ├── archived/              # Old migrations (for reference)
│   └── YYYYMMDD_*.sql         # Current migrations
├── functions/
│   ├── nearby_companies.sql
│   └── inspector_workload_stats.sql
└── docs/
    └── schema.sql             # Consolidated schema reference
```

## Implementation Priority

### Phase 1: Type Safety
1. Generate types from Supabase
2. Create type utilities
3. Remove `as any` assertions

### Phase 2: Query Layer
1. Standardize query keys
2. Create query/mutation factories
3. Implement optimistic updates

### Phase 3: Performance
1. Add composite indexes
2. Create materialized views
3. Add database functions

### Phase 4: Maintenance
1. Archive old migrations
2. Document schema
3. Create migration guidelines

## Success Metrics

| Metric | Target |
|--------|--------|
| Type assertions (as any) | 0 |
| Query key consistency | 100% |
| Index coverage for common queries | 100% |
| Average query time | <50ms |
| Migration documentation | 100% |

## Dependencies
- @supabase/supabase-js
- @supabase/ssr
- @tanstack/react-query

## Risks & Mitigations

| Risk | Mitigation |
|------|------------|
| Type generation breaking changes | Lock Supabase CLI version |
| Index impact on writes | Analyze write patterns first |
| Migration consolidation issues | Keep archived migrations |
