# 🎯 SINGLE SERVICE DEPLOYMENT GUIDE

## 📋 Overview

Your application is now configured to launch with **ONLY Personal Data Protection Service**, while keeping the codebase ready to enable other services in the future with minimal changes.

---

## 🔧 Current Configuration

### **Enabled for Launch:**
✅ Personal Data Protection Service  
✅ All core features (routes, inspectors, companies)  
✅ Route optimization  
✅ Analytics dashboard  

### **Hidden (Available for Future):**
🔒 Fire Safety Service  
🔒 Labor Safety Service  
🔒 Food Safety Service  
🔒 Environmental Service  
🔒 Service selector dropdown  
🔒 Multi-service filtering  

---

## 📂 How It Works

### **Feature Flags System:**

All feature flags are in: `src/config/features.ts`

```typescript
export const FEATURE_FLAGS = {
  // ENABLED for launch
  ENABLE_PERSONAL_DATA_PROTECTION: true,  ✅
  
  // DISABLED (future services)
  ENABLE_FIRE_SAFETY: false,              🔒
  ENABLE_LABOR_SAFETY: false,             🔒
  ENABLE_FOOD_SAFETY: false,              🔒
  ENABLE_ENVIRONMENTAL: false,            🔒
  
  // Multi-service features (disabled for now)
  ENABLE_SERVICE_SELECTOR: false,         🔒
  ENABLE_SERVICE_FILTERING: false,        🔒
}
```

---

## 🎨 Using Feature Gates in Code

### **Method 1: Component-Level (Recommended)**

```typescript
import { FeatureGate } from '@/components/FeatureGate'

// This will only show if the feature is enabled
<FeatureGate feature="ENABLE_SERVICE_SELECTOR">
  <ServiceDropdown />
</FeatureGate>

// This shows when feature is DISABLED
<FeatureGateInverse feature="ENABLE_SERVICE_SELECTOR">
  <p>Single service mode</p>
</FeatureGateInverse>
```

### **Method 2: Conditional Logic**

```typescript
import { isFeatureEnabled, isServiceEnabled } from '@/config/features'

// Check if feature is enabled
if (isFeatureEnabled('ENABLE_SERVICE_SELECTOR')) {
  // Show service selector
}

// Check if specific service is enabled
if (isServiceEnabled('fire_safety')) {
  // Show fire safety option
}
```

### **Method 3: Get Enabled Services**

```typescript
import { getEnabledServices, isMultiServiceMode } from '@/config/features'

// Get list of enabled services
const services = getEnabledServices()
// Returns: ['personal_data_protection']

// Check if multi-service mode
const isMulti = isMultiServiceMode()
// Returns: false (only 1 service enabled)
```

---

## 🔨 What You Need To Update

### **1. Hide Service Selector in UI**

Find these components and wrap them with `FeatureGate`:

```typescript
// In company list, route builder, etc.
<FeatureGate feature="ENABLE_SERVICE_SELECTOR">
  <Select>
    <SelectTrigger>
      <SelectValue placeholder="აირჩიეთ სერვისი" />
    </SelectTrigger>
    <SelectContent>
      {/* Service options */}
    </SelectContent>
  </Select>
</FeatureGate>
```

### **2. Update Navigation (if needed)**

```typescript
// In Navigation.tsx or menu
<FeatureGate feature="ENABLE_SERVICE_SELECTOR">
  <Link href="/services">სერვისები</Link>
</FeatureGate>
```

### **3. Update Page Titles**

```typescript
// In page headers
import { DEPLOYMENT_CONFIG } from '@/config/features'

<h1>{DEPLOYMENT_CONFIG.primaryServiceName}</h1>
// Shows: "პერსონალურ მონაცემთა დაცვა"
```

### **4. Filter Service Types in Dropdowns**

```typescript
import { getEnabledServices, getServiceName } from '@/config/features'

const enabledServices = getEnabledServices()

// In service type selector
{enabledServices.map(service => (
  <option key={service} value={service}>
    {getServiceName(service, 'ka')}
  </option>
))}
```

---

## 🚀 How to Enable Other Services in Future

### **When you're ready to add more services:**

**Step 1: Update Feature Flags**
```typescript
// In src/config/features.ts
export const FEATURE_FLAGS = {
  ENABLE_PERSONAL_DATA_PROTECTION: true,
  ENABLE_FIRE_SAFETY: true,           // ✅ Change to true
  ENABLE_LABOR_SAFETY: false,
  // ...
  
  ENABLE_SERVICE_SELECTOR: true,      // ✅ Enable selector
  ENABLE_SERVICE_FILTERING: true,     // ✅ Enable filtering
}
```

**Step 2: Update Deployment Config**
```typescript
export const DEPLOYMENT_CONFIG = {
  isSingleServiceMode: false,         // ✅ Change to false
  showServiceSelector: true,          // ✅ Show selector
  showServiceInCompanyList: true,     // ✅ Show service column
  // ...
}
```

**Step 3: Restart the app**
```bash
npm run dev
```

**That's it!** All the UI elements will automatically appear. No code changes needed!

---

## 📊 What This Hides in Single Service Mode

### **Hidden UI Elements:**
- ❌ Service type dropdown in company forms
- ❌ Service type column in company list
- ❌ Service filter in route builder
- ❌ Service badges in route cards
- ❌ Service-based analytics breakdown
- ❌ Multi-service route creation

### **Still Visible:**
- ✅ All company management
- ✅ All route management
- ✅ All inspector management
- ✅ Route optimization
- ✅ Analytics dashboard
- ✅ Inspector mobile app

---

## 🎯 Examples of Where to Apply

### **Companies Page:**

```typescript
// In companies/page.tsx or CompanyTable.tsx

// BEFORE (shows service selector)
<Select>
  <SelectTrigger>აირჩიეთ სერვისი</SelectTrigger>
  <SelectContent>
    <SelectItem value="personal_data">პერსონალურ მონაცემთა დაცვა</SelectItem>
    <SelectItem value="fire_safety">ხანძარუსაფრთხოება</SelectItem>
  </SelectContent>
</Select>

// AFTER (hides selector in single service mode)
<FeatureGate feature="ENABLE_SERVICE_SELECTOR">
  <Select>
    <SelectTrigger>აირჩიეთ სერვისი</SelectTrigger>
    <SelectContent>
      {getEnabledServices().map(service => (
        <SelectItem key={service} value={service}>
          {getServiceName(service, 'ka')}
        </SelectItem>
      ))}
    </SelectContent>
  </Select>
</FeatureGate>
```

### **Route Builder:**

```typescript
// In route-builder/page.tsx

import { DEPLOYMENT_CONFIG } from '@/config/features'

// Automatically use the primary service
const serviceType = DEPLOYMENT_CONFIG.isSingleServiceMode 
  ? DEPLOYMENT_CONFIG.primaryService 
  : selectedService
```

### **Dashboard:**

```typescript
// In dashboard analytics

<FeatureGate feature="ENABLE_SERVICE_SELECTOR">
  <div>
    <h3>სერვისების მიხედვით</h3>
    {/* Multi-service breakdown */}
  </div>
</FeatureGate>

<FeatureGateInverse feature="ENABLE_SERVICE_SELECTOR">
  <div>
    <h3>{DEPLOYMENT_CONFIG.primaryServiceName}</h3>
    {/* Single service stats */}
  </div>
</FeatureGateInverse>
```

---

## 🗄️ Database Considerations

### **Current Setup:**
- `service_types` table has all service types
- `company_services` table links companies to services
- `routes` table can have `service_type_id`

### **For Single Service Deployment:**

**Option 1: Keep all data, hide in UI (Recommended)**
- ✅ All service types remain in database
- ✅ Only show Personal Data Protection in UI
- ✅ Easy to enable others later
- ✅ No data migration needed

**Option 2: Clean database (Not recommended)**
- ❌ Remove other service types
- ❌ Requires migration when adding back
- ❌ More complex

**We recommend Option 1** - just hide in UI using feature flags.

---

## 📝 Checklist for Single Service Launch

### **Before Deployment:**

**Configuration:**
- [ ] Verify `ENABLE_PERSONAL_DATA_PROTECTION = true`
- [ ] Verify other services = `false`
- [ ] Verify `ENABLE_SERVICE_SELECTOR = false`
- [ ] Verify `isSingleServiceMode = true`

**UI Updates:**
- [ ] Wrap service selectors with `FeatureGate`
- [ ] Update page titles to show primary service
- [ ] Hide service columns in tables
- [ ] Remove service badges from cards
- [ ] Update navigation if needed

**Testing:**
- [ ] Test company creation (no service selector)
- [ ] Test route creation (automatically uses primary service)
- [ ] Test inspector assignment
- [ ] Verify no service options appear
- [ ] Check all pages render correctly

**Database:**
- [ ] Ensure Personal Data Protection service type exists
- [ ] Default companies to this service type
- [ ] Default routes to this service type

---

## 🔄 Future Migration Path

### **When adding second service:**

1. **Phase 1: Enable the service**
   ```typescript
   ENABLE_FIRE_SAFETY: true
   ```

2. **Phase 2: Enable multi-service UI**
   ```typescript
   ENABLE_SERVICE_SELECTOR: true
   isSingleServiceMode: false
   ```

3. **Phase 3: Test thoroughly**
   - Service selector appears
   - Can create companies for both services
   - Can filter by service
   - Analytics show both services

4. **Phase 4: Deploy**
   - No code changes needed
   - Just update feature flags
   - Restart application

---

## 💡 Benefits of This Approach

✅ **Clean Single Service Launch**
- No confusing multi-service UI
- Focused user experience
- Simpler onboarding

✅ **Easy Future Expansion**
- Change config file only
- No code refactoring needed
- Instant service enablement

✅ **Flexible Testing**
- Test multi-service mode locally
- Deploy single service to production
- Quick feature toggling

✅ **Maintainable Codebase**
- One codebase for all deployments
- Clear feature boundaries
- Easy to understand

---

## 🎯 Summary

**Current State:**
- 🎯 Single service mode (Personal Data Protection)
- 🎯 All multi-service code exists but hidden
- 🎯 Feature flags control visibility
- 🎯 Easy to enable more services later

**To Launch:**
1. Apply `FeatureGate` to service-related UI
2. Test thoroughly
3. Deploy!

**To Add Services Later:**
1. Change feature flags
2. Restart app
3. Done!

---

**Your application is now ready for single-service deployment while keeping all the flexibility for future expansion!** 🚀

Need help applying feature gates to specific components? Let me know!
