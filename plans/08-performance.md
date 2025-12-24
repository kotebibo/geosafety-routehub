# Performance Optimization Plan

## Overview
Optimize the application for fast load times, smooth interactions, and efficient resource usage across web and mobile platforms.

## Current State Analysis

### Strengths
- Next.js 14 with App Router
- Lazy-loaded Ably client (~300KB deferred)
- React Query for caching
- Turborepo for build optimization

### Pain Points
- Large bundle sizes (boards feature)
- No virtualization for large lists
- Missing image optimization
- Unoptimized database queries
- No performance monitoring

## Performance Metrics Targets

| Metric | Current | Target |
|--------|---------|--------|
| First Contentful Paint | Unknown | <1.5s |
| Largest Contentful Paint | Unknown | <2.5s |
| Time to Interactive | Unknown | <3s |
| Cumulative Layout Shift | Unknown | <0.1 |
| Bundle size (main) | ~500KB | <300KB |
| Board render (1000 rows) | Slow | <100ms |

## Improvement Areas

### 1. Bundle Optimization

#### 1.1 Analyze Bundle Size
```bash
# Add bundle analyzer
npm install @next/bundle-analyzer --save-dev

# next.config.js
const withBundleAnalyzer = require('@next/bundle-analyzer')({
  enabled: process.env.ANALYZE === 'true',
})

module.exports = withBundleAnalyzer({
  // ...existing config
})

# Run analysis
ANALYZE=true npm run build
```

#### 1.2 Code Splitting Strategy
```typescript
// Dynamic imports for heavy components
import dynamic from 'next/dynamic'

// Lazy load board table (heavy component)
const MondayBoardTable = dynamic(
  () => import('@/features/boards/components/BoardTable/MondayBoardTable'),
  {
    loading: () => <BoardTableSkeleton />,
    ssr: false, // Client-only for real-time
  }
)

// Lazy load charts
const BarChart = dynamic(
  () => import('recharts').then(mod => mod.BarChart),
  { ssr: false }
)

// Lazy load map components
const MapView = dynamic(
  () => import('@/components/Map/MapView'),
  {
    loading: () => <MapSkeleton />,
    ssr: false,
  }
)
```

#### 1.3 Tree Shaking Optimization
```typescript
// Bad: Import entire library
import { format, parse, addDays, subDays, isAfter, isBefore } from 'date-fns'

// Good: Import specific modules
import format from 'date-fns/format'
import addDays from 'date-fns/addDays'

// Bad: Import all icons
import * as Icons from 'lucide-react'

// Good: Import specific icons
import { ChevronDown, Search, Plus } from 'lucide-react'
```

#### 1.4 Package Optimization
```javascript
// next.config.js
module.exports = {
  experimental: {
    optimizePackageImports: [
      'lucide-react',
      'date-fns',
      '@tanstack/react-query',
      '@radix-ui/react-dropdown-menu',
    ],
  },
}
```

### 2. React Optimization

#### 2.1 Memoization Strategy
```typescript
// Memoize expensive components
const MemoizedCell = memo(CellRenderer, (prev, next) => {
  return (
    prev.value === next.value &&
    prev.column.id === next.column.id &&
    prev.isEditing === next.isEditing
  )
})

// Memoize row components
const MemoizedRow = memo(BoardRow, (prev, next) => {
  return (
    prev.item.updated_at === next.item.updated_at &&
    prev.isSelected === next.isSelected &&
    prev.columns === next.columns
  )
})

// Use useMemo for expensive calculations
function useProcessedItems(items: BoardItem[], filters: FilterConfig[]) {
  return useMemo(() => {
    if (!filters.length) return items

    return items.filter(item => {
      return filters.every(filter => matchesFilter(item, filter))
    })
  }, [items, filters])
}

// Use useCallback for handlers
const handleCellUpdate = useCallback((
  rowId: string,
  columnId: string,
  value: unknown
) => {
  updateCell({ rowId, columnId, value })
}, [updateCell])
```

#### 2.2 Virtualization for Large Lists
```typescript
// components/VirtualizedBoardTable.tsx
import { useVirtualizer } from '@tanstack/react-virtual'

function VirtualizedBoardTable({ items }: { items: BoardItem[] }) {
  const parentRef = useRef<HTMLDivElement>(null)

  const rowVirtualizer = useVirtualizer({
    count: items.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 40, // Row height
    overscan: 10, // Pre-render 10 rows above/below viewport
  })

  return (
    <div
      ref={parentRef}
      className="h-[600px] overflow-auto"
    >
      <div
        style={{
          height: `${rowVirtualizer.getTotalSize()}px`,
          position: 'relative',
        }}
      >
        {rowVirtualizer.getVirtualItems().map((virtualRow) => {
          const item = items[virtualRow.index]
          return (
            <MemoizedRow
              key={item.id}
              item={item}
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: `${virtualRow.size}px`,
                transform: `translateY(${virtualRow.start}px)`,
              }}
            />
          )
        })}
      </div>
    </div>
  )
}
```

#### 2.3 State Management Optimization
```typescript
// Split context to prevent unnecessary re-renders
const BoardDataContext = createContext<BoardData | null>(null)
const BoardActionsContext = createContext<BoardActions | null>(null)
const BoardSelectionContext = createContext<SelectionState | null>(null)

// Provider with split contexts
function BoardProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<BoardData>(initialData)
  const [selection, setSelection] = useState<SelectionState>(initialSelection)

  const actions = useMemo(() => ({
    updateCell: (rowId: string, columnId: string, value: unknown) => {
      setData(prev => updateItemInData(prev, rowId, columnId, value))
    },
    // ...more actions
  }), [])

  return (
    <BoardDataContext.Provider value={data}>
      <BoardActionsContext.Provider value={actions}>
        <BoardSelectionContext.Provider value={selection}>
          {children}
        </BoardSelectionContext.Provider>
      </BoardActionsContext.Provider>
    </BoardDataContext.Provider>
  )
}

// Use specific context in components
function CellRenderer() {
  // Only re-renders when actions change (rarely)
  const { updateCell } = useContext(BoardActionsContext)
  // ...
}
```

### 3. Network Optimization

#### 3.1 API Response Caching
```typescript
// next.config.js
module.exports = {
  async headers() {
    return [
      {
        source: '/api/service-types',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, s-maxage=3600, stale-while-revalidate=86400',
          },
        ],
      },
      {
        source: '/api/inspectors',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, s-maxage=60, stale-while-revalidate=120',
          },
        ],
      },
    ]
  },
}
```

#### 3.2 React Query Optimization
```typescript
// lib/react-query/provider.tsx
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      gcTime: 30 * 60 * 1000, // 30 minutes (was cacheTime)
      refetchOnWindowFocus: false,
      refetchOnReconnect: true,
      retry: (failureCount, error) => {
        if (error?.status === 404) return false
        return failureCount < 3
      },
    },
    mutations: {
      retry: 1,
    },
  },
})

// Prefetch on hover
function CompanyLink({ id }: { id: string }) {
  const queryClient = useQueryClient()

  const prefetchCompany = () => {
    queryClient.prefetchQuery({
      queryKey: ['company', id],
      queryFn: () => companiesService.getById(id),
      staleTime: 60 * 1000, // 1 minute
    })
  }

  return (
    <Link
      href={`/companies/${id}`}
      onMouseEnter={prefetchCompany}
    >
      View Company
    </Link>
  )
}
```

#### 3.3 Request Deduplication
```typescript
// lib/request-dedup.ts
const pendingRequests = new Map<string, Promise<unknown>>()

export async function dedupedFetch<T>(
  key: string,
  fetcher: () => Promise<T>
): Promise<T> {
  if (pendingRequests.has(key)) {
    return pendingRequests.get(key) as Promise<T>
  }

  const promise = fetcher().finally(() => {
    pendingRequests.delete(key)
  })

  pendingRequests.set(key, promise)
  return promise
}

// Usage in service
async function getCompany(id: string) {
  return dedupedFetch(`company:${id}`, () =>
    supabase.from('companies').select('*').eq('id', id).single()
  )
}
```

### 4. Image Optimization

#### 4.1 Next.js Image Component
```typescript
// Use Next.js Image for automatic optimization
import Image from 'next/image'

function UserAvatar({ src, name }: { src?: string; name: string }) {
  return src ? (
    <Image
      src={src}
      alt={name}
      width={40}
      height={40}
      className="rounded-full"
      loading="lazy"
      placeholder="blur"
      blurDataURL="/avatar-placeholder.svg"
    />
  ) : (
    <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center">
      {name[0].toUpperCase()}
    </div>
  )
}
```

#### 4.2 Image Upload Optimization
```typescript
// lib/image-utils.ts
export async function optimizeImage(file: File): Promise<Blob> {
  return new Promise((resolve) => {
    const img = new window.Image()
    img.onload = () => {
      const canvas = document.createElement('canvas')
      const ctx = canvas.getContext('2d')!

      // Max dimensions
      const maxWidth = 1920
      const maxHeight = 1080

      let { width, height } = img
      if (width > maxWidth || height > maxHeight) {
        const ratio = Math.min(maxWidth / width, maxHeight / height)
        width *= ratio
        height *= ratio
      }

      canvas.width = width
      canvas.height = height
      ctx.drawImage(img, 0, 0, width, height)

      canvas.toBlob(
        (blob) => resolve(blob!),
        'image/webp',
        0.85 // Quality
      )
    }
    img.src = URL.createObjectURL(file)
  })
}
```

### 5. Database Query Optimization

#### 5.1 Query Batching
```typescript
// services/batch-loader.ts
import DataLoader from 'dataloader'

const companyLoader = new DataLoader<string, Company>(async (ids) => {
  const { data } = await supabase
    .from('companies')
    .select('*')
    .in('id', ids)

  // Return in same order as input
  return ids.map(id => data?.find(c => c.id === id) || null)
})

// Usage
const company1 = await companyLoader.load('id1')
const company2 = await companyLoader.load('id2')
// Both fetched in single query
```

#### 5.2 Select Only Needed Fields
```typescript
// Bad: Select all fields
const { data } = await supabase.from('companies').select('*')

// Good: Select only needed fields
const { data } = await supabase
  .from('companies')
  .select('id, name, status, location_count')

// Good: Select with relations
const { data } = await supabase
  .from('board_items')
  .select(`
    id,
    name,
    data,
    group:board_groups(id, name, color)
  `)
```

#### 5.3 Pagination
```typescript
// hooks/usePaginatedCompanies.ts
function usePaginatedCompanies(pageSize = 20) {
  return useInfiniteQuery({
    queryKey: ['companies', 'paginated'],
    queryFn: async ({ pageParam = 0 }) => {
      const from = pageParam * pageSize
      const to = from + pageSize - 1

      const { data, count } = await supabase
        .from('companies')
        .select('*', { count: 'exact' })
        .order('name')
        .range(from, to)

      return {
        items: data,
        nextPage: to < (count ?? 0) - 1 ? pageParam + 1 : undefined,
      }
    },
    getNextPageParam: (lastPage) => lastPage.nextPage,
    initialPageParam: 0,
  })
}
```

### 6. Rendering Optimization

#### 6.1 Layout Shift Prevention
```typescript
// Reserve space for dynamic content
function BoardTableContainer() {
  return (
    <div className="min-h-[600px]">
      <Suspense fallback={<BoardTableSkeleton rows={15} />}>
        <MondayBoardTable />
      </Suspense>
    </div>
  )
}

// Skeleton with exact dimensions
function BoardTableSkeleton({ rows = 10 }: { rows?: number }) {
  return (
    <div className="w-full">
      <div className="h-12 bg-gray-100 animate-pulse rounded" />
      {Array.from({ length: rows }).map((_, i) => (
        <div
          key={i}
          className="h-10 bg-gray-50 animate-pulse mt-1 rounded"
        />
      ))}
    </div>
  )
}
```

#### 6.2 CSS Containment
```css
/* Isolate expensive layouts */
.board-table {
  contain: layout style;
}

.board-row {
  contain: layout;
}

.board-cell {
  contain: layout style;
}

/* Use content-visibility for large lists */
.board-group {
  content-visibility: auto;
  contain-intrinsic-size: 0 500px;
}
```

#### 6.3 Animation Performance
```css
/* Use transform instead of layout properties */
.slide-in {
  transform: translateX(-100%);
  transition: transform 300ms ease-out;
}

.slide-in.active {
  transform: translateX(0);
}

/* Use will-change sparingly */
.animated-element {
  will-change: transform;
}

/* Force GPU acceleration */
.gpu-accelerated {
  transform: translateZ(0);
  backface-visibility: hidden;
}
```

### 7. Monitoring & Profiling

#### 7.1 Web Vitals Tracking
```typescript
// lib/web-vitals.ts
import { onCLS, onFID, onFCP, onLCP, onTTFB } from 'web-vitals'

export function reportWebVitals() {
  onCLS(sendToAnalytics)
  onFID(sendToAnalytics)
  onFCP(sendToAnalytics)
  onLCP(sendToAnalytics)
  onTTFB(sendToAnalytics)
}

function sendToAnalytics(metric: Metric) {
  // Send to analytics service
  console.log(metric.name, metric.value)

  // Example: Send to custom endpoint
  fetch('/api/analytics/vitals', {
    method: 'POST',
    body: JSON.stringify({
      name: metric.name,
      value: metric.value,
      id: metric.id,
      path: window.location.pathname,
    }),
  })
}
```

#### 7.2 Performance Marks
```typescript
// hooks/usePerformanceMark.ts
export function usePerformanceMark(name: string) {
  useEffect(() => {
    performance.mark(`${name}-start`)

    return () => {
      performance.mark(`${name}-end`)
      performance.measure(name, `${name}-start`, `${name}-end`)

      const entries = performance.getEntriesByName(name)
      console.log(`${name}: ${entries[0]?.duration.toFixed(2)}ms`)
    }
  }, [name])
}

// Usage
function MondayBoardTable() {
  usePerformanceMark('board-table-render')
  // ...
}
```

#### 7.3 React Profiler Integration
```typescript
// components/PerformanceProfiler.tsx
import { Profiler, ProfilerOnRenderCallback } from 'react'

const onRender: ProfilerOnRenderCallback = (
  id,
  phase,
  actualDuration,
  baseDuration,
  startTime,
  commitTime
) => {
  // Log slow renders
  if (actualDuration > 16) { // > 1 frame
    console.warn(`Slow render: ${id} took ${actualDuration.toFixed(2)}ms`)
  }

  // Send to monitoring
  if (process.env.NODE_ENV === 'production') {
    sendToMonitoring({
      component: id,
      phase,
      duration: actualDuration,
      timestamp: startTime,
    })
  }
}

export function PerformanceProfiler({
  id,
  children,
}: {
  id: string
  children: ReactNode
}) {
  return (
    <Profiler id={id} onRender={onRender}>
      {children}
    </Profiler>
  )
}
```

## Implementation Priority

### Phase 1: Quick Wins
1. Add bundle analyzer
2. Implement dynamic imports for heavy components
3. Optimize package imports

### Phase 2: React Optimization
1. Add memoization to critical components
2. Implement virtualization for board tables
3. Split context to reduce re-renders

### Phase 3: Network
1. Add API response caching
2. Optimize React Query settings
3. Implement request deduplication

### Phase 4: Monitoring
1. Add Web Vitals tracking
2. Implement performance profiling
3. Set up alerts for regressions

## Success Metrics

| Metric | Current | Target |
|--------|---------|--------|
| LCP | Unknown | <2.5s |
| FID | Unknown | <100ms |
| CLS | Unknown | <0.1 |
| Main bundle | ~500KB | <300KB |
| Board render (1000 rows) | Slow | <100ms |

## Dependencies

### To Add
- @next/bundle-analyzer
- @tanstack/react-virtual
- web-vitals
- dataloader

### Optional
- react-window (alternative to react-virtual)
- sharp (image processing)

## Risks & Mitigations

| Risk | Mitigation |
|------|------------|
| Breaking changes from optimization | Comprehensive testing, gradual rollout |
| Over-optimization | Focus on measured bottlenecks only |
| Memory leaks from caching | Monitor memory usage, set cache limits |
