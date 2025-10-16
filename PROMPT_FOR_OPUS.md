# 🔴 CRITICAL BUG: Route Builder Map Not Showing Markers

## Problem Summary
The route builder page (`/routes/builder`) has a map that **receives empty arrays** for companies even though:
- ✅ Companies load in the sidebar
- ✅ Clicking companies highlights them (selection works)
- ✅ The selection counter works
- ✅ Optimization works (shows ordered list in right sidebar)
- ✅ The SAME RouteMap component works perfectly on `/test-map` with hardcoded data

## Evidence

### Test Page (WORKS ✅)
```
URL: /test-map
Console: 🗺️ RouteMap Update: {companiesCount: 3, companies: [3 items], ...}
Result: 3 GREEN MARKERS visible on map
```

### Route Builder Page (BROKEN ❌)
```
URL: /routes/builder
Console: 🗺️ RouteMap Update: {companiesCount: 0, companies: [], ...}
Result: NO MARKERS - map shows empty array even after selecting companies
User Action: Clicks company in sidebar → Company highlights → Counter updates → NO MARKERS APPEAR
```

## Code Structure

### File: `apps/web/app/routes/builder/page.tsx`
```tsx
export default function RouteBuilderPage() {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [selectedCompanies, setSelectedCompanies] = useState<Company[]>([]);
  const [optimizedRoute, setOptimizedRoute] = useState<RouteStop[]>([]);
  
  // Fetches companies on mount
  async function fetchCompanies() {
    const { data } = await supabase
      .from('companies')
      .select('id, name, address, lat, lng, type, priority')
      .eq('status', 'active')
      .order('name');
    if (data) setCompanies(data);
  }
  
  // Toggles company selection
  function toggleCompany(company: Company) {
    const exists = selectedCompanies.find(c => c.id === company.id);
    if (exists) {
      setSelectedCompanies(selectedCompanies.filter(c => c.id !== company.id));
    } else {
      setSelectedCompanies([...selectedCompanies, company]);  // ← State updates
    }
  }
  
  const displayedRoute = optimizedRoute.length > 0 
    ? optimizedRoute 
    : selectedCompanies.map((c, i) => ({ company: c, position: i + 1 }));
  
  return (
    <div>
      {/* Left Sidebar - shows companies */}
      <div onClick={() => toggleCompany(company)}>
        {/* Company cards */}
      </div>
      
      {/* Map */}
      <RouteMap
        key={`map-${selectedCompanies.length}`}  // Added to force re-render
        companies={selectedCompanies}             // ← Passing state
        route={displayedRoute}
        hoveredStop={hoveredStop}
        onMarkerClick={toggleCompany}
      />
      
      {/* Right Sidebar - shows selectedCompanies.length */}
      <div>{selectedCompanies.length} selected</div>
    </div>
  );
}
```

### File: `apps/web/src/components/map/RouteMap.tsx`
```tsx
export default function RouteMap({ 
  companies = [],  // Default to empty array
  route = [],
  routeGeometry,
  hoveredStop, 
  onMarkerClick 
}: RouteMapProps) {
  
  useEffect(() => {
    console.log('🗺️ RouteMap Update:', {
      companiesCount: companies?.length || 0,
      companies: companies,  // ← ALWAYS EMPTY []
    });
    
    // Clear markers
    markersRef.current.forEach(marker => marker.remove());
    
    // Add markers for companies
    if (validCompanies.length > 0) {
      console.log(`📍 Adding ${validCompanies.length} markers`);
      validCompanies.forEach((company) => {
        // Create marker and add to map
        const marker = L.marker([company.lat, company.lng], { icon }).addTo(map);
        markersRef.current.set(`selected-${company.id}`, marker);
      });
    }
  }, [companies, route, routeGeometry, hoveredStop]);
  
  return <div id="map" className="w-full h-full" />;
}
```

### RouteMap Import
```tsx
const RouteMap = dynamic(() => import('@/components/map/RouteMap'), {
  ssr: false,
  loading: () => <div>Loading map...</div>
});
```

## What We've Tried (ALL FAILED)

1. ❌ Added default props to RouteMap
2. ❌ Added array validation
3. ❌ Added `key` prop to force re-render
4. ❌ Added debug logging (confirmed companies array is ALWAYS empty in RouteMap)
5. ❌ Cleared `.next` cache multiple times
6. ❌ Restarted dev server 10+ times
7. ❌ Hard refreshed browser (Ctrl+Shift+R)
8. ❌ Changed ports (3000, 3001, 3002, 3005)
9. ❌ Tried different browsers

## Confirmed Facts

### ✅ Working
- Test page with hardcoded data → Markers appear
- Companies fetch from database → Visible in sidebar
- Company selection → Highlights in UI, counter updates
- Route optimization → Ordered list shows in right sidebar
- Map component itself → Works perfectly (proven by test page)
- Company coordinates → Valid (41.69-41.77 lat, 44.75-44.84 lng)

### ❌ Not Working
- `selectedCompanies` state → NOT reaching RouteMap component
- Props → RouteMap receives `companies: []` even when parent has `selectedCompanies: [...]`
- Debug logs from parent (`📊 State Update`) → NOT appearing (code not loading?)
- Map markers → Never appear on route builder page

## Key Mystery

**WHY does the test page work but route builder doesn't?**

### Test Page (Working):
```tsx
const testCompanies = [hardcoded array];
<RouteMap companies={testCompanies} />  // ✅ Markers appear
```

### Route Builder (Broken):
```tsx
const [selectedCompanies, setSelectedCompanies] = useState<Company[]>([]);
<RouteMap companies={selectedCompanies} />  // ❌ Receives []
```

## Debugging Notes

- Added `console.log` in toggleCompany → **NOT appearing in console**
- Added `console.log` in fetchCompanies → **NOT appearing in console** 
- Added `useEffect` to log state → **NOT appearing in console**
- This suggests **code changes aren't loading** despite clearing cache

But then why does the test page (new file) work immediately?

## Request for Claude Opus

Please investigate and provide:

1. **Root cause analysis**: Why is selectedCompanies not reaching RouteMap?

2. **Potential causes**:
   - Is there a React hydration issue?
   - Is dynamic import blocking prop updates?
   - Is there a closure/stale state issue?
   - Is Next.js caching compiled code somewhere we haven't checked?
   - Is there a build configuration issue?

3. **Solution**: Working code that fixes this issue

4. **Verification steps**: How to confirm it's fixed

## Environment
- Next.js 14.1.0
- React 18
- Leaflet for maps
- Windows dev environment
- Multiple dev server restarts
- Cache cleared multiple times

## Files to Review
- `apps/web/app/routes/builder/page.tsx` (route builder page)
- `apps/web/src/components/map/RouteMap.tsx` (map component)
- `apps/web/app/test-map/page.tsx` (working test page for comparison)

---

**The core issue**: Props are not flowing from parent to dynamically imported child component, but the same child component works with static props. Need to understand why and fix it.
