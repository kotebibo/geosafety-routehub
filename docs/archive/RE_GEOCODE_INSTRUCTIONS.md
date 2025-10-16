# 🗺️ RE-GEOCODING COMPANIES

## ❌ PROBLEM FOUND:

**202 out of 216 companies have duplicate coordinates!**

Most companies are at the same location: `41.715100, 44.827100` (138 companies!)

This means:
- Routes will be inaccurate
- Map markers overlap
- Optimization doesn't work properly
- Distances are wrong

---

## ✅ SOLUTION: Re-Geocode with Nominatim

I've created a script that:
1. Uses **Nominatim (OpenStreetMap)** - same as your prototype
2. Extracts street names from Georgian addresses
3. Geocodes each company individually
4. Updates coordinates in database
5. Respects Nominatim rate limit (1 request/second)

---

## 🚀 HOW TO RUN

### **Option 1: Run the Script** (Recommended)

```bash
cd D:\geosafety-routehub
npm run re-geocode
```

**Time**: ~4 minutes (216 companies × 1 second each)

---

### **Option 2: Manual via API**

I can also create an API endpoint you can trigger from the browser.

---

## 📋 WHAT THE SCRIPT DOES

```
1. Fetches all 216 companies
2. For each company:
   - Extracts street name from address
   - Queries Nominatim: "street, Tbilisi/Batumi, Georgia"
   - Validates coordinates are in correct city bounds
   - Updates database with new coordinates
   - Waits 1 second (rate limit)
3. Shows progress every 10 companies
4. Final summary with success/fail counts
```

---

## 🎯 EXPECTED RESULTS

**Before**:
- 202 companies at duplicate coordinates
- 3 coordinate pairs for 216 companies
- Map is useless

**After**:
- ~180-200 companies with unique coordinates
- ~10-20 failed (bad addresses)
- Map shows real locations
- Routes work properly!

---

## 📊 EXAMPLE OUTPUT

```
================================================================================
RE-GEOCODING COMPANIES WITH NOMINATIM
================================================================================

Total companies: 216
Starting geocoding...

✅ ნოდარ ბოხუას ქ. → 41.723456, 44.812345
✅ ჭავჭავაძის გამზირი → 41.715678, 44.801234
⏭️  Skipping შპს... (no valid address)
❌ No valid result for: გახოკიძის ქ.

📊 Progress: 10/216 | Success: 8 | Failed: 1 | Skipped: 1

...

================================================================================
GEOCODING COMPLETE
================================================================================
✅ Success: 185 (85.6%)
❌ Failed: 19 (8.8%)
⏭️  Skipped: 12 (5.6%)
================================================================================
```

---

## ⚙️ SCRIPT FEATURES

### **Smart Street Extraction**:
```typescript
"ნოდარ ბოხუას ქ. N21, თბილისი" 
→ "ნოდარ ბოხუას ქ."

"ჭავჭავაძის გამზირი 37 მ, თბილისი"
→ "ჭავჭავაძის გამზირი"
```

### **City Detection**:
- თბილისი → Tbilisi bounds (41.6-41.8, 44.7-44.9)
- ბათუმი → Batumi bounds (41.6-41.7, 41.6-41.7)

### **Rate Limiting**:
- 1 request per second (Nominatim requirement)
- Automatic delays between requests

### **Error Handling**:
- Skips companies with no address
- Skips email addresses
- Validates coordinate bounds
- Continues on failures

---

## 🔒 SAFE TO RUN

- ✅ Only updates `lat` and `lng` columns
- ✅ Doesn't modify names or addresses
- ✅ Uses service key for write access
- ✅ Validates all coordinates before updating
- ✅ Can be stopped anytime (Ctrl+C)

---

## 📝 FILES

**Script**: `scripts/re-geocode.ts`  
**Run command**: `npm run re-geocode`

---

## ⏱️ TIME ESTIMATE

- **216 companies** × 1 second = ~4 minutes
- **Plus time for**:
  - Database queries: ~10 seconds
  - Updates: ~20 seconds
  
**Total**: ~5 minutes

---

## 🎯 AFTER RE-GEOCODING

### **What to Do**:
1. ✅ Refresh route builder page
2. ✅ Companies will be at correct locations
3. ✅ Routes will be accurate
4. ✅ Map markers won't overlap

### **Check Results**:
Visit: http://localhost:3000/api/debug/coordinates

Should show:
- `duplicateCoordinates`: 0-5 (way less!)
- `companiesWithDuplicates`: 0-10

---

## 🚀 READY TO RUN?

Just run:
```bash
npm run re-geocode
```

And watch it fix all your coordinates! 🗺️✨

---

**Note**: Nominatim is FREE and doesn't require an API key. It's the same service your courier-routing-system prototype uses!
