# ✅ REFACTORING CHECKLIST - Start Here

## 📊 CURRENT SITUATION

**Large Files Found:**
- ❌ 5 files over 300 lines (TOO BIG)
- ⚠️ 5 files between 250-300 lines (LARGE)
- **Goal:** All files under 200 lines

---

## 🎯 RECOMMENDED: One File Per Day Approach

### **Day 1: Foundation + Shared Client** (2 hours)
- [ ] Create `src/lib/supabase/client.ts`
- [ ] Create `src/components/ui/LoadingSpinner.tsx`
- [ ] Create `src/components/ui/StatCard.tsx`
- [ ] Create `src/components/ui/PageHeader.tsx`
- [ ] Update 2-3 files to use shared client

### **Day 2: Refactor Assignments Page** (2 hours)
- [ ] Create `src/hooks/useCompanyAssignments.ts`
- [ ] Create `src/services/assignments.service.ts`
- [ ] Create `src/components/assignments/AssignmentStatCards.tsx`
- [ ] Create `src/components/assignments/CompanyAssignmentTable.tsx`
- [ ] Create `src/components/assignments/InspectorWorkloadPanel.tsx`
- [ ] Simplify `app/admin/assignments/page.tsx` to < 150 lines
- [ ] Test thoroughly

### **Day 3: Refactor Route Builder** (2 hours)
- [ ] Create `src/hooks/useRouteBuilder.ts`
- [ ] Create `src/services/routes.service.ts`
- [ ] Create `src/components/routes/RouteBuilderSidebar.tsx`
- [ ] Create `src/components/routes/RouteOptimizationPanel.tsx`
- [ ] Simplify `app/routes/builder-v2/page.tsx` to < 150 lines
- [ ] Test thoroughly

### **Day 4: Refactor Companies & Inspectors** (2 hours)
- [ ] Create `src/hooks/useCompanies.ts`
- [ ] Create `src/hooks/useInspectors.ts`
- [ ] Extract table components
- [ ] Simplify both pages to < 150 lines
- [ ] Test thoroughly

### **Day 5: Final Cleanup** (1 hour)
- [ ] Remove all unused code
- [ ] Update all imports
- [ ] Run linter
- [ ] Full app test
- [ ] Document changes

---

## 🚀 QUICK START (30 MINUTES)

Want to see immediate results? Do these 3 quick wins:

### **Quick Win 1: Shared Supabase Client** (10 min)
**File:** `src/lib/supabase/client.ts`

```typescript
import { createClient } from '@supabase/supabase-js'

export const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)
```

**Then update these files:**
- `src/contexts/AuthContext.tsx` - Replace `const supabase = createClient(...)` with `import { supabase } from '@/lib/supabase/client'`
- `app/admin/assignments/page.tsx` - Same replacement

### **Quick Win 2: LoadingSpinner Component** (10 min)
**File:** `src/components/ui/LoadingSpinner.tsx`

```typescript
interface LoadingSpinnerProps {
  message?: string
  size?: 'sm' | 'md' | 'lg'
}

export function LoadingSpinner({ message = 'იტვირთება...', size = 'md' }: LoadingSpinnerProps) {
  const sizeClasses = {
    sm: 'text-2xl',
    md: 'text-4xl',
    lg: 'text-6xl',
  }

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <div className={`animate-spin ${sizeClasses[size]} mb-4`}>⚙️</div>
        <p className="text-gray-600">{message}</p>
      </div>
    </div>
  )
}
```

**Then replace all loading divs with:**
```typescript
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'

if (loading) return <LoadingSpinner />
```

### **Quick Win 3: StatCard Component** (10 min)
**File:** `src/components/ui/StatCard.tsx`

```typescript
import { LucideIcon } from 'lucide-react'

interface StatCardProps {
  label: string
  value: string | number
  icon: LucideIcon
  color?: 'blue' | 'green' | 'amber' | 'red'
}

export function StatCard({ label, value, icon: Icon, color = 'blue' }: StatCardProps) {
  const colorClasses = {
    blue: 'text-blue-600',
    green: 'text-green-600',
    amber: 'text-amber-600',
    red: 'text-red-600',
  }

  return (
    <div className="bg-white rounded-lg border p-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-gray-600">{label}</p>
          <p className={`text-2xl font-bold ${colorClasses[color]}`}>{value}</p>
        </div>
        <Icon className={`w-8 h-8 ${colorClasses[color]}`} />
      </div>
    </div>
  )
}
```

**Impact:** In 30 minutes, you'll have:
✅ No more Supabase warnings  
✅ Consistent loading states  
✅ Reusable stat cards  

---

## 📈 PROGRESS TRACKER

Track your refactoring progress:

```
Foundation:
[ ] Shared Supabase client created
[ ] LoadingSpinner component created
[ ] StatCard component created
[ ] PageHeader component created

Assignments Page (344 → ~130 lines):
[ ] useCompanyAssignments hook
[ ] assignments.service.ts
[ ] AssignmentStatCards component
[ ] CompanyAssignmentTable component
[ ] InspectorWorkloadPanel component
[ ] Page simplified

Route Builder (282 → ~120 lines):
[ ] useRouteBuilder hook
[ ] routes.service.ts
[ ] RouteBuilderSidebar component
[ ] RouteOptimizationPanel component
[ ] Page simplified

Other Pages:
[ ] Companies page refactored
[ ] Inspectors page refactored
[ ] Routes manage page refactored

Final:
[ ] All files under 200 lines
[ ] No warnings in console
[ ] All features tested
[ ] Code documented
```

---

## 💡 TIPS

1. **Start small** - Do quick wins first
2. **Test frequently** - After each refactoring
3. **One file at a time** - Don't try to do everything at once
4. **Keep it running** - Make sure app works after each change
5. **Commit often** - Git commit after each successful refactor

---

## 🎯 DECISION TIME

**Which approach do you want?**

**A) Quick Wins Only** (30 min today)
- Just do the 3 quick wins
- See immediate improvement
- Continue later

**B) Foundation Day** (2 hours today)
- Do quick wins + create all base components
- Sets up for easy refactoring later

**C) Full Assignments Refactor** (2 hours today)
- Foundation + completely refactor assignments page
- Big improvement in one session

**D) One Per Day** (1 week, 2hrs/day)
- Sustainable pace
- Steady progress
- Recommended! ⭐

---

**Ready to start?** Open `REFACTORING_LARGE_FILES.md` for detailed instructions!

Let me know which option you choose and I'll guide you through it! 🚀
