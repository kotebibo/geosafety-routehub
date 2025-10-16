spector(inspectorId)
      : routesService.getAll(),
  })

  const createRouteMutation = useMutation({
    mutationFn: routesService.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['routes'] })
    },
  })

  const deleteRouteMutation = useMutation({
    mutationFn: routesService.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['routes'] })
    },
  })

  return {
    routes: routes || [],
    loading: isLoading,
    error,
    createRoute: createRouteMutation.mutate,
    deleteRoute: deleteRouteMutation.mutate,
  }
}
```

---

#### **3.3 Code Splitting** (1 hour)

**Dynamic imports for heavy components:**

```typescript
// Before:
import RouteMap from '@/components/map/RouteMap'

// After:
import dynamic from 'next/dynamic'

const RouteMap = dynamic(() => import('@/components/map/RouteMap'), {
  ssr: false,
  loading: () => <LoadingSpinner message="რუკის ჩატვირთვა..." />
})
```

---

## 📊 REFACTORING TIMELINE

```
Week 1: Critical Refactoring (8 hours)
├── Day 1: Shared Supabase client (30 min)
├── Day 2: Service layer (2 hours)
├── Day 3: Reusable components (2 hours)
├── Day 4: TypeScript improvements (2 hours)
└── Day 5: Error handling (1.5 hours)

Week 2: Organization (6 hours)
├── Day 1-2: Feature-based structure (2 hours)
├── Day 3: Custom hooks (2 hours)
├── Day 4: Config & utils (2 hours)

Week 3: Performance (4 hours)
├── Day 1: React.memo (1 hour)
├── Day 2: React Query (2 hours)
└── Day 3: Code splitting (1 hour)

═══════════════════════════════════
TOTAL: 18 hours over 3 weeks
```

---

## 🗂️ FINAL PROJECT STRUCTURE

```
apps/web/
├── src/
│   ├── components/
│   │   ├── ui/              # Reusable UI
│   │   ├── layout/          # Layout components
│   │   ├── auth/            # Auth components
│   │   ├── routes/          # Route feature
│   │   ├── companies/       # Company feature
│   │   ├── inspectors/      # Inspector feature
│   │   └── assignments/     # Assignment feature
│   │
│   ├── hooks/
│   │   ├── useAuth.ts
│   │   ├── useRoutes.ts
│   │   ├── useInspectors.ts
│   │   └── useCompanyAssignments.ts
│   │
│   ├── services/
│   │   ├── auth.service.ts
│   │   ├── routes.service.ts
│   │   ├── inspectors.service.ts
│   │   ├── companies.service.ts
│   │   └── assignments.service.ts
│   │
│   ├── lib/
│   │   ├── supabase/
│   │   │   └── client.ts
│   │   ├── react-query/
│   │   │   └── client.ts
│   │   ├── errors.ts
│   │   └── utils/
│   │       ├── date.ts
│   │       ├── format.ts
│   │       └── validation.ts
│   │
│   ├── types/
│   │   ├── database.types.ts
│   │   ├── models.ts
│   │   └── api.types.ts
│   │
│   ├── config/
│   │   └── constants.ts
│   │
│   └── contexts/
│       └── AuthContext.tsx
│
├── app/
│   ├── (auth)/
│   │   └── login/
│   ├── (dashboard)/
│   │   ├── page.tsx
│   │   ├── companies/
│   │   ├── inspectors/
│   │   └── admin/
│   └── routes/
│
└── public/
```

---

## ✅ REFACTORING CHECKLIST

### **Phase 1: Setup (30 min)**
- [ ] Create `/docs/archive/` directory
- [ ] Move old MD files to archive
- [ ] Update README.md
- [ ] Create folder structure

### **Phase 2: Shared Client (30 min)**
- [ ] Create `lib/supabase/client.ts`
- [ ] Update all files to use shared client
- [ ] Test - warning should be gone

### **Phase 3: Services (2 hours)**
- [ ] Create `services/auth.service.ts`
- [ ] Create `services/routes.service.ts`
- [ ] Create `services/inspectors.service.ts`
- [ ] Create `services/assignments.service.ts`
- [ ] Update components to use services

### **Phase 4: Types (2 hours)**
- [ ] Generate database types from Supabase
- [ ] Create `types/models.ts`
- [ ] Create `types/api.types.ts`
- [ ] Remove all `any` types
- [ ] Add type annotations

### **Phase 5: Components (2 hours)**
- [ ] Create LoadingSpinner component
- [ ] Create EmptyState component
- [ ] Create StatCard component
- [ ] Create PageHeader component
- [ ] Update pages to use new components

### **Phase 6: Hooks (2 hours)**
- [ ] Create useRoutes hook
- [ ] Create useInspectors hook
- [ ] Create useCompanyAssignments hook
- [ ] Update pages to use hooks

### **Phase 7: Error Handling (1.5 hours)**
- [ ] Create error classes
- [ ] Create useErrorToast hook
- [ ] Replace all alerts with toasts
- [ ] Add try-catch blocks

### **Phase 8: Utils (1 hour)**
- [ ] Create date utilities
- [ ] Create format utilities
- [ ] Create validation utilities
- [ ] Create constants config

### **Phase 9: Performance (2 hours)**
- [ ] Add React.memo to expensive components
- [ ] Install React Query
- [ ] Update hooks to use React Query
- [ ] Add dynamic imports

### **Phase 10: Testing (1 hour)**
- [ ] Test all pages
- [ ] Test all features
- [ ] Fix any issues
- [ ] Document changes

---

## 🎯 QUICK START REFACTORING

### **Option 1: Do Everything** (18 hours over 3 weeks)
Complete all phases systematically

### **Option 2: Critical Only** (5 hours)
- Shared Supabase client
- Service layer
- Basic TypeScript improvements
- Error handling

### **Option 3: Staged Approach** (Recommended)
**This week:** Phases 1-4 (Critical foundation)
**Next week:** Phases 5-7 (Organization & UX)
**Week 3:** Phases 8-10 (Polish & Performance)

---

## 💡 BENEFITS AFTER REFACTORING

### **Code Quality:**
✅ No warnings in console
✅ Type-safe everywhere
✅ Consistent patterns
✅ Easy to understand

### **Maintainability:**
✅ Services make testing easy
✅ Components are reusable
✅ Clear file organization
✅ Well-documented types

### **Performance:**
✅ React Query caching
✅ Memoized components
✅ Code splitting
✅ Optimized re-renders

### **Developer Experience:**
✅ IntelliSense works perfectly
✅ Easy to find things
✅ Clear error messages
✅ Fast development

---

## 📞 NEXT STEPS

1. **Clean up MD files first** (15 min)
   - Creates clean slate
   - Easy wins

2. **Start with shared client** (30 min)
   - Removes annoying warning
   - Foundation for everything else

3. **Choose your path:**
   - All in (18 hours)
   - Critical only (5 hours)
   - Staged (recommended)

---

## 🎯 IMPLEMENTATION SCRIPT

Run this PowerShell to clean up MD files:

```powershell
# Create archive directory
New-Item -ItemType Directory -Path "D:\geosafety-routehub\docs\archive" -Force

# List of files to archive (42 files)
$filesToArchive = @(
    "APPLY_MIGRATION_INSTRUCTIONS.md",
    "ASSIGNMENTS_COMPLETE.md",
    "AUTH_COMPLETE.md",
    "AUTH_SETUP_GUIDE.md",
    "BUILD_PROGRESS.md",
    "CLAUDE_PROJECT_BRIEF.md",
    "COMPLETED_DATA_IMPORT.md",
    "COPY_PASTE_FOR_CLAUDE.md",
    "COPY_PASTE_SQL.md",
    "CRITICAL_FIX_COMPLETE.md",
    "CURRENT_STATUS.md",
    "DATA_IMPORT_GUIDE.md",
    "FINAL_SUMMARY.md",
    "FUTURE_GOOGLE_GEOCODING.md",
    "HOW_TO_CREATE_CLAUDE_PROJECT.md",
    "MAP_MARKERS_COMPLETE.md",
    "MISSION_ACCOMPLISHED.md",
    "NEXT_STEP.md",
    "OSRM_INTEGRATION.md",
    "PHASE1_COMPLETE.md",
    "PHASE1_SUCCESS.md",
    "PHASE2_COMPLETE.md",
    "PHASE2_FINAL.md",
    "PHASE2_PROGRESS.md",
    "PHASE3_COMPLETE.md",
    "PHASE4_COMPLETE.md",
    "PHASE4_PROGRESS.md",
    "PHASE4_SUMMARY.md",
    "PROJECT_STATUS.md",
    "QUICK_AUTH_SETUP.md",
    "QUICK_REFERENCE.md",
    "README_DATA_IMPORT.md",
    "README_START_HERE.md",
    "RE_GEOCODE_INSTRUCTIONS.md",
    "SAVE_ROUTES_COMPLETE.md",
    "SESSION_COMPLETE.md",
    "SESSION_COMPLETE_SUMMARY.md",
    "SESSION_SUMMARY_PHASES_3_4.md",
    "SESSION_UPDATE.md",
    "SETUP_CHECKLIST.md",
    "SETUP_TEST_INSPECTORS.md",
    "START_HERE_NOW.md",
    "SUMMARY.md",
    "TASK_LIST_COMPLETE.md",
    "TASK_ORDER_REMAINING.md",
    "THIS_SESSION_SUMMARY.md",
    "VISUAL_SUMMARY.md",
    "WHAT_TO_DO_NEXT.md",
    "WHERE_WE_ARE.md"
)

# Move files to archive
foreach ($file in $filesToArchive) {
    $source = "D:\geosafety-routehub\$file"
    $dest = "D:\geosafety-routehub\docs\archive\$file"
    if (Test-Path $source) {
        Move-Item -Path $source -Destination $dest -Force
        Write-Host "Moved: $file"
    }
}

Write-Host "`nDone! 42 files moved to docs/archive/"
Write-Host "Remaining essential docs: 8 files"
```

---

**Ready to refactor?** Choose your path and let's start! 🚀
