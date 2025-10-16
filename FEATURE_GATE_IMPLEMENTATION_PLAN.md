# 🎯 FEATURE GATE IMPLEMENTATION PLAN

## 📋 Complete List of Files to Update

### **PRIORITY 1: Service-Related Components (MUST UPDATE)**

These directly show/manage service types:

**High Priority:**
1. ✅ `src/components/CompanyServicesManager.tsx` - Service management
2. ✅ `src/components/ServiceBasedCompanySelector.tsx` - Service selector
3. ✅ `src/components/ServiceAwareSaveModal.tsx` - Service in modal
4. ✅ `app/admin/service-types/page.tsx` - Service types admin page
5. ✅ `src/components/filters/FilterBar.tsx` - Service filters

**Medium Priority:**
6. ✅ `src/components/companies/CompanyTable.tsx` - Service column
7. ✅ `src/components/routes/RoutesTable.tsx` - Service in routes
8. ✅ `src/components/routes/RouteBuilderSidebar.tsx` - Service selection
9. ✅ `src/components/routes/RouteOptimizationPanel.tsx` - Service display
10. ✅ `src/components/assignments/CompanyAssignmentTable.tsx` - Service info
11. ✅ `app/companies/page.tsx` - Company list with service
12. ✅ `app/companies/new/page.tsx` - Create company with service
13. ✅ `app/routes/builder-v2/page.tsx` - Route builder with service
14. ✅ `app/admin/assignments/page.tsx` - Assignments with service

### **PRIORITY 2: Navigation & Layout (IMPORTANT)**

15. ✅ `src/components/Navigation.tsx` - Hide service-types link
16. ✅ `app/page.tsx` - Dashboard service stats
17. ✅ `app/layout.tsx` - App title/branding

### **PRIORITY 3: API Routes (BACKEND)**

18. ✅ `app/api/service-types/route.ts` - Service types API
19. ✅ `app/api/company-services/route.ts` - Company services API

### **LOW PRIORITY: May Not Need Changes**

- `app/auth/login/page.tsx` - No service logic
- `app/inspectors/*` - No direct service dependency
- `app/inspector/routes/page.tsx` - Inspector view (show assigned routes)
- Most components in `src/components/ui/*` - Generic UI

---

## 🎯 IMPLEMENTATION STRATEGY

### **Phase 1: Core Components (2-3 hours)**
Start with the most impactful components that users see immediately:
1. Navigation (hide service-types link)
2. Company list (hide service column)
3. Route builder (auto-select service)
4. Dashboard (single-service view)

### **Phase 2: Forms & Modals (1-2 hours)**
Update data entry points:
5. Company forms (hide service selector)
6. Route creation modals
7. Service-aware components

### **Phase 3: Tables & Lists (1 hour)**
Update data display:
8. Company table
9. Routes table
10. Assignment table

### **Phase 4: Admin Pages (1 hour)**
Hide admin features for other services:
11. Service types page (hide or show only active)
12. Assignments page

### **Phase 5: API Layer (30 min)**
Optional - filter data at API level:
13. Service types API
14. Company services API

---

## 📝 UPDATE CHECKLIST

### **For Each Component, Check:**

- [ ] Does it show service selector/dropdown?
- [ ] Does it display service type/name?
- [ ] Does it have service-based filtering?
- [ ] Does it show service statistics?
- [ ] Does it have service columns in tables?
- [ ] Does it navigate to service-related pages?

### **If YES to any, apply:**

```typescript
import { FeatureGate } from '@/components/FeatureGate'
import { DEPLOYMENT_CONFIG, getEnabledServices } from '@/config/features'

// Wrap service UI
<FeatureGate feature="ENABLE_SERVICE_SELECTOR">
  {/* Service-related UI */}
</FeatureGate>

// Or use conditional
{DEPLOYMENT_CONFIG.showServiceInCompanyList && (
  <td>{serviceType}</td>
)}
```

---

## 🚀 QUICK START

I'll update the files in this order:

**Batch 1: Most Visible (Do First)**
1. Navigation.tsx
2. companies/page.tsx  
3. routes/builder-v2/page.tsx
4. page.tsx (dashboard)

**Batch 2: Forms**
5. companies/new/page.tsx
6. ServiceAwareSaveModal.tsx
7. CompanyServicesManager.tsx

**Batch 3: Tables**
8. CompanyTable.tsx
9. RoutesTable.tsx
10. CompanyAssignmentTable.tsx

**Batch 4: Admin**
11. admin/service-types/page.tsx
12. admin/assignments/page.tsx

**Batch 5: Components**
13. All remaining service-aware components

---

## 🎯 Let's Start!

I'll begin updating files now, starting with the most critical ones.

**Ready to proceed?** I'll update them systematically, testing as we go!
