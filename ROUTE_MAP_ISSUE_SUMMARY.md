# Route Builder Map Issue - Summary & Solution

## ✅ What's Working
- Companies load in sidebar ✅
- Selection works (companies highlight when clicked) ✅
- Optimization works (route is calculated) ✅
- Route list shows in right sidebar ✅
- Database has valid coordinates for test companies ✅

## ❌ What's Not Working
- **NO MARKERS appear on the map** ❌
- Map component receives empty arrays even though companies are selected
- Debug logs not appearing (build cache issue)

## 🔍 Root Cause
The RouteMap component is not receiving the `selectedCompanies` data from the parent page, even though we pass it correctly:

```tsx
<RouteMap
  companies={selectedCompanies}  // ← This is correct
  route={displayedRoute}
  ...
/>
```

But the map logs show:
```
companies: []  // ← Always empty!
companiesCount: 0
```

## 🛠️ Quick Fix Solution

Replace the entire route builder page with a simpler version that definitely works.

### Option 1: Simple Map Test (5 min)
Create a test page that ONLY shows a map with hardcoded markers to verify Leaflet works.

### Option 2: Use Route Builder V2 (if it exists)
Check if `apps/web/app/routes/builder-v2` has a working implementation.

### Option 3: Debug React DevTools (recommended)
1. Install React DevTools browser extension
2. Go to route builder page
3. Find the `RouteBuilderPage` component
4. Check the `selectedCompanies` state
5. Check what props RouteMap actually receives

## 📝 Files Modified (for reference)
1. `/apps/web/src/components/map/RouteMap.tsx` - Added debug logging, default props
2. `/apps/web/app/routes/builder/page.tsx` - Added debug logging, state tracking
3. `/supabase/migrations/005_pdp_compliance_phases.sql` - Fixed column name
4. SQL: Updated 5 test companies with spread-out Tbilisi coordinates

## 🎯 Next Steps

### Immediate (to get map working):
1. Clear ALL browser data (not just cache)
   - Chrome: Settings → Privacy → Clear browsing data → Cached images and files
2. Check if React is properly hydrating
3. Use React DevTools to inspect actual props

### Alternative Approach:
Create a minimal test page:

```tsx
// app/test-map/page.tsx
'use client';
import dynamic from 'next/dynamic';

const Map = dynamic(() => import('@/components/map/RouteMap'), { ssr: false });

const testCompanies = [
  { id: '1', name: 'Test 1', address: 'Rustaveli', lat: 41.6934, lng: 44.8015 },
  { id: '2', name: 'Test 2', address: 'Vake', lat: 41.705, lng: 44.77 }
];

export default function TestMapPage() {
  console.log('🧪 Test Page - Passing companies:', testCompanies);
  
  return (
    <div className="h-screen">
      <Map companies={testCompanies} route={[]} />
    </div>
  );
}
```

Navigate to `/test-map` - if markers appear, the map works and it's a data flow issue in the main page.

## 💡 Likely Issue
**React Fast Refresh / Hot Module Replacement (HMR)** is not updating the code properly. The old compiled code is cached somewhere that even deleting `.next` doesn't clear.

### Nuclear option:
```bash
# Stop all dev servers
# Delete everything:
rm -rf apps/web/.next
rm -rf apps/web/node_modules/.cache
rm -rf node_modules/.cache

# Restart
npm run dev
```

## 📊 Test Company Coordinates (confirmed valid)
```
Company 1: Rustaveli Avenue   (41.6934, 44.8015)
Company 2: Saburtalo District (41.72, 44.755)
Company 3: Vake Park          (41.705, 44.77)
Company 4: Gldani District    (41.77, 44.81)
Company 5: Isani Metro        (41.69, 44.84)
```

All have unique coordinates spread across Tbilisi - perfect for testing!

## 🔧 Debugging Commands

```javascript
// In browser console on /routes/builder:

// 1. Check if map exists
document.querySelector('.leaflet-container')

// 2. Check React state (with React DevTools)
$r.state // or $r.props

// 3. Force re-render
// Click a company multiple times

// 4. Check what's actually being passed
// Look at Network tab for any failed requests
```

---

**Status**: Map rendering issue - data flow problem between parent and child component.
**Priority**: Medium (routing functionality works, just visual feedback missing)
**Estimated fix time**: 30-60 minutes with proper debugging tools
