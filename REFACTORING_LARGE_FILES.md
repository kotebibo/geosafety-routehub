# 🔧 FOCUSED REFACTORING PLAN - Large Files

## 📊 FILES THAT NEED REFACTORING

### **Critical (300+ lines):**
```
1. app/routes/builder/page.tsx                    353 lines  ❌ TOO BIG
2. app/admin/assignments/page.tsx                 344 lines  ❌ TOO BIG  
3. app/admin/service-types/page.tsx               336 lines  ❌ TOO BIG
4. src/components/ServiceBasedCompanySelector.tsx 323 lines  ❌ TOO BIG
5. src/components/InspectorBasedCompanySelector.tsx 318 lines ❌ TOO BIG
```

### **Should Refactor (250-300 lines):**
```
6. app/routes/builder-v2/page.tsx                 282 lines  ⚠️ LARGE
7. src/components/CompanyServicesManager.tsx      281 lines  ⚠️ LARGE
8. app/companies/page.tsx                         276 lines  ⚠️ LARGE
9. app/inspectors/page.tsx                        265 lines  ⚠️ LARGE
10. app/routes/manage/page.tsx                    261 lines  ⚠️ LARGE
```

### **Goal:** Break files into < 200 lines each

---

## 🎯 REFACTORING STRATEGY

### **Rule of Thumb:**
- **Pages**: 100-150 lines max (just orchestration)
- **Components**: 150-200 lines max (single responsibility)
- **Hooks**: 50-100 lines max
- **Services**: 100-150 lines max

---

## 📋 REFACTORING PLAN - BY FILE

### **1. app/admin/assignments/page.tsx** (344 lines) → 3 files

**Current Structure:**
- Fetching data
- Statistics calculation
- Company list table
- Inspector stats sidebar
- Bulk assignment logic
- All in one massive file!

**Refactor To:**
```typescript
// File 1: app/admin/assignments/page.tsx (100 lines)
// Main orchestration only
import { AssignmentStatCards } from '@/components/assignments/AssignmentStatCards'
import { CompanyAssignmentTable } from '@/components/assignments/CompanyAssignmentTable'
import { InspectorWorkloadPanel } from '@/components/assignments/InspectorWorkloadPanel'
import { useCompanyAssignments } from '@/hooks/useCompanyAssignments'

export default function AssignmentsPage() {
  const {
    assignments,
    inspectors,
    serviceTypes,
    stats,
    loading,
    handleBulkAssign,
  } = useCompanyAssignments()

  if (loading) return <LoadingSpinner />

  return (
    <PageLayout>
      <PageHeader title="კომპანიების დანიშვნა" />
      <AssignmentStatCards stats={stats} />
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <CompanyAssignmentTable
          assignments={assignments}
          serviceTypes={serviceTypes}
          onBulkAssign={handleBulkAssign}
        />
        <InspectorWorkloadPanel inspectors={inspectors} />
      </div>
    </PageLayout>
  )
}
```

```typescript
// File 2: hooks/useCompanyAssignments.ts (80 lines)
// All data fetching and state management
export function useCompanyAssignments() {
  const [assignments, setAssignments] = useState([])
  const [inspectors, setInspectors] = useState([])
  // ... all logic here
  
  return { assignments, inspectors, stats, handleBulkAssign }
}
```

```typescript
// File 3: components/assignments/CompanyAssignmentTable.tsx (150 lines)
// Just the table UI
export function CompanyAssignmentTable({ assignments, onBulkAssign }) {
  // Table rendering logic
}
```

```typescript
// File 4: components/assignments/AssignmentStatCards.tsx (40 lines)
export function AssignmentStatCards({ stats }) {
  return (
    <div className="grid grid-cols-4 gap-4">
      <StatCard label="სულ" value={stats.total} />
      {/* ... */}
    </div>
  )
}
```

```typescript
// File 5: components/assignments/InspectorWorkloadPanel.tsx (60 lines)
export function InspectorWorkloadPanel({ inspectors }) {
  return (
    <div className="sticky top-4">
      {/* Inspector stats */}
    </div>
  )
}
```

**Result:** 344 lines → 5 files (100 + 80 + 150 + 40 + 60)

---

### **2. app/routes/builder-v2/page.tsx** (282 lines) → 4 files

**Refactor To:**
```typescript
// File 1: app/routes/builder-v2/page.tsx (80 lines)
import { RouteBuilderLayout } from '@/components/routes/RouteBuilderLayout'
import { useRouteBuilder } from '@/hooks/useRouteBuilder'

export default function RouteBuilderPage() {
  const {
    selectedInspector,
    selectedCompanies,
    optimizedRoute,
    handleOptimize,
    handleSave,
  } = useRouteBuilder()

  return (
    <RouteBuilderLayout
      selectedInspector={selectedInspector}
      selectedCompanies={selectedCompanies}
      optimizedRoute={optimizedRoute}
      onOptimize={handleOptimize}
      onSave={handleSave}
    />
  )
}
```

```typescript
// File 2: hooks/useRouteBuilder.ts (100 lines)
// All state management and business logic
export function useRouteBuilder() {
  const [selectedInspector, setSelectedInspector] = useState(null)
  const [selectedCompanies, setSelectedCompanies] = useState([])
  // All logic here
  
  return { selectedInspector, selectedCompanies, handleOptimize, handleSave }
}
```

```typescript
// File 3: components/routes/RouteBuilderLayout.tsx (50 lines)
// Layout structure
export function RouteBuilderLayout({ children, sidebar, map }) {
  return (
    <div className="flex">
      <div className="w-80">{sidebar}</div>
      <div className="flex-1">{map}</div>
      <div className="w-96">{children}</div>
    </div>
  )
}
```

```typescript
// File 4: components/routes/RouteOptimizationPanel.tsx (80 lines)
// Right sidebar with route details
export function RouteOptimizationPanel({ route, onOptimize, onSave }) {
  return (
    <div className="p-4">
      {/* Route stats and buttons */}
    </div>
  )
}
```

**Result:** 282 lines → 4 files (80 + 100 + 50 + 80)

---

### **3. InspectorBasedCompanySelector.tsx** (318 lines) → 3 files

**Refactor To:**
```typescript
// File 1: components/companies/InspectorSelector.tsx (60 lines)
export function InspectorSelector({ selected, onChange, inspectors }) {
  return (
    <select value={selected} onChange={onChange}>
      {inspectors.map(i => <option key={i.id}>{i.name}</option>)}
    </select>
  )
}
```

```typescript
// File 2: components/companies/CompanyList.tsx (120 lines)
export function CompanyList({ companies, selected, onToggle }) {
  return (
    <div className="divide-y">
      {companies.map(company => (
        <CompanyListItem
          key={company.id}
          company={company}
          selected={selected.has(company.id)}
          onToggle={() => onToggle(company.id)}
        />
      ))}
    </div>
  )
}
```

```typescript
// File 3: components/companies/CompanyListItem.tsx (80 lines)
export function CompanyListItem({ company, selected, onToggle }) {
  return (
    <div className={`p-4 ${selected ? 'bg-blue-50' : ''}`}>
      <input type="checkbox" checked={selected} onChange={onToggle} />
      <div>{company.name}</div>
      <div className="text-sm text-gray-600">{company.address}</div>
    </div>
  )
}
```

**Result:** 318 lines → 3 files (60 + 120 + 80 + 60 in parent)

---

## 🚀 STEP-BY-STEP REFACTORING PROCESS

### **Phase 1: Create Foundation** (1 hour)

#### **Step 1: Create folder structure** (5 min)
```bash
cd D:\geosafety-routehub\apps\web\src

# Create new directories
mkdir components\assignments
mkdir components\routes
mkdir components\companies
mkdir components\inspectors
mkdir components\ui
mkdir hooks
mkdir services
mkdir lib\utils
```

#### **Step 2: Create shared Supabase client** (10 min)
```typescript
// src/lib/supabase/client.ts
import { createClient } from '@supabase/supabase-js'

export const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)
```

#### **Step 3: Create common UI components** (30 min)
```typescript
// src/components/ui/LoadingSpinner.tsx
// src/components/ui/EmptyState.tsx
// src/components/ui/StatCard.tsx
// src/components/ui/PageHeader.tsx
```

#### **Step 4: Create service layer** (15 min)
```typescript
// src/services/assignments.service.ts
export const assignmentsService = {
  bulkAssign: async (ids, inspectorId) => { /* */ },
  getByServiceType: async (serviceTypeId) => { /* */ },
}
```

---

### **Phase 2: Refactor Assignments Page** (2 hours)

#### **File 1: Create hook** (30 min)
```typescript
// src/hooks/useCompanyAssignments.ts
export function useCompanyAssignments(serviceTypeId?: string) {
  // Move ALL state and logic here
  const [assignments, setAssignments] = useState([])
  const [loading, setLoading] = useState(true)
  
  const fetchData = async () => {
    const data = await assignmentsService.getByServiceType(serviceTypeId)
    setAssignments(data)
    setLoading(false)
  }
  
  const bulkAssign = async (ids, inspectorId) => {
    await assignmentsService.bulkAssign(ids, inspectorId)
    await fetchData() // Refresh
  }
  
  return { assignments, loading, bulkAssign }
}
```

#### **File 2: Extract table component** (45 min)
```typescript
// src/components/assignments/CompanyAssignmentTable.tsx
interface Props {
  assignments: CompanyService[]
  serviceTypes: ServiceType[]
  onBulkAssign: (ids: string[], inspectorId: string) => Promise<void>
}

export function CompanyAssignmentTable({ assignments, serviceTypes, onBulkAssign }: Props) {
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [filter, setFilter] = useState<string>('all')
  
  return (
    <div className="bg-white rounded-lg border">
      <AssignmentTableHeader
        serviceTypes={serviceTypes}
        filter={filter}
        onFilterChange={setFilter}
        selectedCount={selected.size}
        onBulkAssign={(inspectorId) => {
          onBulkAssign(Array.from(selected), inspectorId)
          setSelected(new Set())
        }}
      />
      <AssignmentTableBody
        assignments={assignments}
        selected={selected}
        onToggle={(id) => {
          const newSelected = new Set(selected)
          if (newSelected.has(id)) {
            newSelected.delete(id)
          } else {
            newSelected.add(id)
          }
          setSelected(newSelected)
        }}
      />
    </div>
  )
}
```

#### **File 3: Extract stat cards** (15 min)
```typescript
// src/components/assignments/AssignmentStatCards.tsx
export function AssignmentStatCards({ stats }: { stats: AssignmentStats }) {
  return (
    <div className="grid grid-cols-4 gap-4 mb-6">
      <StatCard 
        label="სულ კომპანიები" 
        value={stats.total} 
        icon={<Building2 />} 
        color="blue" 
      />
      <StatCard 
        label="დანიშნული" 
        value={stats.assigned} 
        icon={<Check />} 
        color="green" 
      />
      <StatCard 
        label="არადანიშნული" 
        value={stats.unassigned} 
        icon={<X />} 
        color="amber" 
      />
      <StatCard 
        label="ინსპექტორები" 
        value={stats.inspectors} 
        icon={<Users />} 
        color="blue" 
      />
    </div>
  )
}
```

#### **File 4: Simplify main page** (30 min)
```typescript
// app/admin/assignments/page.tsx (NOW ONLY 100 LINES!)
'use client'

import { PageHeader } from '@/components/ui/PageHeader'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { AssignmentStatCards } from '@/components/assignments/AssignmentStatCards'
import { CompanyAssignmentTable } from '@/components/assignments/CompanyAssignmentTable'
import { InspectorWorkloadPanel } from '@/components/assignments/InspectorWorkloadPanel'
import { useCompanyAssignments } from '@/hooks/useCompanyAssignments'

export default function AssignmentsPage() {
  const {
    assignments,
    inspectors,
    serviceTypes,
    stats,
    loading,
    bulkAssign,
  } = useCompanyAssignments()

  if (loading) return <LoadingSpinner />

  return (
    <div className="min-h-screen bg-gray-50">
      <PageHeader 
        title="კომპანიების დანიშვნა"
        description="მიანიჭეთ კომპანიები ინსპექტორებს"
      />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <AssignmentStatCards stats={stats} />

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <CompanyAssignmentTable
              assignments={assignments}
              serviceTypes={serviceTypes}
              onBulkAssign={bulkAssign}
            />
          </div>

          <div className="lg:col-span-1">
            <InspectorWorkloadPanel inspectors={inspectors} />
          </div>
        </div>
      </div>
    </div>
  )
}
```

**Before:** 344 lines in 1 file  
**After:** ~100 lines across 5 files  
**Result:** ✅ Much easier to maintain!

---

### **Phase 3: Refactor Route Builder** (1.5 hours)

Follow same pattern:
1. Create `useRouteBuilder` hook
2. Extract `RouteBuilderSidebar` component
3. Extract `RouteOptimizationPanel` component
4. Simplify main page to < 100 lines

---

### **Phase 4: Refactor Other Large Files** (2 hours)

Apply same strategy to:
- `app/companies/page.tsx`
- `app/inspectors/page.tsx`
- `app/routes/manage/page.tsx`

---

## ⏱️ TOTAL TIME ESTIMATE

```
Phase 1: Foundation           1 hour
Phase 2: Assignments          2 hours
Phase 3: Route Builder        1.5 hours
Phase 4: Other pages          2 hours
Testing & fixes               1 hour
═══════════════════════════════════
TOTAL:                        7.5 hours
```

**Realistic timeline:** 2-3 days of focused work

---

## ✅ BENEFITS

### **Before Refactoring:**
- ❌ Files with 300+ lines
- ❌ Hard to understand
- ❌ Hard to test
- ❌ Difficult to maintain
- ❌ Lots of duplication

### **After Refactoring:**
- ✅ Files < 150 lines
- ✅ Clear separation of concerns
- ✅ Easy to test
- ✅ Reusable components
- ✅ DRY (Don't Repeat Yourself)

---

## 🎯 START NOW - QUICK WINS (30 MIN)

### **Win 1: Create Shared Client** (10 min)
```bash
# Create directory
mkdir -p src/lib/supabase

# Create file
# Copy shared Supabase client code
```

### **Win 2: Extract LoadingSpinner** (10 min)
```bash
mkdir -p src/components/ui
# Create LoadingSpinner component
# Replace all loading states
```

### **Win 3: Extract StatCard** (10 min)
```bash
# Create StatCard component
# Use in assignments page
```

**Impact:** Immediate code improvement in 30 minutes!

---

## 💡 REFACTORING RULES

1. **One file, one responsibility**
2. **Pages should only orchestrate** (no business logic)
3. **Business logic goes in hooks**
4. **Data fetching goes in services**
5. **UI components should be dumb** (just props in, JSX out)
6. **Keep files under 200 lines**
7. **Extract when you see duplication**

---

## 🚀 RECOMMENDED APPROACH

### **Option 1: All at Once** (1 day)
- Dedicate a full day
- Refactor everything
- Big improvement fast

### **Option 2: One File Per Day** (1 week) ⭐ RECOMMENDED
- Day 1: Foundation + Assignments
- Day 2: Route Builder
- Day 3: Companies page
- Day 4: Inspectors page
- Day 5: Testing & cleanup

### **Option 3: As You Go**
- Refactor each file when you touch it
- Slower but less disruptive

---

**Ready to start?** I recommend Option 2 - let's refactor the Assignments page first! 🎯
